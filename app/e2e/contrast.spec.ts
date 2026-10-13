import { expect, test, type Locator, type Page } from '@playwright/test';
import { completeOnboarding, register, sunnyFixture, uniqueEmail } from './helpers';

const THEME_KEY = 'runcast.theme';
const MIN_RATIO = 4.5;

interface EvaluatedColor {
  ratio: number;
  foreground: string;
  background: string;
}

async function evaluateContrast(locator: Locator): Promise<EvaluatedColor> {
  return locator.evaluate((element) => {
    interface Color {
      r: number;
      g: number;
      b: number;
      a: number;
    }

    const parse = (value: string): Color => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) throw new Error(`Unsupported color: ${value}`);
      const parts = match[1].split(',').map((part) => Number.parseFloat(part));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };

    const overlay = (top: Color, bottom: Color): Color => {
      const alpha = top.a + bottom.a * (1 - top.a);
      if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / alpha,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / alpha,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / alpha,
        a: alpha,
      };
    };

    const layers: Color[] = [];
    let node: Element | null = element;
    while (node) {
      const background = parse(getComputedStyle(node).backgroundColor);
      if (background.a > 0) layers.push(background);
      if (background.a === 1) break;
      node = node.parentElement;
    }
    let background = layers.pop() ?? { r: 255, g: 255, b: 255, a: 1 };
    while (layers.length > 0) {
      const layer = layers.pop();
      if (layer) background = overlay(layer, background);
    }

    const foreground = overlay(parse(getComputedStyle(element).color), background);
    const luminance = (color: Color): number => {
      const [red, green, blue] = [color.r, color.g, color.b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const lighter = Math.max(luminance(foreground), luminance(background));
    const darker = Math.min(luminance(foreground), luminance(background));

    return {
      ratio: (lighter + 0.05) / (darker + 0.05),
      foreground: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor,
    };
  });
}

async function expectContrast(locator: Locator, label: string) {
  const result = await evaluateContrast(locator);
  expect(
    result.ratio,
    `${label}: ${result.foreground} on ${result.background} (${result.ratio.toFixed(2)}:1)`,
  ).toBeGreaterThanOrEqual(MIN_RATIO);
}

async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.evaluate((stored) => localStorage.setItem(stored.key, stored.value), {
    key: THEME_KEY,
    value: theme,
  });
}

test('kontrast teksta prolazi AA prag u obe teme', async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => route.fulfill({ json: sunnyFixture() }));
  await page.route('**/air-quality**', (route) => route.fulfill({ json: { hourly: { time: [], pm2_5: [] } } }));

  const email = uniqueEmail('contrast');
  await register(page, email);
  await completeOnboarding(page);

  await page.getByRole('button', { name: /Urađeno/ }).click();
  await page.getByLabel(/Trajanje/).fill('50:00');
  await page.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(page.getByText('Zabeleži trening')).toBeHidden();

  await page.goto('/settings/profile');
  await page.getByTestId('public-profile').getByRole('button', { name: 'Javno' }).click();
  await page.getByRole('button', { name: 'Sačuvaj profil' }).click();
  await expect(page.getByText('Profil je sačuvan.')).toBeVisible();

  for (const theme of ['dark', 'light'] as const) {
    await setTheme(page, theme);

    await page.goto('/today');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByTestId('weather-hero')).toBeVisible();

    const greeting = page.locator('p.text-lg').first();
    await expect(greeting).toContainText(/Dobro jutro|Dobar dan|Dobro veče/);
    await expectContrast(greeting, `${theme} today greeting`);
    await expectContrast(page.getByTestId('weather-hero-window'), `${theme} weather hero window`);
    await expectContrast(page.getByTestId('weather-hero-conditions'), `${theme} weather hero conditions`);

    await page.goto('/settings');
    const sectionLabel = page.locator('p.section-label').first();
    await expect(sectionLabel).toBeVisible();
    await expectContrast(sectionLabel, `${theme} settings section label`);

    await page.goto('/settings/account');
    const dangerButton = page.getByRole('button', { name: 'Obriši nalog' });
    await expect(dangerButton).toBeVisible();
    await expectContrast(dangerButton, `${theme} danger button`);

    await page.goto('/leaderboard');
    const rowCaption = page.getByTestId('leaderboard-row').first().locator('p.text-caption');
    await expect(rowCaption).toBeVisible();
    await expectContrast(rowCaption, `${theme} leaderboard secondary text`);
  }

  await page.goto('/settings/profile');
  await page.getByTestId('public-profile').getByRole('button', { name: 'Privatno' }).click();
  await page.getByRole('button', { name: 'Sačuvaj profil' }).click();
  await expect(page.getByText('Profil je sačuvan.')).toBeVisible();
});
