import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { defaultRunDays, escapeIcsText, generatePlan } from '@runcast/shared';
import {
  assertNoHorizontalOverflow,
  completeOnboarding,
  isoFromNow,
  rainFixture,
  register,
  uniqueEmail,
} from './helpers';

const encoder = new TextEncoder();
const REMOVE_ORDER = [6, 0, 1, 5, 3, 4, 2];

function onboardingRunDays(daysPerWeek: number, longRunDay: number): number[] {
  const next = [...new Set(defaultRunDays(4, 6))];
  if (!next.includes(longRunDay)) next.push(longRunDay);
  for (const day of REMOVE_ORDER) {
    if (next.length <= daysPerWeek) break;
    if (day === longRunDay) continue;
    const index = next.indexOf(day);
    if (index >= 0) next.splice(index, 1);
  }
  if (next.length < daysPerWeek) {
    for (const day of defaultRunDays(daysPerWeek, longRunDay)) {
      if (next.length >= daysPerWeek) break;
      if (!next.includes(day)) next.push(day);
    }
  }
  return next.sort((a, b) => a - b);
}

async function mockWeather(page: Page) {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: rainFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));
}

test('ICS izvoz — ceo plan u fajlu sa non-REST treninzima', async ({ page }) => {
  await mockWeather(page);
  const email = uniqueEmail('ics');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/plan');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Izvezi plan (.ics)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('runcast-plan.ics');
  await expect(page.getByText('Plan je izvezen.')).toBeVisible();

  const filePath = await download.path();
  if (!filePath) throw new Error('Preuzimanje nije dalo putanju');
  const content = await readFile(filePath, 'utf8');

  expect(content.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  expect(content).toContain('VERSION:2.0');
  expect(content).toContain('PRODID:-//RunCast//Plan Export 1.0//SR');
  expect(content.endsWith('END:VCALENDAR\r\n')).toBe(true);
  expect(content.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);

  for (const line of content.split('\r\n')) {
    expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
  }

  const unfolded = content.replace(/\r\n /g, '');
  const longRunDay = (new Date().getDay() + 6) % 7;
  const draft = generatePlan({
    raceDate: isoFromNow(126),
    startDate: isoFromNow(0),
    distanceKm: 42.195,
    daysPerWeek: 4,
    longRunDay,
    runDays: onboardingRunDays(4, longRunDay),
    experience: 'first',
    volumeBand: '20-40',
    anchor: { kind: 'goal', distanceKm: 42.195, timeSec: 3 * 3600 + 45 * 60 },
  });
  const expected = draft.workouts.filter((workout) => workout.type !== 'REST');
  expect(expected.length).toBeGreaterThan(0);

  const begins = unfolded.match(/BEGIN:VEVENT/g) ?? [];
  const ends = unfolded.match(/END:VEVENT/g) ?? [];
  const uids = unfolded.match(/UID:workout-[^@\r\n]+@runcast\.app/g) ?? [];
  expect(begins.length).toBe(expected.length);
  expect(ends.length).toBe(expected.length);
  expect(uids.length).toBe(expected.length);
  expect(new Set(uids).size).toBe(uids.length);
  expect(unfolded).not.toContain('SUMMARY:Odmor');
  expect(unfolded).toMatch(/SUMMARY:(Snaga|Mobilnost)/);

  const firstEasy = expected.find((workout) => workout.type === 'EASY');
  expect(firstEasy).toBeTruthy();
  const date = (firstEasy?.date ?? '').replace(/-/g, '');
  expect(unfolded).toContain(`DTSTART:${date}T070000`);
  expect(unfolded).toContain(`SUMMARY:${escapeIcsText(firstEasy?.title ?? '')}`);
});

test('Google kalendar — link samo za treninge koji nisu odmor', async ({ page }) => {
  await mockWeather(page);
  const email = uniqueEmail('ics-google');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');
  const easyLink = page.locator('a[aria-label*="Lako trčanje"]').first();
  await expect(easyLink).toBeVisible({ timeout: 15_000 });
  const label = (await easyLink.getAttribute('aria-label')) ?? '';
  const [date, title] = [label.split(':')[0], label.slice(label.indexOf(':') + 2)];
  const href = await easyLink.getAttribute('href');
  await page.goto(href ?? '');
  await page.waitForURL('**/workout/**');

  const google = page.getByTestId('add-google');
  await expect(google).toBeVisible();
  const googleHref = (await google.getAttribute('href')) ?? '';
  expect(googleHref).toContain('calendar.google.com/calendar/render?action=TEMPLATE');
  const url = new URL(googleHref);
  expect(url.searchParams.get('text')).toBe(title);
  const dates = url.searchParams.get('dates') ?? '';
  const [start, end] = dates.split('/');
  expect(start).toBe(`${date.replace(/-/g, '')}T070000`);
  expect(end).toMatch(/^\d{8}T\d{6}$/);
  expect(dates).not.toContain('Z');
  expect(url.searchParams.has('ctz')).toBe(false);

  await page.setViewportSize({ width: 320, height: 568 });
  await assertNoHorizontalOverflow(page, 'ics workout 320');

  await page.goto('/plan');
  const restLink = page.locator('a[aria-label*="Odmor"]').first();
  await expect(restLink).toBeVisible({ timeout: 15_000 });
  await page.goto((await restLink.getAttribute('href')) ?? '');
  await page.waitForURL('**/workout/**');
  await expect(page.getByRole('heading', { name: 'Odmor' })).toBeVisible();
  await expect(page.getByTestId('add-google')).toHaveCount(0);
});
