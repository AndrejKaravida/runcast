import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

async function stubPush(page: Page) {
  await page.route('**/rest/v1/rpc/get_push_public_key', (route) =>
    route.fulfill({
      json: 'BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ',
    }),
  );
  await page.addInitScript(() => {
    const subscription = {
      endpoint: `https://push.e2e.test/${Math.random().toString(36).slice(2)}`,
      toJSON: () => ({
        endpoint: subscription.endpoint,
        keys: { p256dh: 'e2e-p256dh', auth: 'e2e-auth' },
      }),
      unsubscribe: async () => true,
    };
    const registration = {
      pushManager: {
        subscribe: async () => subscription,
        getSubscription: async () => subscription,
      },
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve(registration), getRegistration: async () => registration },
    });
  });
}

test.describe('push notifikacije', () => {
  test.use({ permissions: ['notifications'] });

  test('uključivanje prikazuje status, prekidači se pamte posle reload-a', async ({ page }) => {
    await stubPush(page);
    const email = uniqueEmail('push');
    await register(page, email);
    await completeOnboarding(page);

    await page.goto('/settings');
    await expect(page.getByText('Notifikacije', { exact: true })).toBeVisible();

    await page.getByTestId('push-master').getByRole('button', { name: 'Uključi' }).click();
    await expect(page.getByTestId('push-status')).toBeVisible();
    await expect(page.getByTestId('push-status')).toContainText('Notifikacije su uključene');

    await page.getByTestId('push-training').getByRole('button', { name: 'Isključi' }).click();
    await expect(page.getByTestId('push-training').getByRole('button', { name: 'Isključi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.reload();
    await expect(page.getByTestId('push-status')).toBeVisible();
    await expect(page.getByTestId('push-training').getByRole('button', { name: 'Isključi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('bez servisnog radnika prikazuje graceful grešku', async ({ page }) => {
    const email = uniqueEmail('push-offline');
    await register(page, email);
    await completeOnboarding(page);

    await page.goto('/settings');
    await page.getByTestId('push-master').getByRole('button', { name: 'Uključi' }).click();
    await expect(page.getByTestId('push-error')).toBeVisible();
  });
});
