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

function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

function startOfWeekIso(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - weekdayIndex(iso));
  return date.toISOString().slice(0, 10);
}

test('poravnaj ostatak plana: propušteni postaju SKIPPED, plan ostaje u nedeljama', async ({ page }) => {
  await mockWeather(page);
  const email = uniqueEmail('realign');
  await register(page, email);
  await completeOnboarding(page);

  const supabase = await clientFor(email);
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, long_run_day')
    .eq('status', 'ACTIVE')
    .single();
  expect(planError).toBeNull();
  if (!plan) throw new Error('active plan missing');

  const { data: before } = await supabase
    .from('workouts')
    .select('id, workout_date, type, status')
    .eq('plan_id', plan.id);
  const beforeDates = new Map((before ?? []).map((workout) => [workout.id, workout.workout_date]));

  const movable = (before ?? [])
    .filter((workout) => workout.status === 'PLANNED' && workout.type !== 'REST' && workout.type !== 'LONG')
    .sort((a, b) => a.workout_date.localeCompare(b.workout_date) || a.id.localeCompare(b.id))
    .slice(0, 3);
  expect(movable).toHaveLength(3);

  const pastDates = [isoFromNow(-2), isoFromNow(-3), isoFromNow(-4)];
  for (let index = 0; index < movable.length; index++) {
    const { error } = await supabase
      .from('workouts')
      .update({ workout_date: pastDates[index] })
      .eq('id', movable[index].id);
    expect(error).toBeNull();
  }
  const { error: planUpdateError } = await supabase
    .from('plans')
    .update({ start_date: isoFromNow(-14) })
    .eq('id', plan.id);
  expect(planUpdateError).toBeNull();

  await page.goto('/plan');
  const card = page.getByTestId('realign-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Propustio si 3 treninga');
  await expect(page.getByTestId('adapt-week')).toBeHidden();

  await card.getByTestId('realign-apply').click();
  await expect(page.getByTestId('realign-notice')).toHaveText('Plan je poravnat.');
  await expect(page.getByTestId('realign-card')).toBeHidden();

  const { data: after } = await supabase
    .from('workouts')
    .select('id, workout_date, type, status')
    .eq('plan_id', plan.id);
  const skipped = (after ?? [])
    .filter((workout) => workout.status === 'SKIPPED')
    .map((workout) => workout.id)
    .sort();
  expect(skipped).toEqual(movable.map((workout) => workout.id).sort());

  for (const workout of after ?? []) {
    if (workout.status !== 'PLANNED' || workout.type === 'REST') continue;
    const original = beforeDates.get(workout.id);
    expect(original).toBeDefined();
    expect(startOfWeekIso(workout.workout_date)).toBe(startOfWeekIso(original as string));
  }

  const longRuns = (after ?? []).filter((workout) => workout.status === 'PLANNED' && workout.type === 'LONG');
  expect(longRuns.length).toBeGreaterThan(0);
  for (const longRun of longRuns) expect(weekdayIndex(longRun.workout_date)).toBe(plan.long_run_day);
});
