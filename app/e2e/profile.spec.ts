import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test('avatar upload se čuva i prikazuje', async ({ page }) => {
  const email = uniqueEmail('avatar');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings/profile');
  await page.setInputFiles('[data-testid="avatar-input"]', 'e2e/fixtures/avatar.png');

  const avatar = page.locator('img[alt="Avatar"]');
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute('src', /\/storage\/v1\/object\/public\/avatars\/[0-9a-f-]+\/avatar\.jpg\?v=\d+/);
  const savedSrc = await avatar.getAttribute('src');

  await page.reload();
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute('src', savedSrc as string);
});

test('javni profil uključuje i isključuje rang listu', async ({ page }) => {
  const email = uniqueEmail('rank');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/leaderboard');
  await expect(page.getByText('Rang lista je još prazna')).toBeVisible();

  await page.goto('/today');
  await page.getByRole('button', { name: /Urađeno/ }).click();
  await page.getByLabel(/Trajanje/).fill('50:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Zabeleži trening')).toBeHidden();

  await page.goto('/settings/profile');
  await page.getByTestId('public-profile').getByRole('button', { name: 'Javno' }).click();
  await page.getByRole('button', { name: 'Sačuvaj profil' }).click();
  await expect(page.getByText('Profil je sačuvan.')).toBeVisible();

  await page.getByRole('link', { name: 'Otvori rang listu' }).click();
  await page.waitForURL('**/leaderboard');

  const rows = page.getByTestId('leaderboard-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('E2E Trkač');
  await expect(rows.first()).toContainText('Ti');
  await expect(rows.first()).toContainText('km');
  await expect(rows.first()).toContainText('trening');
  await expect(page.getByText(/^Ti si #\d+ ove nedelje\.$/)).toBeVisible();
  expect(await page.content()).not.toContain(email);

  await page.goto('/stats');
  await page.getByRole('link', { name: 'Rang lista' }).click();
  await page.waitForURL('**/leaderboard');
  await expect(rows.first()).toContainText('E2E Trkač');

  await page.goto('/settings/profile');
  await page.getByTestId('public-profile').getByRole('button', { name: 'Privatno' }).click();
  await page.getByRole('button', { name: 'Sačuvaj profil' }).click();
  await expect(page.getByText('Profil je sačuvan.')).toBeVisible();

  await page.goto('/leaderboard');
  await expect(page.getByText('Rang lista je još prazna')).toBeVisible();
});
