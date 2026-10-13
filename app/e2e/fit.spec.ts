import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01,
  0x8801, 0x4400,
];

function crc16(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    let tableValue = CRC_TABLE[crc & 0x0f];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tableValue ^ CRC_TABLE[byte & 0x0f];
    tableValue = CRC_TABLE[crc & 0x0f];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tableValue ^ CRC_TABLE[(byte >> 4) & 0x0f];
  }
  return crc;
}

test('FIT izvoz — binarni workout fajl sa validnim CRC-om', async ({ page }) => {
  const email = uniqueEmail('fit');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL('**/plan');

  const intervalLink = page.locator('a[aria-label*="Intervali"]').first();
  await expect
    .poll(
      async () => {
        if ((await intervalLink.count()) > 0) return true;
        await page.getByRole('button', { name: 'Sledeći mesec' }).click();
        return false;
      },
      { timeout: 30_000, intervals: [1500] },
    )
    .toBe(true);
  await expect(intervalLink).toBeVisible();
  const workoutHref = await intervalLink.getAttribute('href');
  expect(workoutHref).toMatch(/\/workout\//);

  await page.goto(workoutHref ?? '');
  await page.waitForURL('**/workout/**');
  await expect(page.getByTestId('export-fit')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-fit').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-intervali-\d+-1000-m\.fit$/);

  const filePath = await download.path();
  if (!filePath) throw new Error('Preuzimanje nije dalo putanju');
  const bytes = await readFile(filePath);

  expect(bytes[0]).toBe(12);
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('.FIT');
  const dataSize = bytes.readUInt32LE(4);
  expect(dataSize).toBeGreaterThan(0);
  expect(bytes.length).toBe(12 + dataSize + 2);
  expect(bytes.readUInt16LE(bytes.length - 2)).toBe(crc16(bytes.subarray(0, bytes.length - 2)));
});
