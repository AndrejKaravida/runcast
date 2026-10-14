import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { completeOnboarding, isoFromNow, register, uniqueEmail } from './helpers';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const QUALITY_TYPES = ['TEMPO', 'INTERVALS', 'REPETITIONS'];

async function clientFor(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: 'testtest123' });
  expect(error).toBeNull();
  return client;
}

function nextMonthFirstDay(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('sv-SE');
}

test('kalendar: dan vodi na trening, sledeći mesec i povratak na danas', async ({ page }) => {
  const email = uniqueEmail('kalendar');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/plan');
  await expect(page.locator('[data-testid="cal-cell"]').first()).toBeVisible();

  const monthLabel = page.getByRole('button', { name: 'Sledeći mesec' }).locator('xpath=..').locator('p');
  const currentMonth = await monthLabel.textContent();

  const dayLink = page.locator('a[data-testid="cal-cell"]').first();
  await expect(dayLink).toBeVisible();
  const href = await dayLink.getAttribute('href');
  expect(href).toMatch(/^\/workout\//);
  await dayLink.click();
  await page.waitForURL('**/workout/**');
  expect(page.url()).toContain(href ?? '');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByTestId('export-fit')).toBeVisible();

  await page.getByRole('button', { name: 'Nazad' }).click();
  await page.waitForURL('**/plan');

  await page.getByRole('button', { name: 'Sledeći mesec' }).click();
  await expect(page.getByRole('button', { name: 'Vrati na danas' })).toBeVisible();
  await expect(monthLabel).not.toHaveText(currentMonth ?? '');
  await expect(page.locator(`[data-testid="cal-cell"][data-date="${nextMonthFirstDay()}"]`)).toBeVisible();

  await page.getByRole('button', { name: 'Vrati na danas' }).click();
  await expect(page.getByRole('button', { name: 'Vrati na danas' })).toBeHidden();
  await expect(monthLabel).toHaveText(currentMonth ?? '');
});

test('bazni plan iz podešavanja: dijalog potvrde pa generisanje bez kvalitetnih treninga', async ({ page }) => {
  const email = uniqueEmail('bazni');
  await register(page, email);
  await completeOnboarding(page, isoFromNow(126));

  const client = await clientFor(email);
  const { data: before } = await client.from('plans').select('id, anchor').eq('status', 'ACTIVE').single();
  expect(before?.anchor).not.toBeNull();

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: /Generiši novi plan/ }).click();
  await page.getByLabel(/Ciljno vreme/).fill('');
  await page.getByRole('button', { name: 'Generiši', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Generisati bazni plan?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Otkaži' }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Generiši', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Generiši bazni plan' }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();

  const { data: plan, error } = await client
    .from('plans')
    .select('id, anchor, paces, weeks')
    .eq('status', 'ACTIVE')
    .single();
  expect(error).toBeNull();
  expect(plan?.id).not.toBe(before?.id);
  expect(plan?.anchor).toBeNull();
  expect(plan?.paces).toBeNull();

  const { data: workouts, error: workoutsError } = await client
    .from('workouts')
    .select('type')
    .eq('plan_id', plan?.id ?? '');
  expect(workoutsError).toBeNull();
  const types = new Set((workouts ?? []).map((workout) => workout.type));
  expect(types.has('EASY')).toBe(true);
  for (const quality of QUALITY_TYPES) expect(types.has(quality)).toBe(false);

  await page.goto('/plan');
  await expect(page.locator('[data-testid="week-row"]').first()).toBeVisible();
});
