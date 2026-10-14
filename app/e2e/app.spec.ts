import { expect, test } from '@playwright/test';
import { completeOnboarding, isoFromNow, rainFixture, register, uniqueEmail } from './helpers';

test('registracija → onboarding → plan → trening → statistika → logout/login', async ({ page }) => {
  const email = uniqueEmail('e2e');
  await register(page, email);
  await completeOnboarding(page);

  await expect(page.getByText(/dana do trke/)).toBeVisible();
  await expect(page.getByText('E2E maraton')).toBeVisible();
  await expect(page.getByText(/^Dugi trk/).first()).toBeVisible();

  await page.getByRole('button', { name: /Urađeno/ }).click();
  await expect(page.getByText('Zabeleži trening')).toBeVisible();
  await page.getByLabel(/Trajanje/).fill('50:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Zabeleži trening')).toBeHidden();
  await expect(page.getByText('Urađeno', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');
  await expect(page.getByText('Ova nedelja')).toBeVisible();
  await expect(page.locator('a[aria-label*="Dugi trk"]').first()).toBeVisible();

  await page.getByRole('link', { name: 'Statistika', exact: true }).click();
  await page.waitForURL('**/stats');
  await expect(page.getByText('Realizacija')).toBeVisible();
  await expect(page.getByText('Poslednje zabeleženo')).toBeVisible();
  await expect(page.getByText('50:00')).toBeVisible();

  await page.getByRole('link', { name: 'Podešavanja', exact: true }).click();
  await page.waitForURL('**/settings');
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole('link', { name: /Nalog/ }).click();
  await page.waitForURL('**/settings/account');
  await page.getByRole('button', { name: 'Odjavi se' }).click();
  await page.waitForURL('**/login');

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Lozinka', { exact: true }).fill('testtest123');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await page.waitForURL('**/today');
  await expect(page.getByText(/dana do trke/)).toBeVisible();
});

test('kiša u terminu → predlog zamene → swap menja dane', async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: rainFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));

  const email = uniqueEmail('rain');
  await register(page, email);
  await completeOnboarding(page);

  await expect(page.getByText(/Kiša, 90% šanse/)).toBeVisible();
  await expect(
    page
      .locator('p')
      .filter({ hasText: /^Dugi trk/ })
      .first(),
  ).toBeVisible();

  await page.getByRole('button', { name: /Prebaci na/ }).click();
  await expect(
    page
      .locator('p')
      .filter({ hasText: /^Lako trčanje/ })
      .first(),
  ).toBeVisible();

  await page.reload();
  await expect(
    page
      .locator('p')
      .filter({ hasText: /^Lako trčanje/ })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .locator('p')
      .filter({ hasText: /^Dugi trk/ })
      .first(),
  ).toBeHidden();
});

test('zaštićene rute preusmeravaju na login', async ({ page }) => {
  await page.goto('/today');
  await page.waitForURL('**/login');
  await page.goto('/forgot-password');
  await expect(page.getByText('Zaboravljena lozinka')).toBeVisible();
});

test('validacije: registracija i onboarding', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  await expect(page.getByText('Ime ima najmanje 2 znaka')).toBeVisible();
  await expect(page.getByText('Unesi ispravan email')).toBeVisible();
  await expect(page.getByText('Lozinka ima najmanje 8 znakova')).toBeVisible();

  await page.getByLabel('Ime', { exact: true }).fill('Test');
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail('val'));
  await page.getByLabel('Lozinka', { exact: true }).fill('testtest123');
  await page.getByLabel('Potvrdi lozinku', { exact: true }).fill('testtest124');
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  await expect(page.getByText('Lozinke se ne poklapaju')).toBeVisible();

  await page.getByLabel('Potvrdi lozinku', { exact: true }).fill('testtest123');
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  await page.waitForURL('**/onboarding');

  await page.getByRole('button', { name: 'Dalje' }).click();
  await expect(page.getByText('Izaberi datum trke')).toBeVisible();
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(-5));
  await page.getByRole('button', { name: 'Dalje' }).click();
  await expect(page.getByText('Datum trke mora biti u budućnosti')).toBeVisible();
  await page.getByLabel('Datum trke', { exact: true }).fill(isoFromNow(126));
  await page.getByRole('button', { name: 'Dalje' }).click();

  await page.getByLabel(/Ciljno vreme/).fill('99:99:99');
  await page.getByRole('button', { name: 'Dalje' }).click();
  await expect(page.getByText('Ciljno vreme unesi kao h:mm:ss (npr. 3:45:00)')).toBeVisible();
});

test('workout detalj, preskoči, profil i regeneracija plana', async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: rainFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));

  const email = uniqueEmail('flow');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');
  await page.locator('a[aria-label*="Dugi trk"]').first().click();
  await page.waitForURL('**/workout/**');
  await expect(page.getByText('Koraci')).toBeVisible();
  await expect(page.getByText(/Vreme za termin 06-09 h/)).toBeVisible();

  await page.getByRole('button', { name: 'Preskoči' }).click();
  await expect(page.getByText('Preskoči trening?')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Preskoči' }).click();
  await expect(page.getByText('Preskočeno').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Preskočeno').first()).toBeVisible();

  await page.goto('/settings/profile');
  await page.getByLabel('Ime', { exact: true }).fill('Novo Ime');
  await page.getByRole('button', { name: 'Sačuvaj profil' }).click();
  await expect(page.getByText('Profil je sačuvan.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Ime', { exact: true })).toHaveValue('Novo Ime');

  await page.goto('/settings/plan');
  await page.getByRole('button', { name: /Generiši novi plan/ }).click();
  await page.getByLabel('Datum trke / ciljni datum').fill(isoFromNow(140));
  await page.getByRole('button', { name: 'Generiši', exact: true }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();

  await page.goto('/plan');
  const rows = page.locator('[data-testid="week-row"]');
  await expect(rows.first()).toBeVisible();
  const dates = await rows.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-date')));
  expect(dates.length).toBe(7);
  expect(new Set(dates).size).toBe(dates.length);
});

test('zaboravljena lozinka šalje link', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail('reset'));
  await page.getByRole('button', { name: 'Pošalji link' }).click();
  await expect(page.getByText('Link je poslat')).toBeVisible();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('aplikacija radi bez animacija', async ({ page }) => {
    const email = uniqueEmail('rm');
    await register(page, email);
    await completeOnboarding(page);
    await expect(page.getByTestId('today-workout-title')).toBeVisible();
    await expect(page.getByText(/dana do trke/)).toBeVisible();
  });
});
