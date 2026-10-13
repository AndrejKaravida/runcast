import { expect, test } from '@playwright/test';
import {
  assertNoHorizontalOverflow,
  completeOnboarding,
  isoFromNow,
  mockGeocoding,
  register,
  uniqueEmail,
} from './helpers';

const VIEWPORTS = [
  { name: 'small-320', width: 320, height: 568 },
  { name: 'phone-375', width: 375, height: 667 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

test('nema horizontalnog overflow-a na svim stranama i veličinama', async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page, uniqueEmail('resp'));
  await completeOnboarding(page);

  await page.goto('/plan');
  const workoutHref = await page.locator('[data-testid="week-row"][href^="/workout/"]').first().getAttribute('href');
  const workoutId = workoutHref?.split('/').pop() ?? '';
  expect(workoutId).not.toBe('');

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of ['/today', '/plan', '/stats', '/settings', `/workout/${workoutId}`]) {
      await page.goto(route);
      await expect(page.locator('main, h1, [role="dialog"]').first()).toBeVisible();
      await page.waitForTimeout(150);
      await assertNoHorizontalOverflow(page, `${viewport.name} ${route}`);
    }

    await page.goto('/today');
    await page.getByTestId('log-done').click();
    await expect(page.getByText('Zabeleži trening')).toBeVisible();
    await assertNoHorizontalOverflow(page, `${viewport.name} log modal`);
    await page.keyboard.press('Escape');
    await expect(page.getByText('Zabeleži trening')).toBeHidden();
  }

  const anonymous = await browser.newContext({ viewport: { width: 320, height: 568 } });
  const anonymousPage = await anonymous.newPage();
  for (const route of ['/login', '/register', '/forgot-password']) {
    await anonymousPage.goto(route);
    await expect(anonymousPage.locator('form, h1').first()).toBeVisible();
    await assertNoHorizontalOverflow(anonymousPage, `320 ${route}`);
  }
  await anonymous.close();
});

test('onboarding wizard nema overflow na 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockGeocoding(page);
  await register(page, uniqueEmail('wizard'));

  await page.getByLabel('Naziv trke (opciono)').fill('Beogradski maraton 2027');
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(126));
  await assertNoHorizontalOverflow(page, 'korak 1 cilj');
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel(/Ciljno vreme/).fill('3:45:00');
  await expect(page.getByText(/VDOT 4/)).toBeVisible();
  await assertNoHorizontalOverflow(page, 'korak 2 tempo');
  await page.getByRole('button', { name: 'Dalje' }).click();

  await assertNoHorizontalOverflow(page, 'korak 3 iskustvo');
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel('Dan dugog trčanja').selectOption('6');
  await assertNoHorizontalOverflow(page, 'korak 4 raspored');
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel('Grad', { exact: true }).fill('Novi Sad');
  await page.getByRole('button', { name: 'Traži' }).click();
  await page
    .getByRole('button', { name: /Novi Sad/ })
    .first()
    .click();
  await assertNoHorizontalOverflow(page, 'korak 5 lokacija');
  await page.getByRole('button', { name: 'Dalje' }).click();

  await assertNoHorizontalOverflow(page, 'korak 6 pregled');
  await page.getByRole('button', { name: 'Generiši plan' }).click();
  await page.waitForURL('**/today');
  await assertNoHorizontalOverflow(page, '320 /today posle wizarda');
});
