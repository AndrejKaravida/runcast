import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { completeOnboarding, isoFromNow, register, uniqueEmail } from './helpers';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function clientFor(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: 'testtest123' });
  expect(error).toBeNull();
  return client;
}

interface PlanSnapshot {
  id: string;
  anchor: { kind: string; distanceKm: number; timeSec: number } | null;
  paces: { thresholdSecPerKm: number } | null;
}

async function activePlan(client: Awaited<ReturnType<typeof clientFor>>): Promise<PlanSnapshot> {
  const { data, error } = await client.from('plans').select('id, anchor, paces').eq('status', 'ACTIVE').single();
  expect(error).toBeNull();
  if (!data) throw new Error('active plan missing');
  return data as PlanSnapshot;
}

test('izmena trke: naziv i ciljno vreme, pa regeneracija posle promene datuma', async ({ page }) => {
  const email = uniqueEmail('race-edit');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: 'Uredi' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Izmena trke')).toBeVisible();
  await dialog.getByLabel('Naziv trke (opciono)').fill('Nova trka');
  await dialog.getByLabel(/Ciljno vreme/).fill('3:30:00');
  await dialog.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je izmenjena.')).toBeVisible();
  await expect(page.getByText('Nova trka').first()).toBeVisible();

  await page.goto('/today');
  await expect(page.getByTestId('race-chip')).toContainText('Nova trka');

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: 'Uredi' }).click();
  const dateDialog = page.getByRole('dialog');
  await dateDialog.getByLabel('Datum trke / ciljni datum').fill(isoFromNow(140));
  await dateDialog.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je izmenjena.')).toBeVisible();
  await page.getByRole('button', { name: 'Regeneriši plan po novim podacima' }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();
});

test('sporije ciljno vreme posle regeneracije menja tempa u planu', async ({ page }) => {
  const email = uniqueEmail('race-pace');
  await register(page, email);
  await completeOnboarding(page);

  const client = await clientFor(email);
  const before = await activePlan(client);
  expect(before.anchor).toMatchObject({ kind: 'goal', timeSec: 13500 });

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: 'Uredi' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Ciljno vreme/).fill('4:30:00');
  await dialog.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je izmenjena.')).toBeVisible();
  await page.getByRole('button', { name: 'Regeneriši plan po novim podacima' }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();

  const after = await activePlan(client);
  expect(after.id).not.toBe(before.id);
  expect(after.anchor).toMatchObject({ kind: 'goal', timeSec: 16200 });
  expect(after.paces).not.toBeNull();
  expect(before.paces).not.toBeNull();
  expect(after.paces?.thresholdSecPerKm ?? 0).toBeGreaterThan(before.paces?.thresholdSecPerKm ?? 0);
});
