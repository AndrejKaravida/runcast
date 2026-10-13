import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test('podešavanja: index vodi na podstranice, tab ostaje aktivan', async ({ page }) => {
  const email = uniqueEmail('settings');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings');
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole('link', { name: /Ciljna trka, izvoz i novi plan/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Podsetnici za treninge i trku/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Apple Health i Health Connect/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Patike i kilometraža/ })).toBeVisible();

  await page.getByRole('link', { name: /Ciljna trka, izvoz i novi plan/ }).click();
  await page.waitForURL('**/settings/plan');
  await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Izvezi plan (.ics)' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Podešavanja', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Nazad' }).click();
  await page.waitForURL('**/settings');
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole('link', { name: /Podsetnici za treninge i trku/ }).click();
  await page.waitForURL('**/settings/notifications');
  await expect(page.getByRole('heading', { name: 'Notifikacije' })).toBeVisible();
  await expect(page.getByTestId('push-master')).toBeVisible();
});
