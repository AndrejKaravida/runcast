import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

test('zašto ovaj trening — vodič je vidljiv na TEMPO stranici', async ({ page }) => {
  const email = uniqueEmail('why');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');

  const tempoLink = page.locator('a[aria-label*="Tempo"]').first();
  await expect
    .poll(
      async () => {
        if ((await tempoLink.count()) > 0) return true;
        await page.getByRole('button', { name: 'Sledeći mesec' }).click();
        return false;
      },
      { timeout: 30_000, intervals: [1500] },
    )
    .toBe(true);
  await expect(tempoLink).toBeVisible();
  await tempoLink.click();
  await page.waitForURL('**/workout/**');

  await expect(page.getByText('Zašto ovaj trening')).toBeVisible();
  await expect(page.getByTestId('why-card').getByText(/^RPE \d/)).toBeVisible();
  await expect(page.getByText('Česta greška')).toBeVisible();
  await expect(page.getByText('Koraci')).toBeVisible();
  await expect(page.getByRole('button', { name: /Urađeno/ })).toBeVisible();
});
