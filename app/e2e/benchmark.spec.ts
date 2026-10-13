import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test('benchmark test trka i recalibracija tempa', async ({ page }) => {
  const email = uniqueEmail('benchmark');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('link', { name: 'Statistika', exact: true }).click();
  await page.waitForURL('**/stats');
  await page.getByRole('link', { name: 'Uradi test trku' }).click();
  await page.waitForURL('**/benchmark');

  await page.getByRole('button', { name: '5 km', exact: true }).click();
  await page.getByTestId('benchmark-start').click();
  await expect(page.getByTestId('benchmark-clock')).toBeVisible();
  await page.getByTestId('benchmark-finish').click();

  await page.getByLabel('Vreme (mm:ss)').fill('25:00');
  await page.getByLabel('Distanca (km)').fill('5');
  await page.getByTestId('benchmark-save').click();

  await expect(page.getByTestId('benchmark-suggestion').getByText(/VDOT 38/)).toBeVisible();
  await page.getByRole('button', { name: 'Prihvati nove tempe' }).click();
  await expect(page.getByText('Tempi ažurirani')).toBeVisible();

  await page.getByRole('button', { name: 'Nazad' }).click();
  await page.waitForURL('**/stats');
  await expect(page.getByTestId('predictor-card').getByText('Bazirano na rezultatu: 5 km 25:00.')).toBeVisible();
  await expect(page.getByTestId('personal-bests-card').getByText('25:00')).toBeVisible();
});
