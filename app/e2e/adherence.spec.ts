import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { completeOnboarding, register, uniqueEmail } from './helpers';

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

type NodeClient = Awaited<ReturnType<typeof clientFor>>;

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

function startOfWeekIso(iso: string): string {
  return addDaysIso(iso, -weekdayIndex(iso));
}

interface WeekWorkout {
  id: string;
  workout_date: string;
}

async function workoutsForWeek(client: NodeClient, weekStart: string): Promise<WeekWorkout[]> {
  const weekEnd = addDaysIso(weekStart, 6);
  const { data: plan, error: planError } = await client.from('plans').select('id').eq('status', 'ACTIVE').single();
  expect(planError).toBeNull();
  if (!plan) throw new Error('active plan missing');
  const { data: workouts, error: workoutsError } = await client
    .from('workouts')
    .select('id, workout_date, type, status')
    .eq('plan_id', plan.id)
    .neq('type', 'REST')
    .order('workout_date')
    .order('id');
  expect(workoutsError).toBeNull();
  const inWeek: WeekWorkout[] = (workouts ?? []).filter(
    (workout) => workout.workout_date >= weekStart && workout.workout_date <= weekEnd,
  );
  const movable = (workouts ?? []).filter((workout) => workout.workout_date > weekEnd);
  for (let index = 0; inWeek.length < 2 && index < movable.length; index++) {
    const { data: moved, error } = await client
      .from('workouts')
      .update({ workout_date: addDaysIso(weekStart, index) })
      .eq('id', movable[index].id)
      .select('id, workout_date')
      .single();
    expect(error).toBeNull();
    if (moved) inWeek.push(moved);
  }
  expect(inWeek.length).toBeGreaterThanOrEqual(2);
  return inWeek;
}

async function completeAll(client: NodeClient, workouts: WeekWorkout[], distanceKmPerRun: number): Promise<number> {
  const { data: userData, error: userError } = await client.auth.getUser();
  expect(userError).toBeNull();
  if (!userData.user) throw new Error('user missing');
  for (const workout of workouts) {
    const { error: updateError } = await client.from('workouts').update({ status: 'DONE' }).eq('id', workout.id);
    expect(updateError).toBeNull();
    const { error: logError } = await client.from('run_logs').insert({
      user_id: userData.user.id,
      workout_id: workout.id,
      log_date: workout.workout_date,
      distance_km: distanceKmPerRun,
      duration_sec: 1800,
    });
    expect(logError).toBeNull();
  }
  return workouts.length * distanceKmPerRun;
}

async function insertLooseRun(client: NodeClient, logDate: string, distanceKm: number): Promise<void> {
  const { data: userData, error: userError } = await client.auth.getUser();
  expect(userError).toBeNull();
  if (!userData.user) throw new Error('user missing');
  const { error } = await client.from('run_logs').insert({
    user_id: userData.user.id,
    log_date: logDate,
    distance_km: distanceKm,
    duration_sec: 3600,
  });
  expect(error).toBeNull();
}

async function makeProfilePrivate(client: NodeClient): Promise<void> {
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return;
  const { error } = await client.from('profiles').update({ public_profile: false }).eq('id', userData.user.id);
  expect(error).toBeNull();
}

function rowIndex(texts: string[], name: string): number {
  return texts.findIndex((text) => text.includes(name));
}

test('rang lista prati pridržavanje plana', async ({ browser }) => {
  const contextA = await browser.newContext({ locale: 'sr-Latn-RS', colorScheme: 'dark' });
  const contextB = await browser.newContext({ locale: 'sr-Latn-RS', colorScheme: 'dark' });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const emailA = uniqueEmail('adherence-a');
  const emailB = uniqueEmail('adherence-b');
  const nameA = `Ada Pridržna ${suffix}`;
  const nameB = `Bojan Labavi ${suffix}`;
  let clientA: NodeClient | undefined;
  let clientB: NodeClient | undefined;

  try {
    await register(pageA, emailA, nameA);
    await completeOnboarding(pageA);
    await register(pageB, emailB, nameB);
    await completeOnboarding(pageB);

    for (const page of [pageA, pageB]) {
      await page.goto('/settings/profile');
      await page.getByTestId('public-profile').getByRole('button', { name: 'Javno' }).click();
      await page.getByRole('button', { name: 'Sačuvaj profil' }).click();
      await expect(page.getByText('Profil je sačuvan.')).toBeVisible();
    }

    await pageA.goto('/friends');
    await pageA.getByLabel('Ime profila').fill(nameB);
    await pageA.getByTestId('friend-add-submit').click();
    await expect(pageA.getByText('Zahtev je poslat.')).toBeVisible();
    await pageB.goto('/friends');
    await expect(pageB.getByTestId('friend-request-row')).toContainText(nameA);
    await pageB.getByTestId('friend-request-accept').click();
    await expect(pageB.getByTestId('friend-row')).toContainText(nameA);

    const weekStart = startOfWeekIso(todayIso());
    clientA = await clientFor(emailA);
    clientB = await clientFor(emailB);
    const finishedA = await completeAll(clientA, await workoutsForWeek(clientA, weekStart), 5);
    await workoutsForWeek(clientB, weekStart);
    await insertLooseRun(clientB, weekStart, finishedA + 50);

    await pageA.goto('/leaderboard');
    await pageA.getByRole('button', { name: 'Pridržavanje' }).click();
    const rows = pageA.getByTestId('leaderboard-row');
    await expect(rows.filter({ hasText: nameA })).toContainText('100%');

    await pageA.getByRole('button', { name: 'Prijatelji' }).click();
    const friendRows = pageA.getByTestId('friends-leaderboard-row');
    await expect(friendRows).toHaveCount(2);
    await expect(friendRows.filter({ hasText: nameA })).toContainText('100%');
    await expect(friendRows.filter({ hasText: nameB })).toContainText('0%');
    const adherenceOrder = await friendRows.evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
    expect(rowIndex(adherenceOrder, nameA)).toBeLessThan(rowIndex(adherenceOrder, nameB));

    await pageA.getByRole('button', { name: 'Kilometraža' }).click();
    await expect(friendRows.filter({ hasText: nameB })).toContainText(`${finishedA + 50} km`);
    const distanceOrder = await friendRows.evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
    expect(rowIndex(distanceOrder, nameB)).toBeLessThan(rowIndex(distanceOrder, nameA));
  } finally {
    for (const client of [clientA, clientB]) {
      if (client) await makeProfilePrivate(client);
    }
    await contextA.close();
    await contextB.close();
  }
});
