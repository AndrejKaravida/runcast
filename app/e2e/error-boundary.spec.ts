import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, sunnyFixture, uniqueEmail } from './helpers';

async function mockForecast(page: Page) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: sunnyFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));
}

const LAZY_MODULE_PATTERN = '**/src/pages/LicensesPage.tsx*';
const PROFILES_PATTERN = '**/rest/v1/profiles*';

test('pad dinamičkog modula prikazuje ekran za novu verziju', async ({ page }) => {
  await page.route(LAZY_MODULE_PATTERN, (route) => route.abort());
  await page.goto('/licenses');

  await expect(page.getByTestId('error-screen')).toBeVisible();
  await expect(page.getByText('Nova verzija je dostupna, osveži stranicu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pokušaj ponovo' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nazad na Danas' })).toHaveAttribute('href', '/today');
});

test('greška profil upita prikazuje ekran sa ponovnim pokušajem umesto beskonačnog splasha', async ({ page }) => {
  await mockForecast(page);
  const email = uniqueEmail('error-boundary');
  await register(page, email);
  await completeOnboarding(page);

  await page.route(PROFILES_PATTERN, (route) =>
    route.fulfill({ status: 500, json: { message: 'profiles unavailable' } }),
  );
  await page.reload();

  await expect(page.getByText('Ne mogu da učitam podatke')).toBeVisible();
  const retry = page.getByRole('button', { name: 'Pokušaj ponovo' });
  await expect(retry).toBeVisible();
  await expect(page.getByTestId('app-splash')).toBeHidden();

  await page.unroute(PROFILES_PATTERN);
  await retry.click();

  await expect(page.getByRole('link', { name: 'Danas' })).toBeVisible();
  await expect(page.getByText(/Dobro jutro|Dobar dan|Dobro veče/)).toBeVisible();
});
