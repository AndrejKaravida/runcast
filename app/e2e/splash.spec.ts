import { expect, test } from '@playwright/test';

test('splash se prikaže na učitavanju i sam nestane', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'commit' });
  const splash = page.getByTestId('app-splash');
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('splash je statičan bez animacije', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'commit' });
    const splash = page.getByTestId('app-splash');
    await expect(splash).toBeVisible();
    await expect(splash).not.toHaveClass(/app-splash--animated/);
    await expect(splash).toBeHidden();
  });
});
