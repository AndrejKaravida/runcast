import { expect, test, type Page } from '@playwright/test';
import { assertNoHorizontalOverflow, completeOnboarding, register, uniqueEmail } from './helpers';

function hotFixture() {
  const times: string[] = [];
  const temperature: number[] = [];
  const apparent: number[] = [];
  const probability: number[] = [];
  const precipitation: number[] = [];
  const code: number[] = [];
  const wind: number[] = [];
  const gusts: number[] = [];
  const now = new Date();
  for (let day = 0; day < 140; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const stamp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, hour));
      times.push(stamp.toISOString().slice(0, 16));
      temperature.push(26);
      apparent.push(27);
      probability.push(5);
      precipitation.push(0);
      code.push(1);
      wind.push(8);
      gusts.push(15);
    }
  }
  return {
    hourly: {
      time: times,
      temperature_2m: temperature,
      apparent_temperature: apparent,
      precipitation_probability: probability,
      precipitation,
      weather_code: code,
      wind_speed_10m: wind,
      wind_gusts_10m: gusts,
    },
  };
}

async function mockWeather(page: Page) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: hotFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));
}

async function openLongWorkout(page: Page, monthsAhead: number): Promise<string> {
  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');
  for (let step = 0; step < monthsAhead; step += 1) {
    await page.getByRole('button', { name: 'Sledeći mesec' }).click();
  }
  const longLink = page.locator('a[aria-label*="Dugi trk"]').first();
  await expect(longLink).toBeVisible({ timeout: 15_000 });
  return (await longLink.getAttribute('href')) ?? '';
}

test('gorivo — kartica sa gel rasporedom na dugom trku', async ({ page }) => {
  await mockWeather(page);
  const email = uniqueEmail('fueling');
  await register(page, email);
  await completeOnboarding(page);

  const href = await openLongWorkout(page, 2);
  expect(href).toMatch(/\/workout\//);
  await page.goto(href);

  const card = page.getByTestId('fueling-card');
  await expect(card).toBeVisible();
  await expect(card.getByText('Gorivo', { exact: true })).toBeVisible();
  await expect(card.getByText(/Gel 1/)).toBeVisible();
  await expect(card.getByText(/700–800/)).toBeVisible();

  await page.setViewportSize({ width: 320, height: 568 });
  await assertNoHorizontalOverflow(page, 'fueling workout 320');
});

test('gorivo — podsetnik za gel u vođenom dugom trku', async ({ page }) => {
  const email = uniqueEmail('fueling-guided');
  await register(page, email);
  await completeOnboarding(page);

  const href = await openLongWorkout(page, 2);
  const workoutId = href.split('/').pop() ?? '';
  await page.goto(`/run/${workoutId}?timeScale=120`);
  await page.getByTestId('guided-start').click();

  const hint = page.getByTestId('guided-fueling');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText(/Sledeći gel/);
  await expect(hint).toContainText('Gel 1', { timeout: 35_000 });
});

test('gorivo — isključeni podsetnici sklanjaju liniju u vođenju', async ({ page }) => {
  const email = uniqueEmail('fueling-off');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/profile');
  await page.getByRole('button', { name: 'Isključeno' }).click();
  expect(await page.evaluate(() => localStorage.getItem('runcast.fueling'))).toBe('off');

  const href = await openLongWorkout(page, 2);
  const workoutId = href.split('/').pop() ?? '';
  await page.goto(`/run/${workoutId}?timeScale=120`);
  await page.getByTestId('guided-start').click();

  await expect(page.getByTestId('guided-cue')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('guided-fueling')).toHaveCount(0);
});
