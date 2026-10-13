import { expect, test, type Route } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

async function delayRoute(route: Route, ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await route.continue();
}

test('skeletoni: oprema prikazuje skeleton dok se patike učitavaju', async ({ page }) => {
  const email = uniqueEmail('skeleton-gear');
  await register(page, email);
  await completeOnboarding(page);

  await page.route('**/rest/v1/shoes*', (route) => delayRoute(route, 1200));

  await page.goto('/settings/gear');
  await expect(page.getByTestId('gear-skeleton')).toBeVisible();
  await expect(page.getByTestId('gear-empty')).toBeVisible();
});

test('skeletoni: profil prikazuje indikator učitavanja pa formu', async ({ page }) => {
  const email = uniqueEmail('skeleton-profile');
  await register(page, email);
  await completeOnboarding(page);

  await page.route('**/rest/v1/profiles*', (route) => delayRoute(route, 1200));

  await page.goto('/settings/profile');
  await expect(page.getByTestId('profile-skeleton').or(page.getByRole('status'))).toBeVisible();
  await expect(page.getByLabel('Ime', { exact: true })).toBeVisible();
});
