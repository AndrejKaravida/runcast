import { expect, test } from '@playwright/test';
import { isoFromNow, register, uniqueEmail } from './helpers';

test('predikcija trke i lični rekordi', async ({ page }) => {
  const email = uniqueEmail('predictor');
  await register(page, email);

  await page.getByLabel('Naziv trke (opciono)').fill('F3 trka');
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(126));
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel(/Ciljno vreme/).fill('3:40:00');
  await page.getByLabel('Poslednja trka').selectOption('10');
  await page.getByLabel('Vreme (mm:ss)').fill('50:00');
  await expect(page.getByText(/VDOT 4/)).toBeVisible();
  await expect(page.getByText(/Cilj je ambiciozan/)).toBeVisible();
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByLabel('Dan dugog trčanja').selectOption('0');
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel('Grad', { exact: true }).fill('Novi Sad');
  await page.getByRole('button', { name: 'Traži' }).click();
  await page
    .getByRole('button', { name: /Novi Sad/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByRole('button', { name: 'Generiši plan' }).click();
  await page.waitForURL('**/today');

  await page.getByRole('button', { name: /Urađeno/ }).click();
  await expect(page.getByText('Zabeleži trening')).toBeVisible();
  await page.getByLabel('Distanca (km)').fill('5');
  await page.getByLabel(/Trajanje/).fill('25:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Zabeleži trening')).toBeHidden();

  await page.getByRole('link', { name: 'Statistika', exact: true }).click();
  await page.waitForURL('**/stats');
  await expect(page.getByTestId('predictor-card').getByText('Predikcija trke')).toBeVisible();
  await expect(page.getByTestId('predictor-card').getByText('Tvoja trka')).toBeVisible();
  await expect(page.getByTestId('personal-bests-card').getByText('Lični rekordi')).toBeVisible();
  await expect(page.getByTestId('personal-bests-card').getByText('5 km')).toBeVisible();
  await expect(page.getByTestId('personal-bests-card').getByText('25:00')).toBeVisible();
});
