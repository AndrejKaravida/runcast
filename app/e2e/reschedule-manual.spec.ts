import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, sunnyFixture, uniqueEmail } from './helpers';

const MS_PER_DAY = 86_400_000;
const FAKE_MONDAY = '2026-01-05T10:00:00';
const FAKE_TODAY = '2026-01-07';
const FAKE_RACE_DATE = '2026-05-11';

function dayIso(offsetDays: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays).toLocaleDateString('sv-SE');
}

async function mockWeather(page: Page) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: sunnyFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));
}

async function firstRestDateAfter(page: Page, today: string): Promise<string> {
  const cells = page.locator('[data-testid="cal-cell"][data-type="REST"]');
  const total = await cells.count();
  for (let index = 0; index < total; index++) {
    const date = await cells.nth(index).getAttribute('data-date');
    if (date !== null && date > today) return date;
  }
  throw new Error('no rest day after today');
}

test('ručno pomeranje: dugi trk ide na slobodan dan i ostaje tamo', async ({ page }) => {
  await mockWeather(page);
  const email = uniqueEmail('move');
  await register(page, email);
  await completeOnboarding(page, dayIso(124));

  const today = dayIso(0);
  await page.goto('/plan');
  await expect(page.locator('[data-testid="cal-cell"]').first()).toBeVisible();
  const targetDate = await firstRestDateAfter(page, today);

  await page.locator(`a[aria-label^="${today}: "]`).click();
  await expect(page.getByTestId('move-workout')).toBeVisible();
  await page.getByTestId('move-workout').click();
  await page.getByLabel('Novi datum').fill(targetDate);
  await page.getByTestId('move-confirm').click();
  await expect(page.getByTestId('move-confirm')).toBeHidden();

  await page.goto('/plan');
  await expect(page.locator(`[data-testid="cal-cell"][data-date="${targetDate}"]`)).toHaveAttribute(
    'data-type',
    'LONG',
  );
  await expect(page.locator(`[data-testid="cal-cell"][data-date="${today}"]`)).toHaveAttribute('data-type', 'REST');

  await page.goto('/today');
  await expect(page.getByTestId('today-workout-title')).toHaveText('Odmor');
});

test('adaptiraj nedelju: propušteni su preskočeni, ostatak ostaje u nedelji', async ({ page }) => {
  await mockWeather(page);
  await page.clock.install({ time: new Date(FAKE_MONDAY) });

  const email = uniqueEmail('adapt');
  await register(page, email);
  await completeOnboarding(page, FAKE_RACE_DATE);

  await page.clock.fastForward(2 * MS_PER_DAY);

  await page.goto('/plan');
  const adapt = page.getByTestId('adapt-week');
  await expect(adapt).toBeVisible();
  await adapt.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('propuštenih treninga ove nedelje');
  await dialog.getByRole('button', { name: 'Adaptiraj nedelju' }).click();
  await expect(page.getByTestId('adapt-success')).toBeVisible();

  const rows = page.locator('[data-testid="week-row"]');
  const total = await rows.count();
  let skipped = 0;
  for (let index = 0; index < total; index++) {
    const row = rows.nth(index);
    const date = await row.getAttribute('data-date');
    const status = await row.getAttribute('data-status');
    const type = await row.getAttribute('data-type');
    if (status === 'SKIPPED') skipped += 1;
    if (status === 'PLANNED' && type !== null && type !== '' && type !== 'REST' && date !== null) {
      expect(date >= FAKE_TODAY).toBe(true);
    }
  }
  expect(skipped).toBeGreaterThan(0);
});
