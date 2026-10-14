import { expect, test } from '@playwright/test';
import { assertNoHorizontalOverflow, completeOnboarding, register, uniqueEmail } from './helpers';

test('dan trke — čip sa Today vodi na plan tempa i checklistu', async ({ page }) => {
  const email = uniqueEmail('raceday');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByTestId('race-chip').click();
  await page.waitForURL('**/race-day');
  await expect(page.getByText('Dan trke', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E maraton' })).toBeVisible();

  const plan = page.getByTestId('pace-plan');
  await expect(plan).toBeVisible();
  await expect(plan.getByText('5-10 km')).toBeVisible();

  const firstPace = page.getByTestId('split-row').first().locator('td').nth(1);
  const evenPace = await firstPace.innerText();
  await page.getByRole('button', { name: 'Negativni split' }).click();
  await expect(firstPace).not.toHaveText(evenPace);

  const bib = page.getByLabel('Prikvači startni broj na majicu');
  await bib.check();
  await expect(bib).toBeChecked();
  await page.reload();
  await expect(page.getByLabel('Prikvači startni broj na majicu')).toBeChecked();

  await page.setViewportSize({ width: 320, height: 568 });
  await assertNoHorizontalOverflow(page, '320 /race-day');
});

test('RACE trening vodi na strategiju za dan trke', async ({ page }) => {
  const email = uniqueEmail('raceday-race');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');

  const raceLink = page.locator('a[aria-label*="TRKA"]').first();
  await expect
    .poll(
      async () => {
        if ((await raceLink.count()) > 0) return true;
        await page.getByRole('button', { name: 'Sledeći mesec' }).click();
        return false;
      },
      { timeout: 30_000, intervals: [1500] },
    )
    .toBe(true);
  await raceLink.click();
  await page.waitForURL('**/workout/**');
  await expect(page.getByText('Koraci')).toBeVisible();

  await page.getByTestId('race-day-link').click();
  await page.waitForURL('**/race-day');
  await expect(page.getByTestId('pace-plan')).toBeVisible();
});
