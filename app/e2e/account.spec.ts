import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test('izvoz podataka preuzima JSON sa profilom i dnevnikom', async ({ page }) => {
  const email = uniqueEmail('export');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/account');
  await expect(page.getByText(email)).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Preuzmi moje podatke' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('runcast-podaci.json');
  await expect(page.getByText('Podaci su preuzeti.')).toBeVisible();

  const filePath = await download.path();
  if (!filePath) throw new Error('Preuzimanje nije dalo putanju');
  const payload = JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;

  expect(payload.app).toBe('RunCast');
  expect(payload.version).toBe(1);
  expect(payload.exported_at).toBeTruthy();
  expect(payload.profile).toBeTruthy();
  expect(payload.run_logs).toEqual([]);
  expect(Array.isArray(payload.workouts)).toBe(true);
  expect((payload.workouts as unknown[]).length).toBeGreaterThan(0);
});

test('brisanje naloga briše korisnika i prijava više ne radi', async ({ page }) => {
  const email = uniqueEmail('delete');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/account');
  await page.getByRole('button', { name: 'Obriši nalog' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('OBRIŠI').fill('OBRIŠI');
  await dialog.getByRole('button', { name: 'Obriši nalog' }).click();
  await page.waitForURL('**/login');

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Lozinka', { exact: true }).fill('testtest123');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page.getByText('Pogrešan email ili lozinka')).toBeVisible();
});

test('potvrda brisanja je onemogućena dok se ne unese tačan tekst', async ({ page }) => {
  const email = uniqueEmail('keepme');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/account');
  await page.getByRole('button', { name: 'Obriši nalog' }).click();
  const dialog = page.getByRole('dialog');
  const confirmButton = dialog.getByRole('button', { name: 'Obriši nalog' });

  await expect(confirmButton).toBeDisabled();
  await dialog.getByLabel('OBRIŠI').fill('OBRISI');
  await expect(confirmButton).toBeDisabled();
  await dialog.getByLabel('OBRIŠI').fill('OBRIŠI');
  await expect(confirmButton).toBeEnabled();
});

test('izvoz posle treninga sadrži dnevnik sa RPE, tempom i beleškom', async ({ page }) => {
  const email = uniqueEmail('export-log');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByTestId('log-done').click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeVisible();
  await page.getByLabel('Distanca (km)').fill('7');
  await page.getByLabel(/Trajanje/).fill('42:00');
  const rpe = page.locator('#log-rpe');
  await rpe.focus();
  for (let step = 0; step < 2; step++) await page.keyboard.press('ArrowRight');
  await expect(rpe).toHaveValue('7');
  await page.getByLabel(/Beleška/).fill('Izvoz test');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeHidden();

  await page.goto('/settings/account');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Preuzmi moje podatke' }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  if (!filePath) throw new Error('Preuzimanje nije dalo putanju');
  const payload = JSON.parse(await readFile(filePath, 'utf8')) as {
    profile: unknown;
    run_logs: Array<Record<string, unknown>>;
  };

  expect(payload.profile).toMatchObject({ onboarding_completed: true });
  expect(payload.run_logs).toHaveLength(1);
  expect(payload.run_logs[0]).toMatchObject({
    distance_km: 7,
    duration_sec: 2520,
    rpe: 7,
    notes: 'Izvoz test',
    avg_pace_sec_per_km: 360,
  });
});
