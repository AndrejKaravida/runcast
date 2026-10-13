import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { completeOnboarding, rainFixture, register, sunnyFixture, uniqueEmail } from './helpers';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const FAKE_MONDAY = '2026-01-05T10:00:00';
const FAKE_TODAY = '2026-01-05';
const FAKE_TOMORROW = '2026-01-06';
const FAKE_RACE_DATE = '2026-05-11';

interface MockReadiness {
  sleepHours?: number | null;
  restingHr?: number | null;
  hrv?: number | null;
}

async function stubReadiness(page: Page, readiness: MockReadiness) {
  await page.addInitScript((mock) => {
    window.__runcastHealthMock = { available: 'available', runs: [], readiness: mock };
    localStorage.setItem('runcast.readiness.autosync', 'on');
  }, readiness);
}

async function mockWeather(page: Page, fixture: () => unknown) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: fixture() }));
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

type NodeClient = Awaited<ReturnType<typeof clientFor>>;

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

async function planWorkouts(client: NodeClient): Promise<{ id: string; workout_date: string }[]> {
  const { data: plan, error: planError } = await client.from('plans').select('id').eq('status', 'ACTIVE').single();
  expect(planError).toBeNull();
  if (!plan) throw new Error('active plan missing');
  const { data, error } = await client
    .from('workouts')
    .select('id, workout_date')
    .eq('plan_id', plan.id)
    .order('workout_date');
  expect(error).toBeNull();
  return data ?? [];
}

async function setWorkout(client: NodeClient, id: string, type: string): Promise<void> {
  const { error } = await client.from('workouts').update({ type, status: 'PLANNED' }).eq('id', id);
  expect(error).toBeNull();
}

async function makeTodayQuality(client: NodeClient, today: string): Promise<void> {
  const workouts = await planWorkouts(client);
  const todayWorkout = workouts.find((workout) => workout.workout_date === today);
  if (!todayWorkout) throw new Error('today workout missing');
  await setWorkout(client, todayWorkout.id, 'TEMPO');
}

test('umoran uz kvalitetan trening: predlog zamene laganim danom radi', async ({ page }) => {
  await page.clock.install({ time: new Date(FAKE_MONDAY) });
  await stubReadiness(page, { sleepHours: 5 });
  await mockWeather(page, sunnyFixture);

  const email = uniqueEmail('readiness-swap');
  await register(page, email);
  await completeOnboarding(page, FAKE_RACE_DATE);

  const client = await clientFor(email);
  const workouts = await planWorkouts(client);
  const todayWorkout = workouts.find((workout) => workout.workout_date === FAKE_TODAY);
  const candidate = workouts.find((workout) => workout.workout_date === FAKE_TOMORROW);
  if (!todayWorkout || !candidate) throw new Error('week workouts missing');
  await setWorkout(client, todayWorkout.id, 'TEMPO');
  await setWorkout(client, candidate.id, 'EASY');

  await page.reload();

  const banner = page.getByTestId('readiness-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Umoran si');
  await expect(page.getByTestId('readiness-card')).not.toContainText('San je bio kratak');

  await page.getByTestId('readiness-swap-button').click();
  await expect(page.getByTestId('today-workout-title')).toHaveText(/^Lako trčanje/);
  await expect(page.getByTestId('readiness-banner')).toHaveCount(0);

  await page.goto('/plan');
  await expect(page.locator(`[data-testid="cal-cell"][data-date="${FAKE_TODAY}"]`)).toHaveAttribute(
    'data-type',
    'EASY',
  );
  await expect(page.locator(`[data-testid="cal-cell"][data-date="${FAKE_TOMORROW}"]`)).toHaveAttribute(
    'data-type',
    'TEMPO',
  );
});

test('svež: nema predloga zamene', async ({ page }) => {
  await stubReadiness(page, { sleepHours: 8, restingHr: 48, hrv: 62 });
  await mockWeather(page, sunnyFixture);

  const email = uniqueEmail('readiness-fresh');
  await register(page, email);
  await completeOnboarding(page);

  const client = await clientFor(email);
  await makeTodayQuality(client, todayLocal());

  await page.reload();

  await expect(page.getByTestId('readiness-card')).toContainText('Svež');
  await expect(page.getByTestId('readiness-banner')).toHaveCount(0);
  await expect(page.getByTestId('readiness-swap-button')).toHaveCount(0);
});

test('vremenski banner ima prioritet nad readiness predlogom', async ({ page }) => {
  await stubReadiness(page, { sleepHours: 5 });
  await mockWeather(page, rainFixture);

  const email = uniqueEmail('readiness-weather');
  await register(page, email);
  await completeOnboarding(page);

  const client = await clientFor(email);
  await makeTodayQuality(client, todayLocal());

  await page.reload();

  await expect(page.getByTestId('rain-banner')).toBeVisible();
  await expect(page.getByTestId('readiness-banner')).toHaveCount(0);
  await expect(page.getByTestId('readiness-swap-button')).toHaveCount(0);
});
