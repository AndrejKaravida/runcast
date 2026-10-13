import { expect, test } from '@playwright/test';
import { completeOnboarding, register, sunnyFixture, uniqueEmail } from './helpers';

test('weather hero skeleton dok prognoza ne stigne', async ({ page }) => {
  await page.route('**/v1/forecast**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({ json: sunnyFixture() });
  });
  await page.route('**/air-quality**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } });
  });

  const email = uniqueEmail('weatherskeleton');
  await register(page, email);
  await completeOnboarding(page);

  await page.reload();
  await expect(page.getByTestId('weather-hero-skeleton')).toBeVisible();
  await expect(page.getByTestId('weather-hero')).toBeVisible();
});

test('today skeleton dok podaci ne stignu i nema grešaka u konzoli', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const email = uniqueEmail('todayskeleton');
  await register(page, email);
  await completeOnboarding(page);

  await page.route('**/rest/v1/workouts*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.route('**/rest/v1/run_logs*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });

  await page.reload();
  await expect(page.getByTestId('today-skeleton')).toBeVisible();
  await expect(page.getByTestId('today-workout-title')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
