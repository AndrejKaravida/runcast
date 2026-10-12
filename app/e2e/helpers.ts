import { expect, type Page } from '@playwright/test';

export function isoFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
}

export async function register(page: Page, email: string) {
  await page.goto('/register');
  await page.getByLabel('Ime', { exact: true }).fill('E2E Trkač');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Lozinka', { exact: true }).fill('testtest123');
  await page.getByLabel('Potvrdi lozinku', { exact: true }).fill('testtest123');
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  await page.waitForURL('**/onboarding');
}

export async function completeOnboarding(page: Page) {
  await page.getByLabel('Naziv trke (opciono)').fill('E2E maraton');
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(126));
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel(/Ciljno vreme/).fill('3:45:00');
  await expect(page.getByText(/VDOT 4/)).toBeVisible();
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel('Dan dugog trčanja').selectOption('0');
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

export function rainFixture() {
  const times: string[] = [];
  const temperature: number[] = [];
  const apparent: number[] = [];
  const probability: number[] = [];
  const precipitation: number[] = [];
  const code: number[] = [];
  const wind: number[] = [];
  const gusts: number[] = [];
  const now = new Date();
  for (let day = 0; day < 9; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const stamp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, hour));
      times.push(stamp.toISOString().slice(0, 16));
      temperature.push(12);
      apparent.push(11);
      probability.push(90);
      precipitation.push(3);
      code.push(61);
      wind.push(10);
      gusts.push(20);
    }
  }
  return {
    hourly: {
      time: times,
      temperature_2m: temperature,
      apparent_temperature: apparent,
      precipitation_probability: probability,
      precipitation,
      weather_code: code,
      wind_speed_10m: wind,
      wind_gusts_10m: gusts,
    },
  };
}

export async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label}: horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(1);
}
