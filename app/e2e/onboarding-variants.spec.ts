import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { isoFromNow, mockGeocoding, register, uniqueEmail } from './helpers';

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

async function activePlan(client: Awaited<ReturnType<typeof clientFor>>) {
  const { data: plan, error } = await client
    .from('plans')
    .select('id, race_id, anchor, paces, experience, volume_band, weeks')
    .eq('status', 'ACTIVE')
    .single();
  expect(error).toBeNull();
  if (!plan) throw new Error('active plan missing');
  return plan;
}

async function planTypes(client: Awaited<ReturnType<typeof clientFor>>, planId: string): Promise<string[]> {
  const { data, error } = await client.from('workouts').select('type').eq('plan_id', planId);
  expect(error).toBeNull();
  return (data ?? []).map((workout) => workout.type);
}

async function raceStep(page: Page, distanceKm?: string) {
  await page.getByLabel('Naziv trke (opciono)').fill('E2E varijanta');
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(126));
  if (distanceKm) await page.getByLabel('Distanca').selectOption(distanceKm);
  await page.getByRole('button', { name: 'Dalje' }).click();
}

async function scheduleStep(page: Page) {
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByLabel('Dan dugog trčanja').selectOption(String((new Date().getDay() + 6) % 7));
  await page.getByRole('button', { name: 'Dalje' }).click();
}

async function locationStep(page: Page) {
  await page.getByLabel('Grad', { exact: true }).fill('Novi Sad');
  await page.getByRole('button', { name: 'Traži' }).click();
  await page
    .getByRole('button', { name: /Novi Sad/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Dalje' }).click();
}

test('bez trke: bazni plan bez kvalitetnih treninga i bez trke u bazi', async ({ page }) => {
  const email = uniqueEmail('ob-baza');
  await mockGeocoding(page);
  await register(page, email);

  await page.getByRole('button', { name: 'Još nemam' }).click();
  await expect(page.getByText(/bazni plan za narednih 8 nedelja/)).toBeVisible();
  await page.getByRole('button', { name: 'Dalje' }).click();
  await expect(page.getByText(/Bez rezultata dobijaš bazni plan/)).toBeVisible();
  await page.getByRole('button', { name: 'Dalje' }).click();
  await scheduleStep(page);
  await locationStep(page);

  await expect(page.getByText('Bazni plan · 8 nedelja')).toBeVisible();
  await expect(page.getByText(/samo lagani treninzi/)).toBeVisible();
  await page.getByRole('button', { name: 'Generiši plan' }).click();
  await page.waitForURL('**/today');

  await expect(page.getByTestId('race-chip')).toContainText('Nedelja 1 /');

  const client = await clientFor(email);
  const plan = await activePlan(client);
  expect(plan.race_id).toBeNull();
  expect(plan.anchor).toBeNull();
  expect(plan.paces).toBeNull();

  const { data: races, error: racesError } = await client.from('races').select('id');
  expect(racesError).toBeNull();
  expect(races).toEqual([]);

  const types = new Set(await planTypes(client, plan.id));
  expect(types.has('EASY')).toBe(true);
  for (const quality of QUALITY_TYPES) expect(types.has(quality)).toBe(false);
});

test('samo poslednja trka: VDOT iz rezultata, plan vezan za trku bez ciljnog vremena', async ({ page }) => {
  const email = uniqueEmail('ob-recent');
  await mockGeocoding(page);
  await register(page, email);

  await raceStep(page);
  await page.getByLabel('Poslednja trka').selectOption('10');
  await page.getByLabel('Vreme (mm:ss)').fill('50:00');
  await expect(page.getByText(/VDOT 4/)).toBeVisible();
  await expect(page.getByText(/\/km/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Dalje' }).click();
  await scheduleStep(page);
  await locationStep(page);

  await expect(page.getByText(/samo lagani treninzi/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Generiši plan' }).click();
  await page.waitForURL('**/today');

  const client = await clientFor(email);
  const plan = await activePlan(client);
  expect(plan.anchor).toMatchObject({ kind: 'race', distanceKm: 10, timeSec: 3000 });
  expect(plan.paces).not.toBeNull();

  const { data: race, error: raceError } = await client.from('races').select('id, distance_km, goal_time_sec').single();
  expect(raceError).toBeNull();
  expect(race?.goal_time_sec).toBeNull();
  expect(race?.distance_km).toBe(42.2);
  expect(plan.race_id).toBe(race?.id);
});

test('trka 10 km: distanca i ciljno vreme se čuvaju, preview pokazuje VDOT', async ({ page }) => {
  const email = uniqueEmail('ob-10k');
  await mockGeocoding(page);
  await register(page, email);

  await raceStep(page, '10');
  await page.getByLabel(/Ciljno vreme/).fill('50:00');
  await expect(page.getByText(/VDOT 4/)).toBeVisible();
  await page.getByRole('button', { name: 'Dalje' }).click();
  await scheduleStep(page);
  await locationStep(page);
  await page.getByRole('button', { name: 'Generiši plan' }).click();
  await page.waitForURL('**/today');

  const client = await clientFor(email);
  const plan = await activePlan(client);
  expect(plan.anchor).toMatchObject({ kind: 'goal', distanceKm: 10, timeSec: 3000 });

  const { data: race, error: raceError } = await client.from('races').select('id, distance_km, goal_time_sec').single();
  expect(raceError).toBeNull();
  expect(race?.distance_km).toBe(10);
  expect(race?.goal_time_sec).toBe(3000);
  expect(plan.race_id).toBe(race?.id);
});

test('iskusan sa velikim volumenom: profil i plan čuvaju izbor', async ({ page }) => {
  const email = uniqueEmail('ob-iskusan');
  await mockGeocoding(page);
  await register(page, email);

  await raceStep(page);
  await page.getByLabel(/Ciljno vreme/).fill('3:45:00');
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByRole('button', { name: 'Iskusan' }).click();
  await page.getByLabel('Koliko kilometara prelaziš nedeljno?').selectOption({ label: 'preko 60 km' });
  await page.getByRole('button', { name: 'Dalje' }).click();
  await page.getByLabel('Dan dugog trčanja').selectOption(String((new Date().getDay() + 6) % 7));
  await page.getByRole('button', { name: 'Dalje' }).click();
  await locationStep(page);
  await page.getByRole('button', { name: 'Generiši plan' }).click();
  await page.waitForURL('**/today');

  const client = await clientFor(email);
  const { data: user } = await client.auth.getUser();
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('experience, volume_band, onboarding_completed')
    .eq('id', user?.user?.id ?? '')
    .single();
  expect(profileError).toBeNull();
  expect(profile?.experience).toBe('experienced');
  expect(profile?.volume_band).toBe('gt60');
  expect(profile?.onboarding_completed).toBe(true);

  const plan = await activePlan(client);
  expect(plan.experience).toBe('experienced');
  expect(plan.volume_band).toBe('gt60');
});
