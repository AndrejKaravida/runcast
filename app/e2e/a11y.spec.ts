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

test('prijava — Tab redom stiže do emaila, lozinke i dugmeta', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Lozinka')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeFocused();
});

test('registracija — greške polja su povezane i najavljene', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Napravi nalog' }).click();

  const email = page.getByLabel('Email');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  const describedBy = await email.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`[id="${describedBy}"]`)).toHaveAttribute('role', 'alert');

  const terms = page.getByTestId('accept-terms');
  await expect(terms).toHaveAttribute('aria-invalid', 'true');
  await expect(terms).toHaveAttribute('aria-describedby', 'accept-terms-error');
  await expect(page.locator('#accept-terms-error')).toHaveAttribute('role', 'alert');
});

test('modal za trening — Escape zatvara dijalog i vraća fokus', async ({ page }) => {
  await register(page, uniqueEmail('a11y-modal'));
  await completeOnboarding(page);

  const trigger = page.getByTestId('log-done');
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog).toHaveAttribute('aria-labelledby', /.+/);
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('vođeno trčanje — start tastaturom i progressbar sa aria-valuenow', async ({ page }) => {
  await mockWalkerGeolocation(page);
  await register(page, uniqueEmail('a11y-guided'));
  await completeOnboarding(page);

  const workoutId = await openGuidedWorkoutId(page);
  expect(workoutId).not.toBe('');
  await page.goto(`/run/${workoutId}?timeScale=30`);

  const start = page.getByTestId('guided-start');
  await start.focus();
  await page.keyboard.press('Enter');

  const progress = page.getByTestId('guided-progress');
  await expect(progress).toBeVisible({ timeout: 15_000 });
  await expect(progress).toHaveAttribute('role', 'progressbar');
  await expect(progress).toHaveAttribute('aria-valuenow', /[\d.]+/);
  await expect(progress).toHaveAttribute('aria-valuemax', /[\d.]+/);
});

test('danas — preskoči link i progressbar elementi', async ({ page }) => {
  await register(page, uniqueEmail('a11y-today'));
  await completeOnboarding(page);

  await expect(page.getByTestId('log-done')).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Preskoči na sadržaj' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await expect(page.getByRole('progressbar', { name: 'Napredak plana' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Tvoja nedelja' })).toBeVisible();
});

test('profil — polje korisničkog imena ima pristupačnu oznaku', async ({ page }) => {
  await register(page, uniqueEmail('a11y-profile'));
  await completeOnboarding(page);
  await page.goto('/settings/profile');
  await expect(page.getByLabel('Korisničko ime')).toBeVisible();
});

test('prijatelji — polje za dodavanje ima pristupačnu oznaku', async ({ page }) => {
  await register(page, uniqueEmail('a11y-friends'));
  await completeOnboarding(page);
  await page.goto('/friends');
  await expect(page.getByLabel('Ime profila')).toBeVisible();
});

test('rang lista — redovi su lista sa čitljivim tekstom', async ({ page }) => {
  const name = `A11Y Trkač ${Date.now()}`;
  await register(page, uniqueEmail('a11y-board'), name);
  await completeOnboarding(page);

  await page.goto('/settings/profile');
  await page.getByRole('button', { name: 'Javno', exact: true }).click();
  await page.getByRole('button', { name: 'Sačuvaj profil' }).click();
  await expect(page.getByText('Profil je sačuvan.')).toBeVisible();

  await page.goto('/leaderboard');
  const row = page.getByTestId('leaderboard-row').filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(name);
  await expect(page.getByRole('listitem').filter({ hasText: name })).toBeVisible();

  await page.goto('/settings/profile');
  await page.getByRole('button', { name: 'Privatno', exact: true }).click();
  await page.getByRole('button', { name: 'Sačuvaj profil' }).click();
  await expect(page.getByText('Profil je sačuvan.')).toBeVisible();
});
