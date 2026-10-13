import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

const LANGUAGE_KEY = 'runcast.lang';

test('podrazumevani jezik je sr na /login', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr');
  await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBeNull();
});

test.describe('navigator.language nije sr', () => {
  test.use({ locale: 'en-US' });

  test('detekcija bez upisanog izbora daje en', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('runcast.lang=en iz localStorage menja jezik posle reload-a', async ({ page }) => {
  await page.goto('/login');
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_KEY);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('prebacivanje jezika u podešavanjima menja UI, čuva izbor i preživljava reload', async ({ page }) => {
  const email = uniqueEmail('locale');
  await register(page, email);
  await completeOnboarding(page);
  await expect(page.getByRole('link', { name: 'Podešavanja', exact: true })).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByText('Jezik', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Today', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Stats', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('Language', { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBe('en');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('Language', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Srpski', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr');
  await expect(page.getByRole('link', { name: 'Podešavanja', exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBe('sr');
});
