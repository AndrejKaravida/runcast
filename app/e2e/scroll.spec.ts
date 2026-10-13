import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

async function scrollY(page: import('@playwright/test').Page) {
  return page.evaluate(() => window.scrollY);
}

test('navigacija uvek počinje od vrha stranice', async ({ page }) => {
  const email = uniqueEmail('scroll');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/plan');
  await expect(page.getByTestId('app-splash')).toBeHidden();
  await expect(page.getByTestId('cal-cell').first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => scrollY(page)).toBeGreaterThan(100);

  await page.getByRole('link', { name: 'Statistika', exact: true }).click();
  await page.waitForURL('**/stats');
  await expect.poll(() => scrollY(page)).toBe(0);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => scrollY(page)).toBeGreaterThan(100);

  await page.getByRole('link', { name: 'Danas', exact: true }).click();
  await page.waitForURL('**/today');
  await expect.poll(() => scrollY(page)).toBe(0);
});
