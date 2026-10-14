import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { completeOnboarding, register, sunnyFixture, uniqueEmail } from './helpers';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const FAKE_LOCAL_NIGHT = new Date('2026-01-05T23:30:00-05:00');
const FAKE_TODAY = '2026-01-05';
const FAKE_UTC_DAY = '2026-01-06';
const FAKE_RACE_DATE = '2026-05-11';

test.use({ timezoneId: 'America/New_York' });

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

test('dani ostaju na lokalnom datumu kada je blizu lokalne ponoći', async ({ page }) => {
  await mockWeather(page);
  await page.clock.install({ time: FAKE_LOCAL_NIGHT });

  const email = uniqueEmail('dates-today');
  await register(page, email);
  await completeOnboarding(page, FAKE_RACE_DATE);

  const browserDay = await page.evaluate(() => new Date().toLocaleDateString('sv-SE'));
  const browserUtcDay = await page.evaluate(() => new Date().toISOString().slice(0, 10));
  expect(browserDay).toBe(FAKE_TODAY);
  expect(browserUtcDay).toBe(FAKE_UTC_DAY);

  const supabase = await clientFor(email);
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, start_date, race_date')
    .eq('status', 'ACTIVE')
    .single();
  expect(planError).toBeNull();
  expect(plan?.start_date).toBe(FAKE_TODAY);
  expect(plan?.race_date).toBe(FAKE_RACE_DATE);

  const { data: workouts, error: workoutsError } = await supabase
    .from('workouts')
    .select('workout_date')
    .eq('plan_id', plan?.id as string);
  expect(workoutsError).toBeNull();
  const dates = (workouts ?? []).map((workout) => workout.workout_date);
  expect(dates).toContain(FAKE_TODAY);
  for (const date of dates) expect(date >= FAKE_TODAY).toBe(true);

  await page.goto('/today');
  await expect(page.getByTestId('today-workout-title')).toBeVisible();
});

test('upisan trening dobija log_date lokalnog dana', async ({ page }) => {
  await mockWeather(page);
  await page.clock.install({ time: FAKE_LOCAL_NIGHT });

  const email = uniqueEmail('dates-log');
  await register(page, email);
  await completeOnboarding(page, FAKE_RACE_DATE);

  const supabase = await clientFor(email);
  const { data: plan } = await supabase.from('plans').select('id').eq('status', 'ACTIVE').single();
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, workout_date')
    .eq('plan_id', plan?.id as string);
  const todayWorkout = (workouts ?? []).find((workout) => workout.workout_date === FAKE_TODAY);
  if (!todayWorkout) throw new Error('today workout missing');
  const { error: updateError } = await supabase
    .from('workouts')
    .update({ type: 'EASY', status: 'PLANNED', distance_km: 8, duration_sec: null })
    .eq('id', todayWorkout.id);
  expect(updateError).toBeNull();

  await page.goto('/today');
  await page.getByRole('button', { name: /Urađeno/ }).click();
  await expect(page.getByText('Zabeleži trening')).toBeVisible();
  await page.getByLabel(/Trajanje/).fill('60:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Zabeleži trening')).toBeHidden();

  const { data: logs, error: logsError } = await supabase.from('run_logs').select('log_date');
  expect(logsError).toBeNull();
  expect(logs).toHaveLength(1);
  expect(logs?.[0].log_date).toBe(FAKE_TODAY);
});
