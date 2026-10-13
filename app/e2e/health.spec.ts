import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

interface MockRun {
  date: string;
  distanceKm: number | null;
  durationSec: number;
  externalId: string;
  source: 'healthkit' | 'healthconnect';
  sourceName: string;
}

function middayUtcIso(daysAgo: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 12)).toISOString();
}

function mockRuns(): MockRun[] {
  return [
    {
      date: middayUtcIso(0),
      distanceKm: 12.34,
      durationSec: 3600,
      externalId: 'e2e-health-today',
      source: 'healthkit',
      sourceName: 'Apple Watch',
    },
    {
      date: middayUtcIso(1),
      distanceKm: 5.5,
      durationSec: 1800,
      externalId: 'e2e-health-yesterday',
      source: 'healthkit',
      sourceName: 'Apple Watch',
    },
  ];
}

async function stubHealth(page: Page, runs: MockRun[]) {
  await page.addInitScript((mock) => {
    window.__runcastHealthMock = { available: 'available', runs: mock };
  }, runs);
}

test('integracije: web prikazuje poruku bez dugmadi', async ({ page }) => {
  const email = uniqueEmail('health-web');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings');
  await expect(page.getByText('Integracije', { exact: true })).toBeVisible();
  await expect(page.getByTestId('health-web')).toContainText('Dostupno u mobilnoj aplikaciji');
  await expect(page.getByTestId('health-import')).toHaveCount(0);
  await expect(page.getByTestId('health-connect')).toHaveCount(0);
});

test('uvoz trčanja povezuje današnji planirani trening', async ({ page }) => {
  await stubHealth(page, mockRuns());
  const email = uniqueEmail('health-import');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings');
  await page.getByTestId('health-import').click();
  await expect(page.getByTestId('health-notice')).toContainText('Uvezeno 2');
  await expect(page.getByTestId('health-status')).toContainText('Povezano');

  await page.goto('/today');
  await expect(page.getByTestId('today-hero').getByText('Urađeno')).toBeVisible();
});

test('ponovni uvoz ne pravi duplikate', async ({ page }) => {
  await stubHealth(page, mockRuns());
  const email = uniqueEmail('health-repeat');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings');
  await page.getByTestId('health-import').click();
  await expect(page.getByTestId('health-notice')).toContainText('Uvezeno 2');

  await page.getByTestId('health-import').click();
  await expect(page.getByTestId('health-notice')).toContainText('Nema novih trčanja');
});
