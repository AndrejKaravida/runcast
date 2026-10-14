import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

function suffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test('zahtev, prihvatanje, feed, kudos i blokada', async ({ browser }) => {
  const contextA = await browser.newContext({ locale: 'sr-Latn-RS', colorScheme: 'dark' });
  const contextB = await browser.newContext({ locale: 'sr-Latn-RS', colorScheme: 'dark' });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const id = suffix();
  const nameA = `Ana Trkačica ${id}`;
  const nameB = `Boris Trkač ${id}`;

  try {
    await register(pageA, uniqueEmail('social-a'), nameA);
    await completeOnboarding(pageA);
    await register(pageB, uniqueEmail('social-b'), nameB);
    await completeOnboarding(pageB);

    await pageA.goto('/friends');
    await pageA.getByLabel('Ime profila').fill(`Nepoznati ${id}`);
    await pageA.getByTestId('friend-add-submit').click();
    await expect(pageA.getByTestId('friend-add-error')).toContainText('Nema trkača sa tim imenom profila.');

    await pageA.getByLabel('Ime profila').fill(nameB);
    await pageA.getByTestId('friend-add-submit').click();
    await expect(pageA.getByText('Zahtev je poslat.')).toBeVisible();

    await pageB.goto('/friends');
    await expect(pageB.getByTestId('friend-request-row')).toContainText(nameA);
    await pageB.getByTestId('friend-request-accept').click();
    await expect(pageB.getByTestId('friend-row')).toContainText(nameA);

    await pageA.goto('/leaderboard');
    await pageA.getByRole('button', { name: 'Prijatelji' }).click();
    const friendRows = pageA.getByTestId('friends-leaderboard-row');
    await expect(friendRows).toHaveCount(2);
    await expect(friendRows.filter({ hasText: nameA })).toBeVisible();
    await expect(friendRows.filter({ hasText: nameB })).toBeVisible();

    await pageA.goto('/today');
    await pageA.getByRole('button', { name: /Urađeno/ }).click();
    await pageA.getByLabel(/Trajanje/).fill('50:00');
    await pageA.getByRole('button', { name: 'Sačuvaj' }).click();
    await expect(pageA.getByText('Zabeleži trening')).toBeHidden();

    await pageB.goto('/leaderboard');
    await pageB.getByRole('button', { name: 'Feed' }).click();
    const card = pageB.getByTestId('feed-card').filter({ hasText: nameA });
    await expect(card).toBeVisible();
    await expect(card.getByTestId('kudos-count')).toHaveText('0');
    await card.getByTestId('kudos-button').click();
    await expect(card.getByTestId('kudos-count')).toHaveText('1');
    await card.getByTestId('kudos-button').click();
    await expect(card.getByTestId('kudos-count')).toHaveText('0');

    await pageB.goto('/friends');
    await pageB.getByTestId('friend-row').filter({ hasText: nameA }).getByTestId('friend-block').click();
    const dialog = pageB.getByRole('dialog');
    await expect(dialog).toContainText('Blokirati korisnika?');
    await dialog.getByRole('button', { name: 'Blokiraj' }).click();
    await expect(pageB.getByTestId('friend-row')).toHaveCount(0);

    await pageB.goto('/leaderboard');
    await pageB.getByRole('button', { name: 'Feed' }).click();
    await expect(pageB.getByTestId('feed-card')).toHaveCount(0);
    await expect(pageB.getByText('Feed je još prazan')).toBeVisible();
    await pageB.getByRole('button', { name: 'Prijatelji' }).click();
    await expect(pageB.getByText('Još nemaš prijatelje')).toBeVisible();
    await expect(pageB.getByText(nameA)).toHaveCount(0);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test('odbijen zahtev se može poslati ponovo, uklanjanje briše prijatelja i feed', async ({ browser }) => {
  const contextA = await browser.newContext({ locale: 'sr-Latn-RS', colorScheme: 'dark' });
  const contextB = await browser.newContext({ locale: 'sr-Latn-RS', colorScheme: 'dark' });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const id = suffix();
  const nameA = `Ceca Trkačica ${id}`;
  const nameB = `Davor Trkač ${id}`;

  try {
    await register(pageA, uniqueEmail('social-decline-a'), nameA);
    await completeOnboarding(pageA);
    await register(pageB, uniqueEmail('social-decline-b'), nameB);
    await completeOnboarding(pageB);

    await pageA.goto('/friends');
    await pageA.getByLabel('Ime profila').fill(nameB);
    await pageA.getByTestId('friend-add-submit').click();
    await expect(pageA.getByText('Zahtev je poslat.')).toBeVisible();

    await pageB.goto('/friends');
    await expect(pageB.getByTestId('friend-request-row')).toContainText(nameA);
    await pageB.getByTestId('friend-request-decline').click();
    await expect(pageB.getByTestId('friend-request-row')).toHaveCount(0);
    await expect(pageB.getByText('Nema novih zahteva.')).toBeVisible();
    await expect(pageB.getByText('Još nemaš prijatelje')).toBeVisible();

    await pageA.goto('/friends');
    await pageA.getByLabel('Ime profila').fill(nameB);
    await pageA.getByTestId('friend-add-submit').click();
    await expect(pageA.getByText('Zahtev je poslat.')).toBeVisible();

    await pageB.goto('/friends');
    await pageB.getByTestId('friend-request-accept').click();
    await expect(pageB.getByTestId('friend-row')).toContainText(nameA);

    await pageA.goto('/today');
    await pageA.getByTestId('log-done').click();
    await pageA.getByLabel(/Trajanje/).fill('45:00');
    await pageA.getByRole('button', { name: 'Sačuvaj' }).click();
    await expect(pageA.getByRole('heading', { name: 'Zabeleži trening' })).toBeHidden();

    await pageB.goto('/leaderboard');
    await pageB.getByRole('button', { name: 'Feed' }).click();
    await expect(pageB.getByTestId('feed-card').filter({ hasText: nameA })).toBeVisible();

    await pageB.goto('/friends');
    await pageB.getByTestId('friend-row').filter({ hasText: nameA }).getByTestId('friend-remove').click();
    const dialog = pageB.getByRole('dialog');
    await expect(dialog).toContainText('Ukloniti prijatelja?');
    await dialog.getByRole('button', { name: 'Ukloni' }).click();
    await expect(pageB.getByTestId('friend-row')).toHaveCount(0);
    await expect(pageB.getByText('Još nemaš prijatelje')).toBeVisible();

    await pageB.goto('/leaderboard');
    await pageB.getByRole('button', { name: 'Feed' }).click();
    await expect(pageB.getByTestId('feed-card')).toHaveCount(0);
    await expect(pageB.getByText('Feed je još prazan')).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
