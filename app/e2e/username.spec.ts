import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

function uniqueUsername(prefix: string): string {
  return `${prefix}${Date.now().toString(36).slice(-6)}${Math.floor(Math.random() * 100_000)}`;
}

test('korisničko ime: čuvanje, pretraga, duplikat, validacija i margine', async ({ browser }) => {
  const contextA = await browser.newContext({ locale: 'sr-Latn-RS', colorScheme: 'dark' });
  const contextB = await browser.newContext({ locale: 'sr-Latn-RS', colorScheme: 'dark' });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const usernameA = uniqueUsername('ana');
  const usernameB = uniqueUsername('boris');
  const nameA = `Ana Korisnica ${usernameA}`;
  const nameB = `Boris Korisnik ${usernameB}`;

  try {
    await register(pageA, uniqueEmail('username-a'), nameA);
    await completeOnboarding(pageA);
    await register(pageB, uniqueEmail('username-b'), nameB);
    await completeOnboarding(pageB);

    await pageA.goto('/settings/profile');
    await pageA.getByLabel('Korisničko ime').fill(usernameA);
    await pageA.getByRole('button', { name: 'Sačuvaj profil' }).click();
    await expect(pageA.getByText('Profil je sačuvan.')).toBeVisible();

    await pageA.reload();
    await expect(pageA.getByLabel('Korisničko ime')).toHaveValue(usernameA);

    await pageB.goto('/settings/profile');
    await pageB.getByLabel('Korisničko ime').fill(usernameA);
    await pageB.getByRole('button', { name: 'Sačuvaj profil' }).click();
    await expect(pageB.getByText('To korisničko ime je zauzeto.')).toBeVisible();

    await pageB.getByLabel('Korisničko ime').fill(usernameB);
    await pageB.getByRole('button', { name: 'Sačuvaj profil' }).click();
    await expect(pageB.getByText('Profil je sačuvan.')).toBeVisible();

    await pageB.getByLabel('Korisničko ime').fill('ab');
    await pageB.getByRole('button', { name: 'Sačuvaj profil' }).click();
    await expect(pageB.getByText('Korisničko ime mora da ima 3 do 20 znakova.')).toBeVisible();

    await pageB.goto('/friends');
    await expect(pageB.getByText('Traži po korisničkom imenu (@ime) ili tačnom imenu profila')).toBeVisible();

    const title = pageB.getByRole('heading', { name: 'Prijatelji' });
    const box = await title.boundingBox();
    const viewport = pageB.viewportSize();
    expect(box).not.toBeNull();
    expect(box?.x).toBeGreaterThan(8);
    expect(viewport!.width - (box!.x + box!.width)).toBeGreaterThan(8);

    await pageB.getByLabel('Ime profila').fill(`@nepostojeci${usernameA}`);
    await pageB.getByTestId('friend-add-submit').click();
    await expect(pageB.getByTestId('friend-add-error')).toContainText('Nema rezultata');

    await pageB.getByLabel('Ime profila').fill(`@${usernameA}`);
    await pageB.getByTestId('friend-add-submit').click();
    await expect(pageB.getByText('Zahtev je poslat.')).toBeVisible();

    await pageA.goto('/friends');
    await expect(pageA.getByTestId('friend-request-row')).toContainText(nameB);
    await expect(pageA.getByTestId('friend-request-row')).toContainText(`@${usernameB}`);
    await pageA.getByTestId('friend-request-accept').click();
    await expect(pageA.getByTestId('friend-row')).toContainText(nameB);
    await expect(pageA.getByTestId('friend-row')).toContainText(`@${usernameB}`);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
