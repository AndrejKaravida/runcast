import { expect, test } from '@playwright/test';
import { register, uniqueEmail } from './helpers';

test('registracija bez prihvatanja uslova ostaje na formi', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Ime', { exact: true }).fill('E2E Trkač');
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail('consent'));
  await page.getByLabel('Lozinka', { exact: true }).fill('testtest123');
  await page.getByLabel('Potvrdi lozinku', { exact: true }).fill('testtest123');
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  await expect(page.getByText('Potvrdi da imaš 16 ili više godina i da prihvataš uslove')).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
});

test('linkovi ka politici privatnosti i uslovima rade', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('link', { name: 'Politiku privatnosti' }).click();
  await page.waitForURL('**/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Politika privatnosti' })).toBeVisible();
  await expect(page.locator('#brisanje-naloga')).toBeVisible();

  await page.goto('/register');
  await page.getByRole('link', { name: 'Uslove korišćenja' }).click();
  await page.waitForURL('**/terms');
  await expect(page.getByRole('heading', { level: 1, name: 'Uslovi korišćenja' })).toBeVisible();
});

test('registracija sa prihvaćenim uslovima prolazi', async ({ page }) => {
  await register(page, uniqueEmail('consent-ok'));
  await expect(page.getByLabel('Naziv trke (opciono)')).toBeVisible();
});
