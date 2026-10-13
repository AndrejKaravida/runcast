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

function monthTypes(page: Page, month: string) {
  return page.locator('[data-testid="cal-cell"]').evaluateAll(
    (cells, prefix) =>
      cells
        .filter((cell) => (cell.getAttribute('data-date') ?? '').startsWith(prefix))
        .map((cell) => cell.getAttribute('data-type') ?? '')
        .filter((type) => type !== ''),
    month,
  );
}

test('posle trke: plan oporavka sa 2 nedelje EASY/MOBILITY treninga', async ({ page }) => {
  await mockWeather(page);
  const email = uniqueEmail('recovery');
  await register(page, email);
  await completeOnboarding(page);

  const supabase = await clientFor(email);
  const { data: race, error: raceError } = await supabase
    .from('races')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  expect(raceError).toBeNull();
  if (!race) throw new Error('race missing');
  const { error: raceUpdateError } = await supabase
    .from('races')
    .update({ race_date: isoFromNow(-1) })
    .eq('id', race.id);
  expect(raceUpdateError).toBeNull();

  await page.goto('/plan');
  const card = page.getByTestId('recovery-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Čestitamo na trci!');
  await expect(card).toContainText('plan oporavka (2 nedelje)');

  await card.getByTestId('recovery-generate').click();
  await expect(page.getByTestId('recovery-notice')).toHaveText('Plan oporavka je spreman.');
  await expect(page.getByTestId('recovery-card')).toBeHidden();

  const { data: plan } = await supabase
    .from('plans')
    .select('id, weeks, race_id, start_date, race_date')
    .eq('status', 'ACTIVE')
    .single();
  if (!plan) throw new Error('active plan missing');
  expect(plan.weeks).toBe(2);
  expect(plan.race_id).toBeNull();

  const { data: workouts } = await supabase.from('workouts').select('type, workout_date').eq('plan_id', plan.id);
  const types = (workouts ?? []).map((workout) => workout.type);
  expect(types.filter((type) => type === 'EASY')).toHaveLength(6);
  expect(types.filter((type) => type === 'STRENGTH')).toHaveLength(2);
  expect(types.every((type) => type === 'EASY' || type === 'STRENGTH')).toBe(true);

  const currentMonth = plan.start_date.slice(0, 7);
  const first = await monthTypes(page, currentMonth);
  let second: string[] = [];
  if (plan.race_date.slice(0, 7) !== currentMonth) {
    await page.getByRole('button', { name: 'Sledeći mesec' }).click();
    await expect(page.locator(`[data-testid="cal-cell"][data-date="${plan.race_date}"]`)).toBeVisible();
    second = await monthTypes(page, plan.race_date.slice(0, 7));
  }
  const calendarTypes = [...first, ...second];
  expect(calendarTypes.filter((type) => type === 'EASY')).toHaveLength(6);
  expect(calendarTypes.filter((type) => type === 'STRENGTH')).toHaveLength(2);
  expect(calendarTypes.every((type) => type === 'EASY' || type === 'STRENGTH')).toBe(true);
});
