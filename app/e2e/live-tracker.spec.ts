import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

async function openGuidedWorkoutId(page: Page): Promise<string> {
  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');
  const intervalLink = page.locator('a[aria-label*="Intervali"]').first();
  await expect
    .poll(
      async () => {
        if ((await intervalLink.count()) > 0) return true;
        await page.getByRole('button', { name: 'Sledeći mesec' }).click();
        return false;
      },
      { timeout: 30_000, intervals: [1500] },
    )
    .toBe(true);
  const href = await intervalLink.getAttribute('href');
  return href?.split('/').pop() ?? '';
}

function mockWalkerGeolocation(page: Page) {
  return page.addInitScript(() => {
    const START_LAT = 45.2517;
    const START_LON = 19.8369;
    const STEP_M = 10;
    const STEP_MS = 3000;
    const METERS_PER_DEG_LAT = 111194.9266;
    let index = 0;
    let base = Date.now();
    const timers = new Map<number, number>();
    const next = () => {
      const position = {
        coords: {
          latitude: START_LAT + (index * STEP_M) / METERS_PER_DEG_LAT,
          longitude: START_LON,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: 0,
          speed: STEP_M / (STEP_MS / 1000),
        },
        timestamp: base + index * STEP_MS,
      };
      index += 1;
      return position;
    };
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: (success: (position: ReturnType<typeof next>) => void) => {
          if (index === 0) base = Date.now();
          const watchId = Math.floor(Math.random() * 1_000_000) + 1;
          timers.set(
            watchId,
            window.setInterval(() => success(next()), 40),
          );
          return watchId;
        },
        clearWatch: (watchId: number) => {
          const timer = timers.get(watchId);
          if (timer !== undefined) window.clearInterval(timer);
        },
        getCurrentPosition: (success: (position: ReturnType<typeof next>) => void) => success(next()),
      },
    });
  });
}

function mockDeniedGeolocation(page: Page) {
  return page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: (_success: unknown, error: (value: { code: number }) => void) => {
          window.setTimeout(() => error({ code: 1 }), 50);
          return 1;
        },
        clearWatch: () => {},
        getCurrentPosition: (_success: unknown, error: (value: { code: number }) => void) => {
          window.setTimeout(() => error({ code: 1 }), 50);
        },
      },
    });
  });
}

test('GPS livetracker: rast distance, progres i split', async ({ page }) => {
  await mockWalkerGeolocation(page);
  await register(page, uniqueEmail('tracker'));
  await completeOnboarding(page);
  const workoutId = await openGuidedWorkoutId(page);
  expect(workoutId).not.toBe('');

  await page.goto(`/run/${workoutId}?timeScale=30`);
  await page.getByTestId('guided-start').click();

  const distance = page.getByTestId('guided-distance');
  await expect(distance).toBeVisible({ timeout: 15_000 });
  const readKm = async () => {
    const text = (await distance.textContent()) ?? '';
    return Number(text.replace(',', '.').replace(/[^\d.]/g, ''));
  };
  await expect.poll(readKm, { timeout: 15_000 }).toBeGreaterThan(0.1);

  const progress = page.getByTestId('guided-progress');
  await expect(progress).toBeVisible();
  await expect
    .poll(async () => Number(await progress.getAttribute('aria-valuenow')), { timeout: 20_000 })
    .toBeGreaterThan(0.1);

  await expect(page.getByTestId('guided-split-1')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('guided-split-1')).toContainText('5:00');
});

test('GPS odbijen: ručni fallback i log iz plana', async ({ page }) => {
  await mockDeniedGeolocation(page);
  await register(page, uniqueEmail('tracker-denied'));
  await completeOnboarding(page);
  const workoutId = await openGuidedWorkoutId(page);
  expect(workoutId).not.toBe('');

  await page.goto(`/run/${workoutId}?timeScale=30`);
  await page.getByTestId('guided-start').click();

  await expect(page.getByTestId('guided-gps-fallback')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('guided-elapsed')).toBeVisible();

  await page.getByTestId('guided-finish').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Završi' }).click();
  await expect(page.getByRole('heading', { name: 'Trening završen' })).toBeVisible();
  await page.getByTestId('guided-log').click();
  await expect(page.getByLabel('Distanca (km)')).not.toHaveValue('');
});
