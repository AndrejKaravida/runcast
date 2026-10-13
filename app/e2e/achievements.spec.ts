import { expect, test } from '@playwright/test';
import { completeOnboarding, rainFixture, register, uniqueEmail } from './helpers';

test('dostignuća: prvi bedž, nedeljni izazov i trajno seen stanje', async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: rainFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));

  const email = uniqueEmail('achievements');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('button', { name: /Urađeno/ }).click();
  await expect(page.getByText('Zabeleži trening')).toBeVisible();
  await page.getByLabel(/Trajanje/).fill('50:00');
  const rpe = page.locator('#log-rpe');
  await rpe.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Zabeleži trening')).toBeHidden();

  await expect(page.getByTestId('achievement-toast')).toBeVisible();
  await expect(page.getByTestId('achievement-toast')).toContainText('Novo dostignuće');
  await expect(page.getByTestId('achievement-toast')).toContainText('Prvi trening');
  await expect(page.getByTestId('weekly-challenge')).toContainText('Nedeljni izazov');
  await expect(page.getByTestId('weekly-challenge')).toContainText('1/');

  await page.getByRole('link', { name: 'Statistika', exact: true }).click();
  await page.waitForURL('**/stats');
  await expect(page.getByTestId('achievement-first')).toHaveAttribute('data-state', 'earned');
  await expect(page.getByTestId('achievement-first')).toContainText('Prvi trening');
  await expect(page.getByTestId('achievement-sessions')).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('achievement-sessions')).toContainText('1/5');

  await page.reload();
  await expect(page.getByTestId('achievement-first')).toHaveAttribute('data-state', 'earned');
  await expect(page.getByTestId('achievement-toast')).toBeHidden();
  await page.goto('/today');
  await expect(page.getByTestId('achievement-toast')).toBeHidden();
});
