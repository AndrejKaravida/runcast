import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, sunnyFixture, uniqueEmail } from './helpers';

async function mockForecast(page: Page, fixture: () => unknown) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: fixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));
}

test('weather hero prikazuje najbolji termin i uslove', async ({ page }) => {
  await mockForecast(page, sunnyFixture);

  const email = uniqueEmail('weatherhero');
  await register(page, email);
  await completeOnboarding(page);

  await expect(page.getByTestId('weather-hero')).toBeVisible();
  await expect(page.getByTestId('weather-hero-window')).toHaveText('Najbolji termin danas: 6–8h · skor 100');
  await expect(page.getByTestId('weather-hero-conditions')).toHaveText('0% kiše · vetar 6 km/h');
  await expect(page.getByTestId('weather-hero').getByText('16°').first()).toBeVisible();
});

test('plan kalendar prikazuje skor uslova za dane iz prognoze', async ({ page }) => {
  await mockForecast(page, sunnyFixture);

  const email = uniqueEmail('weatherplan');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');

  const today = await page.evaluate(() => new Date().toLocaleDateString('sv-SE'));
  const todayCell = page.locator(`[data-testid="cal-cell"][data-date="${today}"]`);
  await expect(todayCell).toHaveAttribute('data-score', '100');

  const scored = page.locator('[data-testid="cal-cell"][data-score]');
  expect(await scored.count()).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId('plan-weather-legend')).toHaveText('Boja dana: zeleno = dobri uslovi');
});

test('weather hero se sakriva kad prognoza padne', async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ status: 500, json: {} }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));

  const email = uniqueEmail('weatherfail');
  await register(page, email);
  await completeOnboarding(page);

  await expect(page.getByTestId('today-hero')).toBeVisible();
  await expect(page.getByTestId('weather-hero')).toBeHidden();
});
