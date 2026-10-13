import { expect, type Page } from '@playwright/test';

export function isoFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
}

export async function register(page: Page, email: string, name = 'E2E Trkač') {
  await page.goto('/register');
  await page.getByLabel('Ime', { exact: true }).fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Lozinka', { exact: true }).fill('testtest123');
  await page.getByLabel('Potvrdi lozinku', { exact: true }).fill('testtest123');
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  await page.waitForURL('**/onboarding');
}

export async function mockGeocoding(page: Page) {
  await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            name: 'Novi Sad',
            country: 'Serbia',
            admin1: 'Vojvodina',
            latitude: 45.2517,
            longitude: 19.8369,
          },
        ],
      },
    }),
  );
}

export async function completeOnboarding(page: Page, raceDate = isoFromNow(126)) {
  await mockGeocoding(page);
  await page.getByLabel('Naziv trke (opciono)').fill('E2E maraton');
  await page.getByLabel('Datum trke', { exact: true }).fill(raceDate);
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel(/Ciljno vreme/).fill('3:45:00');
  await expect(page.getByText(/VDOT 4/)).toBeVisible();
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel('Dan dugog trčanja').selectOption(String((new Date().getDay() + 6) % 7));
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

interface ForecastOverrides {
  temperature?: number;
  apparent?: number;
  probability?: number;
  precipitation?: number;
  weatherCode?: number;
  wind?: number;
  gusts?: number;
}

function forecastFixture(overrides: ForecastOverrides = {}) {
  const {
    temperature: temperatureValue = 12,
    apparent: apparentValue = 11,
    probability: probabilityValue = 90,
    precipitation: precipitationValue = 3,
    weatherCode: weatherCodeValue = 61,
    wind: windValue = 10,
    gusts: gustsValue = 20,
  } = overrides;
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
      temperature.push(temperatureValue);
      apparent.push(apparentValue);
      probability.push(probabilityValue);
      precipitation.push(precipitationValue);
      code.push(weatherCodeValue);
      wind.push(windValue);
      gusts.push(gustsValue);
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

export function rainFixture() {
  return forecastFixture();
}

export function lightRainFixture() {
  return forecastFixture({
    temperature: 18,
    apparent: 18,
    probability: 20,
    precipitation: 0.1,
    weatherCode: 3,
    wind: 8,
    gusts: 15,
  });
}

export function sunnyFixture() {
  return forecastFixture({
    temperature: 16,
    apparent: 16,
    probability: 0,
    precipitation: 0,
    weatherCode: 1,
    wind: 6,
    gusts: 12,
  });
}

export async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label}: horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(1);
}
