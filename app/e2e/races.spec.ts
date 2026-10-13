import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { completeOnboarding, isoFromNow, register, uniqueEmail } from './helpers';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function premiumClientFor(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: 'testtest123' });
  expect(error).toBeNull();
  const { data: user } = await client.auth.getUser();
  const { error: premiumError } = await client
    .from('profiles')
    .update({ premium: true })
    .eq('id', user?.user?.id ?? '');
  expect(premiumError).toBeNull();
}

test('trke: dodavanje, izmena, brisanje i izbor ciljne trke za plan', async ({ page }) => {
  const email = uniqueEmail('races');
  await register(page, email);
  await completeOnboarding(page);
  await premiumClientFor(email);

  await page.goto('/settings/plan');
  const rows = page.getByTestId('race-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('E2E maraton');
  await expect(rows.first().getByText('Cilj plana')).toBeVisible();

  await page.getByRole('button', { name: 'Dodaj trku' }).click();
  await page.getByLabel('Naziv trke (opciono)').fill('E2E 10K');
  await page.getByLabel('Datum trke / ciljni datum').fill(isoFromNow(30));
  await page.getByLabel('Distanca').selectOption('10');
  await page.getByLabel(/Ciljno vreme/).fill('50:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je dodata.')).toBeVisible();

  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('E2E 10K');
  const tenK = rows.filter({ hasText: 'E2E 10K' });
  await expect(tenK).toContainText('10 km');
  await expect(tenK).toContainText(/za \d+ dan/);
  await expect(tenK.getByText('Cilj plana')).toHaveCount(0);

  await tenK.getByRole('button', { name: 'Uredi' }).click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog.getByText('Izmena trke')).toBeVisible();
  await editDialog.getByLabel('Naziv trke (opciono)').fill('E2E 10K izmenjena');
  await editDialog.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Trka je izmenjena.')).toBeVisible();

  const edited = rows.filter({ hasText: 'E2E 10K izmenjena' });
  await expect(edited).toHaveCount(1);
  await expect(edited.getByText('Cilj plana')).toHaveCount(0);

  await edited.getByRole('button', { name: 'Obriši' }).click();
  const deleteDialog = page.getByRole('dialog');
  await expect(deleteDialog.getByText('Obriši trku?')).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'Obriši' }).click();
  await expect(page.getByText('Trka je obrisana.')).toBeVisible();
  await expect(rows).toHaveCount(1);

  await rows.first().getByRole('button', { name: 'Obriši' }).click();
  const blockedDialog = page.getByRole('dialog');
  await blockedDialog.getByRole('button', { name: 'Obriši' }).click();
  await expect(blockedDialog.getByText(/cilj aktivnog plana/)).toBeVisible();
  await blockedDialog.getByRole('button', { name: 'Otkaži' }).click();
  await expect(rows).toHaveCount(1);

  await page.getByRole('button', { name: /Generiši novi plan/ }).click();
  const target = page.getByLabel('Ciljna trka');
  const targetValue = await target.locator('option', { hasText: 'E2E maraton' }).getAttribute('value');
  expect(targetValue).not.toBeNull();
  await target.selectOption(targetValue ?? '');
  await page.getByRole('button', { name: 'Generiši', exact: true }).click();
  await expect(page.getByText('Novi plan je spreman, stari je arhiviran.')).toBeVisible();

  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('E2E maraton');
  await expect(rows.first().getByText('Cilj plana')).toBeVisible();

  await page.goto('/today');
  await expect(page.getByTestId('race-chip')).toContainText('E2E maraton');
});
