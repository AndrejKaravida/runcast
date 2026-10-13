import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test('TCX izvoz — interval trening sa koracima i pace targetima', async ({ page }) => {
  const email = uniqueEmail('tcx');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');

  const intervalLink = page.locator('a[aria-label*="Intervali"]').first();
  await expect
    .poll(
      async () => {
        if ((await intervalLink.count()) > 0) return true;
        await page.getByRole('button', { name: 'Sledeći mesec' }).click();
        return false;
      },
      { timeout: 30_000, intervals: [1500] },
    )
    .toBe(true);
  await expect(intervalLink).toBeVisible();
  const workoutHref = await intervalLink.getAttribute('href');
  expect(workoutHref).toMatch(/\/workout\//);

  await page.goto(workoutHref ?? '');
  await page.waitForURL('**/workout/**');
  await expect(page.getByTestId('export-tcx')).toBeVisible();

  const stepCount = await page.locator('ol > li').count();
  expect(stepCount).toBeGreaterThan(1);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-tcx').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-intervali-\d+-1000-m\.tcx$/);

  const filePath = await download.path();
  if (!filePath) throw new Error('Preuzimanje nije dalo putanju');
  const content = await readFile(filePath, 'utf8');

  expect(content.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
  expect(content).toContain('<TrainingCenterDatabase');
  expect(content).toContain('<Activity Sport="Running">');
  expect(content.endsWith('</TrainingCenterDatabase>\n')).toBe(true);

  const laps = content.match(/<Lap /g) ?? [];
  expect(laps.length).toBe(stepCount);
  expect(content).toContain('Order="1"');
  expect(content).toContain('<Intensity>Active</Intensity>');
  expect(content).toContain('<TotalTimeSeconds>');
  expect(content).toContain('<DistanceMeters>');

  const targets = content.match(/<Target>/g) ?? [];
  expect(targets.length).toBe(stepCount);
  expect(content).toContain('<SpeedZone>');
  expect(content).toMatch(/<MinSpeed>\d+(\.\d+)?<\/MinSpeed>/);
  expect(content).toMatch(/<MaxSpeed>\d+(\.\d+)?<\/MaxSpeed>/);
});
