import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const STATUS_BAR_COLORS = { dark: '#0b0f1a', light: '#f7f8fa' } as const;

function currentTheme(): 'dark' | 'light' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

async function applyStatusBarTheme(): Promise<void> {
  const theme = currentTheme();
  await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
  await StatusBar.setBackgroundColor({ color: STATUS_BAR_COLORS[theme] });
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await applyStatusBarTheme();
  new MutationObserver(() => void applyStatusBarTheme()).observe(document.documentElement, {
    attributeFilter: ['data-theme'],
  });
  requestAnimationFrame(() => {
    void import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide());
  });
}

export async function openExternal(url: string): Promise<void> {
  window.open(url, '_blank', 'noopener,noreferrer');
}
