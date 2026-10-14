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

test('premium: zaključana sekcija Trke, pa otključavanje i promena cilja plana', async ({ page }) => {
  const email = uniqueEmail('premium');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/plan');
  const lock = page.getByTestId('premium-lock');
  await expect(lock).toBeVisible();
  await expect(lock).toContainText('Više trka');
  await expect(lock).toContainText('Premium');
  await expect(page.getByRole('button', { name: 'Dodaj trku' })).toHaveCount(0);

  const goalRow = page.getByTestId('race-row');
  await expect(goalRow).toHaveCount(1);
  await expect(goalRow.getByText('Cilj plana')).toBeVisible();
  await expect(goalRow.getByRole('button', { name: 'Uredi' })).toBeVisible();
  await expect(goalRow.getByRole('button', { name: 'Obriši' })).toHaveCount(0);

  await lock.getByRole('button', { name: 'Saznaj više' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Premium stiže uskoro')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  const supabase = await clientFor(email);
  const { data: user } = await supabase.auth.getUser();
  const { error: premiumError } = await supabase
    .from('profiles')
    .update({ premium: true })
    .eq('id', user?.user?.id ?? '');
  expect(premiumError).toBeNull();

  await page.reload();
  await expect(page.getByTestId('premium-lock')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dodaj trku' })).toBeVisible();

  await page.getByRole('button', { name: 'Dodaj trku' }).click();
  await page.getByLabel('Naziv trke (opciono)').fill('E2E 10K');
  await page.getByLabel('Datum trke / ciljni datum').fill(isoFromNow(30));
  await page.getByLabel('Distanca').selectOption('10');
  await page.getByLabel(/Ciljno vreme/).fill('50:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je dodata.')).toBeVisible();

  const newRow = page.getByTestId('race-row').filter({ hasText: 'E2E 10K' });
  await expect(newRow).toHaveCount(1);
  await newRow.getByRole('button', { name: 'Postavi kao cilj' }).click();
  await expect(page.getByText('Cilj plana je promenjen.')).toBeVisible();
  await expect(newRow.getByText('Cilj plana')).toBeVisible();

  await page.getByRole('button', { name: 'Regeneriši plan za ovu trku' }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();

  const { data: race, error: raceError } = await supabase.from('races').select('id').eq('name', 'E2E 10K').single();
  expect(raceError).toBeNull();
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('race_id')
    .eq('status', 'ACTIVE')
    .single();
  expect(planError).toBeNull();
  expect(plan?.race_id).toBe(race?.id);

  await page.goto('/today');
  await expect(page.getByTestId('race-chip')).toContainText('E2E 10K');
});

test('premium: slobodan korisnik nema izbor ciljne trke i zadržava cilj plana', async ({ page }) => {
  const email = uniqueEmail('premium-target');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/plan');
  await expect(page.getByTestId('premium-lock')).toBeVisible();
  await expect(page.getByLabel('Ciljna trka')).toHaveCount(0);

  const supabase = await clientFor(email);
  const { data: race } = await supabase.from('races').select('id').single();

  await page.getByRole('button', { name: /Generiši novi plan/ }).click();
  await expect(page.getByLabel('Ciljna trka')).toHaveCount(0);
  await page.getByRole('button', { name: 'Generiši', exact: true }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();

  const { data: plan, error } = await supabase.from('plans').select('race_id').eq('status', 'ACTIVE').single();
  expect(error).toBeNull();
  expect(plan?.race_id).toBe(race?.id);

  const { data: races, error: racesError } = await supabase.from('races').select('id');
  expect(racesError).toBeNull();
  expect(races).toHaveLength(1);
});
