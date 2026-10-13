import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

async function delayRoute(page: Page, pattern: string, delayMs = 1200) {
  await page.route(pattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

test('skeleton loaderi na Plan, Stats i Leaderboard ne pomeraju sadržaj', async ({ page }) => {
  const email = uniqueEmail('skeleton');
  await register(page, email);
  await completeOnboarding(page);

  await delayRoute(page, '**/rest/v1/plans*');
  await delayRoute(page, '**/rest/v1/workouts*');
  await delayRoute(page, '**/rest/v1/run_logs*', 4000);
  await delayRoute(page, '**/rest/v1/rpc/weekly_leaderboard*');

  await page.goto('/plan');
  await expect(page.getByTestId('plan-skeleton')).toBeVisible();
  await expect(page.locator('[data-testid="cal-cell"]').first()).toBeVisible();
  await expect(page.getByTestId('week-row').first()).toBeVisible();

  await page.goto('/stats');
  await expect(page.getByTestId('stats-skeleton')).toBeVisible();
  await expect(page.getByTestId('coach-card')).toBeVisible();
  await expect(page.getByTestId('personal-bests-skeleton')).toBeVisible();
  await expect(page.getByTestId('personal-bests-card')).toBeVisible();

  await page.goto('/leaderboard');
  await expect(page.getByTestId('leaderboard-skeleton')).toBeVisible();
  await expect(
    page.getByText('Rang lista je još prazna').or(page.getByTestId('leaderboard-row').first()),
  ).toBeVisible();
});
