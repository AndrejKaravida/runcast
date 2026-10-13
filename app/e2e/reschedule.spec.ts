import { expect, test } from '@playwright/test';
import { completeOnboarding, lightRainFixture, rainFixture, register, uniqueEmail } from './helpers';

test('kiša: predlog pomeranja → primena → ostaje posle reload-a', async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: rainFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));

  const email = uniqueEmail('reschedule');
  await register(page, email);
  await completeOnboarding(page);

  const prompt = page.getByTestId('reschedule-prompt');
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText('Izgleda da te danas čeka kiša. Da pomerim trening?');
  await expect(prompt).toContainText('Ostavi kako je');

  const bestOption = page.getByTestId('reschedule-option-0');
  await expect(bestOption).toBeVisible();
  await expect(bestOption).toContainText(/% kiše, \d+°/);

  await bestOption.click();
  await expect(page.getByTestId('reschedule-applied')).toBeVisible();
  await expect(page.getByTestId('today-workout-title')).toHaveText(/^Lako trčanje/);

  await page.reload();
  await expect(page.getByTestId('today-workout-title')).toHaveText(/^Lako trčanje/);
  await expect(page.getByTestId('reschedule-prompt')).toBeHidden();
});

test('slaba kiša: nema predloga za pomeranje', async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: lightRainFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));

  const email = uniqueEmail('lightrain');
  await register(page, email);
  await completeOnboarding(page);

  await expect(page.getByTestId('reschedule-prompt')).toBeHidden();
  await expect(page.getByTestId('today-workout-title')).toHaveText(/^Dugi trk/);
});
