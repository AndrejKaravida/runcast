import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, register, uniqueEmail } from './helpers';

function mockSpeechSynthesis(page: Page) {
  return page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;

    class MockUtterance {
      text: string;
      lang = '';
      voice: unknown = null;
      volume = 1;
      rate = 1;
      pitch = 1;

      constructor(text: string) {
        this.text = text;
      }
    }

    const synthesis = {
      speak: (utterance: { text?: string }) => {
        spoken.push(String(utterance?.text ?? ''));
      },
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => [{ lang: 'sr-Latn-RS', name: 'Mock sr', default: true, localService: true, voiceURI: 'mock' }],
      addEventListener: () => {},
      removeEventListener: () => {},
      speaking: false,
      pending: false,
      paused: false,
    };

    try {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
    } catch {
      (window as unknown as { speechSynthesis: unknown }).speechSynthesis = synthesis;
    }
    try {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    } catch {
      (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = MockUtterance;
    }
  });
}

function spokenLines(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
}

async function openGuidedWorkoutId(page: Page): Promise<string> {
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
  const href = await intervalLink.getAttribute('href');
  return href?.split('/').pop() ?? '';
}

test('audio navođenje: BRIEF na startu, COACH na skipu i mute', async ({ page }) => {
  await mockSpeechSynthesis(page);
  await register(page, uniqueEmail('guided-audio'));
  await completeOnboarding(page);
  const workoutId = await openGuidedWorkoutId(page);
  expect(workoutId).not.toBe('');

  await page.goto(`/run/${workoutId}?timeScale=30`);
  await page.getByTestId('guided-start').click();

  await expect
    .poll(async () => (await spokenLines(page)).some((line) => line.includes('Intervali') && line.includes('km')), {
      timeout: 15_000,
    })
    .toBe(true);

  await page.getByTestId('guided-next').click();
  await expect(page.getByTestId('guided-cue')).toContainText('Ponavljanje 1 od 4');
  await expect
    .poll(async () => (await spokenLines(page)).some((line) => /brzin|radna zona/i.test(line)), { timeout: 15_000 })
    .toBe(true);

  const mute = page.getByTestId('guided-mute');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  const countAfterMute = (await spokenLines(page)).length;
  await page.getByTestId('guided-next').click();
  await page.waitForTimeout(700);
  expect((await spokenLines(page)).length).toBe(countAfterMute);
});

test('mute se pamti i posle novog pokretanja vođenog trčanja', async ({ page }) => {
  await register(page, uniqueEmail('guided-mute'));
  await completeOnboarding(page);
  const workoutId = await openGuidedWorkoutId(page);
  expect(workoutId).not.toBe('');

  await page.goto(`/run/${workoutId}?timeScale=30`);
  await page.getByTestId('guided-start').click();
  const mute = page.getByTestId('guided-mute');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByTestId('guided-start')).toBeVisible();
  await page.getByTestId('guided-start').click();
  await expect(page.getByTestId('guided-mute')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('runcast.guided.muted'))).toBe('true');
});
