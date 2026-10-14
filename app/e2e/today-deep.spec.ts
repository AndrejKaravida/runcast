import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { completeOnboarding, isoFromNow, register, sunnyFixture, uniqueEmail } from './helpers';

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

async function mockSunny(page: import('@playwright/test').Page) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: sunnyFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));
}

test('dnevnik sa RPE i beleškom ostaje na treningu i u izveštaju', async ({ page }) => {
  await mockSunny(page);
  const email = uniqueEmail('dnevnik');
  await register(page, email);
  await completeOnboarding(page);

  const detailsHref = await page.getByTestId('today-hero').locator('a[href^="/workout/"]').first().getAttribute('href');
  expect(detailsHref).toMatch(/^\/workout\//);

  await page.getByTestId('log-done').click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeVisible();
  await page.getByLabel('Distanca (km)').fill('8');
  await page.getByLabel(/Trajanje/).fill('48:00');
  const rpe = page.locator('#log-rpe');
  await rpe.focus();
  for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowRight');
  await expect(rpe).toHaveValue('8');
  await page.getByLabel(/Beleška/).fill('Snažno veče');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeHidden();

  await expect(page.getByTestId('today-hero').getByText('Urađeno', { exact: true })).toBeVisible();
  const recent = page.getByTestId('recent-activity');
  await expect(recent).toContainText('8 km');
  await expect(recent).toContainText('6:00 /km');
  await expect(recent).toContainText('RPE 8');

  await page.goto(detailsHref ?? '');
  const logged = page.getByText('Zabeleženo');
  await expect(logged).toBeVisible();
  await expect(page.getByText('8 km', { exact: true })).toBeVisible();
  await expect(page.getByText('48:00', { exact: true })).toBeVisible();
  await expect(page.getByText('6:00 /km', { exact: true })).toBeVisible();
  await expect(page.getByText('RPE 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Snažno veče')).toBeVisible();

  const client = await clientFor(email);
  const { data: logs, error } = await client
    .from('run_logs')
    .select('distance_km, duration_sec, rpe, notes, avg_pace_sec_per_km, source')
    .order('created_at', { ascending: false });
  expect(error).toBeNull();
  expect(logs).toHaveLength(1);
  expect(logs?.[0]).toMatchObject({
    distance_km: 8,
    duration_sec: 2880,
    rpe: 8,
    notes: 'Snažno veče',
    avg_pace_sec_per_km: 360,
    source: 'manual',
  });
});

test('nedeljna tabla: kilometraža i broj završenih treninga rastu posle dnevnika', async ({ page }) => {
  await mockSunny(page);
  const email = uniqueEmail('nedelja');
  await register(page, email);
  await completeOnboarding(page);

  const client = await clientFor(email);
  const { data: workout, error } = await client
    .from('workouts')
    .select('id, distance_km, status')
    .eq('workout_date', isoFromNow(0))
    .single();
  expect(error).toBeNull();
  if (!workout) throw new Error('today workout missing');
  expect(workout.status).toBe('PLANNED');

  const board = page.getByTestId('week-board');
  await expect(page.getByTestId('weekly-km')).toContainText('0 /');
  await expect(board.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

  await page.getByTestId('log-done').click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeVisible();
  await page.getByLabel(/Trajanje/).fill('40:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeHidden();

  await expect(page.getByTestId('weekly-km')).toContainText(`${workout.distance_km} /`);
  await expect(board.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(board.getByText(/^1\/\d+$/)).toBeVisible();

  await page.reload();
  await expect(board.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByTestId('weekly-km')).toContainText(`${workout.distance_km} /`);
});
