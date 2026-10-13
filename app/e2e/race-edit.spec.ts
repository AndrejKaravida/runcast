import { expect, test } from '@playwright/test';
import { completeOnboarding, isoFromNow, register, uniqueEmail } from './helpers';

test('izmena trke: naziv i ciljno vreme, pa regeneracija posle promene datuma', async ({ page }) => {
  const email = uniqueEmail('race-edit');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: 'Uredi' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Izmena trke')).toBeVisible();
  await dialog.getByLabel('Naziv trke (opciono)').fill('Nova trka');
  await dialog.getByLabel(/Ciljno vreme/).fill('3:30:00');
  await dialog.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je izmenjena.')).toBeVisible();
  await expect(page.getByText('Nova trka').first()).toBeVisible();

  await page.goto('/today');
  await expect(page.getByTestId('race-chip')).toContainText('Nova trka');

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: 'Uredi' }).click();
  const dateDialog = page.getByRole('dialog');
  await dateDialog.getByLabel('Datum trke / ciljni datum').fill(isoFromNow(140));
  await dateDialog.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je izmenjena.')).toBeVisible();
  await page.getByRole('button', { name: 'Regeneriši plan po novim podacima' }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();
});
