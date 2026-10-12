import { expect, test } from '@playwright/test';
import { assertNoHorizontalOverflow, completeOnboarding, register, uniqueEmail } from './helpers';

test('vođeno trčanje — deterministički tok sa timeScale', async ({ page }) => {
  const email = uniqueEmail('guided');
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
  const workoutId = workoutHref?.split('/').pop() ?? '';
  expect(workoutId).not.toBe('');

  await page.goto(`/workout/${workoutId}`);
  const guidedHref = await page.getByTestId('start-guided').getAttribute('href');
  expect(guidedHref).toBe(`/run/${workoutId}`);

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`${guidedHref}?timeScale=30`);
  await expect(page.getByText('Vođeno trčanje', { exact: true })).toBeVisible();
  await expect(page.getByText(/\d+ koraka/)).toBeVisible();
  await assertNoHorizontalOverflow(page, 'guided idle 320');

  await page.getByTestId('guided-start').click();
  await expect(page.getByTestId('guided-cue')).toContainText('Sledi', { timeout: 15_000 });
  const elapsedBefore = await page.getByTestId('guided-elapsed').textContent();
  await expect
    .poll(() => page.getByTestId('guided-elapsed').textContent(), { timeout: 15_000 })
    .not.toBe(elapsedBefore);
  await assertNoHorizontalOverflow(page, 'guided running 320');

  await page.getByTestId('guided-pause').click();
  await expect(page.getByTestId('guided-cue')).toContainText('Pauza');
  const pausedElapsed = await page.getByTestId('guided-elapsed').textContent();
  await page.waitForTimeout(700);
  expect(await page.getByTestId('guided-elapsed').textContent()).toBe(pausedElapsed);
  await page.getByTestId('guided-pause').click();

  const mute = page.getByTestId('guided-mute');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('guided-cue')).toContainText('Sledi');

  await expect(page.getByTestId('guided-back')).toBeDisabled();
  await page.getByTestId('guided-next').click();
  await expect(page.getByTestId('guided-cue')).toContainText('Ponavljanje 1 od 4');
  await expect(page.getByTestId('guided-back')).toBeEnabled();
  await page.getByTestId('guided-back').click();
  await expect(page.getByTestId('guided-cue')).toContainText('Sledi');

  await page.getByTestId('guided-finish').click();
  await expect(page.getByText('Završiti pre kraja?')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Završi' }).click();
  await expect(page.getByRole('heading', { name: 'Trening završen' })).toBeVisible();
  await assertNoHorizontalOverflow(page, 'guided finished 320');

  await page.getByTestId('guided-log').click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeVisible();
  await expect(page.getByLabel('Distanca (km)')).not.toHaveValue('');
  await expect(page.getByLabel(/Trajanje/)).not.toHaveValue('');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeHidden();

  await page.goto(`/workout/${workoutId}`);
  await expect(page.getByText('Zabeleženo')).toBeVisible();
  await expect(page.getByText('Urađeno', { exact: true })).toBeVisible();
});
