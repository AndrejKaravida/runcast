import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test('oprema: kilometraža iz treninga, penzija i brisanje', async ({ page }) => {
  const email = uniqueEmail('gear');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/settings');
  const gear = page.getByTestId('gear-section');
  await expect(gear.getByTestId('gear-empty')).toBeVisible();

  await gear.getByLabel('Naziv patika').fill('Pegasus 41');
  await gear.getByLabel(/Početna kilometraža/).fill('100');
  await gear.getByRole('button', { name: 'Dodaj patike' }).click();
  const row = gear.getByTestId('shoe-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Pegasus 41');
  await expect(row.getByTestId('shoe-km')).toHaveText('100.0 km');

  await page.goto('/today');
  await page.getByRole('button', { name: /Urađeno/ }).click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeVisible();
  await page.getByLabel(/Distanca/).fill('5');
  await page.getByLabel(/Trajanje/).fill('30:00');
  await page.getByTestId('log-shoe').selectOption({ label: 'Pegasus 41' });
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeHidden();

  await page.goto('/settings');
  await expect(gear.getByTestId('shoe-km')).toHaveText('105.0 km');

  await page.goto('/plan');
  await page.getByRole('button', { name: 'Sledeći mesec' }).click();
  const nextRun = page.locator('a[data-status="PLANNED"][data-type="EASY"]').first();
  await expect(nextRun).toBeVisible();
  await nextRun.click();
  await page.waitForURL('**/workout/**');
  await page.getByRole('button', { name: /Urađeno/ }).click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeVisible();
  await page.getByLabel(/Distanca/).fill('3');
  await page.getByLabel(/Trajanje/).fill('20:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByRole('heading', { name: 'Zabeleži trening' })).toBeHidden();

  await page.goto('/settings');
  await expect(gear.getByTestId('shoe-km')).toHaveText('105.0 km');

  await gear.getByRole('button', { name: 'Pošalji u penziju' }).click();
  await expect(row.getByText('U penziji')).toBeVisible();

  await gear.getByRole('button', { name: 'Obriši Pegasus 41' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Obriši patike' }).click();
  await expect(gear.getByTestId('shoe-row')).toHaveCount(0);
  await expect(gear.getByTestId('gear-empty')).toBeVisible();

  await page.goto('/today');
  const recent = page.getByTestId('recent-activity');
  await expect(recent).toContainText('5 km');
  await expect(recent).toContainText('3 km');
});
