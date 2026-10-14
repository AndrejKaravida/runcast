import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

const RAW_KEY_PATTERN = /\b[a-z][a-z0-9]*:[a-z][a-z0-9.]*\b/;

async function expectNoRawKeys(page: Page, label: string) {
  const body = await page.locator('body').innerText();
  const rawKey = body.match(RAW_KEY_PATTERN);
  expect(rawKey, `${label}: visible raw i18n key "${rawKey?.[0] ?? ''}"`).toBeNull();
}

async function expectTranslatedPage(page: Page, path: string, navName: string) {
  await page.goto(path);
  await expect(page.getByRole('link', { name: navName, exact: true })).toBeVisible();
  await expectNoRawKeys(page, path);
}

test('prebacivanje jezika ne ostavlja sirove ključeve na ključnim stranama', async ({ page }) => {
  const email = uniqueEmail('i18nkeys');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings');
  await expect(page.getByText('Jezik', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Language', { exact: true })).toBeVisible();

  await expectTranslatedPage(page, '/today', 'Today');
  await expectTranslatedPage(page, '/plan', 'Plan');
  await expectTranslatedPage(page, '/settings', 'Settings');

  await expect(page.getByText('Language', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Srpski', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr');
  await expect(page.getByText('Jezik', { exact: true })).toBeVisible();

  await expectTranslatedPage(page, '/today', 'Danas');
  await expectTranslatedPage(page, '/plan', 'Plan');
  await expectTranslatedPage(page, '/settings', 'Podešavanja');
});
