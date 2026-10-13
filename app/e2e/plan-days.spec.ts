import { expect, test, type Page } from '@playwright/test';
import { isoFromNow, mockGeocoding, register, uniqueEmail } from './helpers';

const RUN_TYPES = ['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'RACE'];
const CUSTOM_DAYS = [1, 3, 5, 6];

function localIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function currentWeekIso(): string[] {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) =>
    localIso(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)),
  );
}

async function completeOnboardingWithRunDays(page: Page, runDays: number[]) {
  await mockGeocoding(page);
  await page.getByLabel('Naziv trke (opciono)').fill('E2E maraton');
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(126));
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel(/Ciljno vreme/).fill('3:45:00');
  await expect(page.getByText(/VDOT 4/)).toBeVisible();
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel('Dan dugog trčanja').selectOption('6');
  for (let day = 0; day < 7; day++) {
    const toggle = page.getByTestId(`plan-day-${day}`);
    const pressed = (await toggle.getAttribute('aria-pressed')) === 'true';
    if (pressed !== runDays.includes(day)) await toggle.click();
  }
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel('Grad', { exact: true }).fill('Novi Sad');
  await page.getByRole('button', { name: 'Traži' }).click();
  await page
    .getByRole('button', { name: /Novi Sad/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByRole('button', { name: 'Generiši plan' }).click();
  await page.waitForURL('**/today');
}

test('plan days: treninzi su samo na izabranim danima', async ({ page }) => {
  const email = uniqueEmail('plan-days');
  await register(page, email);
  await completeOnboardingWithRunDays(page, CUSTOM_DAYS);

  await page.goto('/plan');
  const week = currentWeekIso();
  const today = localIso(new Date());
  for (let day = 0; day < 7; day++) {
    if (week[day] < today) continue;
    const type = await page.locator(`[data-testid="cal-cell"][data-date="${week[day]}"]`).getAttribute('data-type');
    if (CUSTOM_DAYS.includes(day)) {
      expect(RUN_TYPES, `day ${day}`).toContain(type);
    } else {
      expect(RUN_TYPES, `day ${day}`).not.toContain(type);
    }
  }
});

test('plan days: pogrešan broj izabranih dana prikazuje grešku', async ({ page }) => {
  const email = uniqueEmail('plan-days-error');
  await register(page, email);
  await mockGeocoding(page);
  await page.getByLabel('Naziv trke (opciono)').fill('E2E maraton');
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(126));
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByLabel(/Ciljno vreme/).fill('3:45:00');
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByTestId('plan-day-2').click();
  await page.getByRole('button', { name: 'Dalje' }).click();
  await expect(page.getByText('Izaberi tačno 4 dana za trening.')).toBeVisible();
});

test('plan days: podešavanja popunjavaju dane iz plana i regenerišu po njima', async ({ page }) => {
  const email = uniqueEmail('plan-days-settings');
  await register(page, email);
  await completeOnboardingWithRunDays(page, CUSTOM_DAYS);

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: /Generiši novi plan/ }).click();
  await expect(page.getByTestId('plan-day-1')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('plan-day-2')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('plan-day-3')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('plan-day-5')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('plan-day-6')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('plan-day-0').click();
  await page.getByTestId('plan-day-5').click();
  await page.getByRole('button', { name: 'Generiši', exact: true }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /Generiši novi plan/ }).click();
  await expect(page.getByTestId('plan-day-0')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('plan-day-1')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('plan-day-3')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('plan-day-5')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('plan-day-6')).toHaveAttribute('aria-pressed', 'true');
});
