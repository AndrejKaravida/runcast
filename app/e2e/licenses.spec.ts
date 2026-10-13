import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, sunnyFixture, uniqueEmail } from './helpers';

async function mockForecast(page: Page, fixture: () => unknown) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: fixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));
}

test('stranica licenci prikazuje Open-Meteo, Inter i react', async ({ page }) => {
  await page.goto('/licenses');

  await expect(page.getByRole('heading', { name: 'Licence otvorenog koda' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open-Meteo.com', exact: true })).toHaveAttribute(
    'href',
    'https://open-meteo.com',
  );
  await expect(page.getByRole('link', { name: '@fontsource-variable/inter', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'react', exact: true })).toBeVisible();
});

test('Today prikazuje Open-Meteo atribuciju sa linkom', async ({ page }) => {
  await mockForecast(page, sunnyFixture);

  const email = uniqueEmail('licenses');
  await register(page, email);
  await completeOnboarding(page);

  const attribution = page.getByTestId('weather-attribution');
  await expect(attribution).toBeVisible();
  await expect(attribution).toHaveText('Podaci: Open-Meteo');
  await expect(attribution.getByRole('link', { name: 'Open-Meteo', exact: true })).toHaveAttribute(
    'href',
    'https://open-meteo.com',
  );
});
