import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { completeOnboarding, isoFromNow, register, sunnyFixture, uniqueEmail } from './helpers';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function mockWeather(page: Page) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: sunnyFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));
}

async function clientFor(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: 'testtest123' });
  expect(error).toBeNull();
  return client;
}

test('posle oporavka: kartica sledećeg cilja vodi u plan za buduću trku', async ({ page }) => {
  await mockWeather(page);
  const email = uniqueEmail('race-continuity');
  await register(page, email);
  await completeOnboarding(page);

  const supabase = await clientFor(email);
  const { data: onboardingRace, error: raceError } = await supabase
    .from('races')
    .select('id')
    .eq('name', 'E2E maraton')
    .single();
  expect(raceError).toBeNull();
  if (!onboardingRace) throw new Error('onboarding race missing');
  const { error: raceUpdateError } = await supabase
    .from('races')
    .update({ race_date: isoFromNow(-1) })
    .eq('id', onboardingRace.id);
  expect(raceUpdateError).toBeNull();

  await page.goto('/plan');
  await expect(page.getByTestId('recovery-card')).toBeVisible();
  await page.getByTestId('recovery-generate').click();
  await expect(page.getByTestId('recovery-notice')).toBeVisible();
  await expect(page.getByTestId('recovery-card')).toBeHidden();
  await expect(page.getByTestId('next-goal-card')).toBeHidden();

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: 'Dodaj trku' }).click();
  await page.getByLabel('Naziv trke (opciono)').fill('E2E prolećni polumaraton');
  await page.getByLabel('Datum trke / ciljni datum').fill(isoFromNow(70));
  await page.getByLabel('Distanca').selectOption('21.0975');
  await page.getByLabel(/Ciljno vreme/).fill('1:45:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je dodata.')).toBeVisible();

  const { data: futureRace, error: futureRaceError } = await supabase
    .from('races')
    .select('id, race_date')
    .eq('name', 'E2E prolećni polumaraton')
    .single();
  expect(futureRaceError).toBeNull();
  if (!futureRace) throw new Error('future race missing');

  await page.goto('/plan');
  const card = page.getByTestId('next-goal-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Sledeći cilj: E2E prolećni polumaraton');
  await expect(card).toContainText(/za \d+ dana/);

  await card.getByTestId('next-goal-action').click();
  await expect(page).toHaveURL(/\/settings\/plan$/);
  await expect(page.getByText('Novi plan (stari se arhivira)')).toBeVisible();
  await expect(page.getByLabel('Ciljna trka')).toHaveValue(futureRace.id);
  await expect(page.getByLabel('Datum trke / ciljni datum')).toHaveValue(futureRace.race_date);

  await page.getByRole('button', { name: 'Generiši', exact: true }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();

  const { data: plan } = await supabase
    .from('plans')
    .select('race_id, race_date, weeks')
    .eq('status', 'ACTIVE')
    .single();
  expect(plan?.race_id).toBe(futureRace.id);
  expect(plan?.race_date).toBe(futureRace.race_date);
  expect(plan?.weeks).toBeGreaterThan(2);

  const futureRow = page.getByTestId('race-row').filter({ hasText: 'E2E prolećni polumaraton' });
  await expect(futureRow.getByText('Cilj plana')).toBeVisible();

  await page.goto('/today');
  await expect(page.getByTestId('race-chip')).toContainText('E2E prolećni polumaraton');
});
