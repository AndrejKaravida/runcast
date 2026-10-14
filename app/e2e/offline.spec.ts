import { expect, test } from '@playwright/test';
import { build, preview, type PreviewServer } from 'vite';

let server: PreviewServer;
let baseUrl: string;

test.beforeAll(async () => {
  await build({ logLevel: 'error' });
  server = await preview({ logLevel: 'error', preview: { strictPort: false } });
  const urls = server.resolvedUrls;
  if (!urls || urls.local.length === 0) throw new Error('Preview server did not expose a local URL');
  baseUrl = urls.local[0];
});

test.afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolve()));
  });
});

test('built preview serves an installable manifest, icons and a registered service worker', async ({
  page,
  request,
}) => {
  const manifestResponse = await request.get(`${baseUrl}manifest.webmanifest`);
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();

  expect(manifest.id).toBe('/');
  expect(manifest.name).toBe('RunCast');
  expect(manifest.short_name).toBe('RunCast');
  expect(manifest.description).toBeTruthy();
  expect(manifest.start_url).toBe('/');
  expect(manifest.scope).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toBe('#0b0f1a');
  expect(manifest.background_color).toBe('#0b0f1a');
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);

  for (const icon of manifest.icons as { src: string }[]) {
    const iconResponse = await request.get(`${baseUrl.replace(/\/$/, '')}${icon.src}`);
    expect(iconResponse.status(), `${icon.src} should be served`).toBe(200);
  }

  await page.goto(`${baseUrl}login`);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  const registered = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.getRegistrations().then((registrations) => registrations.length > 0);
  });
  expect(registered).toBe(true);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
});

test('app shell renders offline for visited and never-visited routes', async ({ page, context }) => {
  await page.goto(`${baseUrl}login`);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);

  await page.goto(`${baseUrl}today`);
  await expect(page).toHaveTitle(/RunCast/);
  await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeVisible();

  await page.goto(`${baseUrl}privacy`);
  await expect(page).toHaveTitle(/RunCast/);
  await expect(page.getByText('Politika privatnosti')).toBeVisible();

  await context.setOffline(false);
});
