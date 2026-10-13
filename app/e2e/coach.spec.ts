import { expect, test, type Page } from '@playwright/test';
import { isoFromNow, mockGeocoding, register, uniqueEmail } from './helpers';

const MS_PER_DAY = 86_400_000;

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function todayWeekdayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function kmFromLabel(label: string): number {
  const match = /([\d.,]+) km/.exec(label);
  return match ? Number(match[1].replace(',', '.')) : Number.NaN;
}

async function completeOnboarding(page: Page) {
  await page.getByLabel('Naziv trke (opciono)').fill('E2E coach');
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(126));
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByLabel(/Ciljno vreme/).fill('3:45:00');
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByLabel('Dan dugog trčanja').selectOption(String(todayWeekdayIndex()));
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

async function openTargetRun(page: Page, date: string): Promise<string> {
  await expect(page.getByText('Ova nedelja')).toBeVisible();
  const link = page.locator(`a[aria-label^="${date}: "]`);
  if ((await link.count()) === 0) {
    await page.getByRole('button', { name: 'Sledeći mesec' }).click();
    await expect(page.getByRole('button', { name: 'Vrati na danas' })).toBeVisible();
  }
  await expect(link).toBeVisible();
  return (await link.getAttribute('aria-label')) ?? '';
}

test('adaptivni trener: RPE insajt skalira sledeću nedelju', async ({ page }) => {
  const email = uniqueEmail('coach');
  await mockGeocoding(page);
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('button', { name: /Urađeno/ }).click();
  await expect(page.getByText('Zabeleži trening')).toBeVisible();
  await page.getByLabel(/Trajanje/).fill('50:00');
  const rpe = page.locator('#log-rpe');
  await rpe.focus();
  for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Zabeleži trening')).toBeHidden();

  const targetDate = addDaysIso(todayIso(), 7);

  await page.goto('/plan');
  const beforeKm = kmFromLabel(await openTargetRun(page, targetDate));

  await page.goto('/stats');
  await expect(page.getByTestId('coach-card')).toBeVisible();
  await expect(page.getByText(/Telo traži predah/)).toBeVisible();
  await page.getByRole('button', { name: 'Olakšaj 10%' }).click();
  await expect(page.getByText(/je prilagođena\./)).toBeVisible();

  await page.goto('/plan');
  const afterKm = kmFromLabel(await openTargetRun(page, targetDate));
  expect(afterKm).toBeLessThan(beforeKm);
  expect(Math.abs(afterKm - Math.round(beforeKm * 0.9 * 10) / 10)).toBeLessThan(0.06);
});
