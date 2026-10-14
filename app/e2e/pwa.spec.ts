import { expect, test } from '@playwright/test';

// SW se ne registruje u dev-u (devOptions.enabled: false) — aktivacija se proverava kroz build/preview, ne ovde.
test('PWA manifest, ikone i theme-color su dostupni', async ({ page, request }) => {
  await page.goto('/login');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0f1a');

  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.status()).toBe(200);
  expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');

  const manifest = await manifestResponse.json();
  expect(manifest.id).toBe('/');
  expect(manifest.name).toBe('RunCast');
  expect(manifest.short_name).toBe('RunCast');
  expect(manifest.description).toBeTruthy();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  expect(manifest.theme_color).toBe('#0b0f1a');

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.status(), `${icon.src} should be served`).toBe(200);
  }
});
