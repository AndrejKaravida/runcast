import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test('sRPE: prazna istorija je insufficient, jedan jak trening puni akutno opterećenje', async ({ page }) => {
  const email = uniqueEmail('srpe');
  await register(page, email);
  await completeOnboarding(page);

  await page.goto('/stats');
  const card = page.getByTestId('load-card');
  await expect(card).toBeVisible();
  await expect(card.getByText('Nedovoljno podataka')).toBeVisible();
  await expect(page.getByTestId('load-acute')).toHaveText('0');

  await page.goto('/today');
  await page.getByRole('button', { name: /Urađeno/ }).click();
  await expect(page.getByText('Zabeleži trening')).toBeVisible();
  await page.getByLabel(/Trajanje/).fill('120:00');
  const rpe = page.locator('#log-rpe');
  await rpe.focus();
  for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Zabeleži trening')).toBeHidden();

  await page.goto('/stats');
  await expect(card).toBeVisible();
  await expect(page.getByTestId('load-acute')).not.toHaveText('0');
  const acute = Number(await page.getByTestId('load-acute').textContent());
  expect(acute).toBeGreaterThan(0);
  await expect(card.getByText('Nedovoljno podataka')).toBeVisible();
});
