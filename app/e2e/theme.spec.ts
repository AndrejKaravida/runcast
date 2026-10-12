import { expect, test, type Page } from '@playwright/test';
import { assertNoHorizontalOverflow, completeOnboarding, register, uniqueEmail } from './helpers';

const THEME_KEY = 'runcast.theme';

function bodyBackground(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test('sistemski dark je podrazumevan bez upisanog izbora', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await bodyBackground(page)).toBe('rgb(11, 15, 26)');
  expect(await page.evaluate(() => document.documentElement.style.colorScheme)).toBe('dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0f1a');
});

test.describe('sistem svetla', () => {
  test.use({ colorScheme: 'light' });

  test('sistemska svetla preferencija daje svetlu temu', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await bodyBackground(page)).toBe('rgb(246, 246, 244)');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f7f8fa');
  });
});

test('toggle u podešavanjima menja temu, čuva izbor i preživljava reload', async ({ page }) => {
  const email = uniqueEmail('theme');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Svetla', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f7f8fa');
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Svetla', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Tamna', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('dark');
});

test('Sistem prati OS uživo, brzi toggle postavlja eksplicitan izbor', async ({ page }) => {
  const email = uniqueEmail('theme-live');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('button', { name: 'Uključi svetlu temu' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('light');
  await expect(page.getByRole('button', { name: 'Uključi tamnu temu' })).toBeVisible();

  await page.getByRole('button', { name: 'Uključi tamnu temu' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('link', { name: 'Podešavanja', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByRole('button', { name: 'Sistem', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBeNull();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('light tema bez horizontalnog overflow-a na 320 i 1440', async ({ page }) => {
  const email = uniqueEmail('theme-responsive');
  await register(page, email);
  await completeOnboarding(page);

  await page.evaluate((key) => localStorage.setItem(key, 'light'), THEME_KEY);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/today');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.waitForTimeout(150);
    await assertNoHorizontalOverflow(page, `light ${viewport.width} /today`);
  }
});
