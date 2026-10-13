import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

interface MockReadiness {
  sleepHours?: number | null;
  restingHr?: number | null;
  hrv?: number | null;
}

async function stubReadiness(page: Page, readiness: MockReadiness) {
  await page.addInitScript((mock) => {
    window.__runcastHealthMock = { available: 'available', runs: [], readiness: mock };
    localStorage.setItem('runcast.readiness.autosync', 'on');
  }, readiness);
}

test('readiness: dobar san prikazuje karticu sa nivoom', async ({ page }) => {
  await stubReadiness(page, { sleepHours: 7.5, restingHr: 48, hrv: 62 });
  await register(page, uniqueEmail('readiness-fresh'));
  await completeOnboarding(page);

  await expect(page.getByTestId('readiness-card')).toBeVisible();
  await expect(page.getByTestId('readiness-level')).toContainText('Svež');
  await expect(page.getByTestId('readiness-sleep')).toContainText('7,5');
});

test('readiness: kratak san prikazuje Umoran i hint', async ({ page }) => {
  await stubReadiness(page, { sleepHours: 5 });
  await register(page, uniqueEmail('readiness-tired'));
  await completeOnboarding(page);

  await expect(page.getByTestId('readiness-card')).toBeVisible();
  await expect(page.getByTestId('readiness-level')).toContainText('Umoran');
  await expect(page.getByTestId('readiness-card')).toContainText('San je bio kratak');
});

test('readiness: bez mocka na webu kartica je sakrivena', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('runcast.readiness.autosync', 'on'));
  await register(page, uniqueEmail('readiness-web'));
  await completeOnboarding(page);

  await expect(page.getByTestId('readiness-card')).toHaveCount(0);
  await expect(page.getByTestId('readiness-skeleton')).toHaveCount(0);
});

test('readiness: toggle u podešavanjima se čuva', async ({ page }) => {
  await register(page, uniqueEmail('readiness-toggle'));
  await completeOnboarding(page);

  await page.goto('/settings/health');
  const control = page.getByTestId('readiness-autosync');
  await control.getByRole('button', { name: 'Uključeno', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('runcast.readiness.autosync'))).toBe('on');

  await page.reload();
  await expect(control.getByRole('button', { name: 'Uključeno', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
