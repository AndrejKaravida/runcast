import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test.use({ viewport: { width: 390, height: 844 } });

test('settings subpage screenshots', async ({ page }) => {
  const email = uniqueEmail('shots');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings');
  await expect(page.getByTestId('app-splash')).toBeHidden();
  await page.locator('a[href="/settings/plan"]').click();
  await page.waitForURL('**/settings/plan');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/design-after/settings-plan.png', fullPage: true });

  await page.goto('/settings/profile');
  await expect(page.getByTestId('app-splash')).toBeHidden();
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/design-after/settings-profile.png', fullPage: true });
});
