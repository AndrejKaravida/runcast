import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import authEn from './locales/en/auth.json';
import benchmarkEn from './locales/en/benchmark.json';
import commonEn from './locales/en/common.json';
import contentEn from './locales/en/content.json';
import guidedEn from './locales/en/guided.json';
import legalEn from './locales/en/legal.json';
import licensesEn from './locales/en/licenses.json';
import onboardingEn from './locales/en/onboarding.json';
import planEn from './locales/en/plan.json';
import premiumEn from './locales/en/premium.json';
import raceEn from './locales/en/race.json';
import settingsEn from './locales/en/settings.json';
import socialEn from './locales/en/social.json';
import statsEn from './locales/en/stats.json';
import todayEn from './locales/en/today.json';
import workoutEn from './locales/en/workout.json';
import authSr from './locales/sr/auth.json';
import benchmarkSr from './locales/sr/benchmark.json';
import commonSr from './locales/sr/common.json';
import contentSr from './locales/sr/content.json';
import guidedSr from './locales/sr/guided.json';
import legalSr from './locales/sr/legal.json';
import licensesSr from './locales/sr/licenses.json';
import onboardingSr from './locales/sr/onboarding.json';
import planSr from './locales/sr/plan.json';
import premiumSr from './locales/sr/premium.json';
import raceSr from './locales/sr/race.json';
import settingsSr from './locales/sr/settings.json';
import socialSr from './locales/sr/social.json';
import statsSr from './locales/sr/stats.json';
import todaySr from './locales/sr/today.json';
import workoutSr from './locales/sr/workout.json';

export const LANGUAGES = ['sr', 'en'] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'runcast.lang';

export const NAMESPACES = [
  'common',
  'auth',
  'onboarding',
  'today',
  'plan',
  'workout',
  'guided',
  'stats',
  'settings',
  'race',
  'benchmark',
  'content',
  'licenses',
  'legal',
  'premium',
  'social',
] as const;

const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  sr: 'sr-Latn-RS',
  en: 'en-GB',
};

export function localeForLanguage(language: string): string {
  return language.toLowerCase().startsWith('en') ? LOCALE_BY_LANGUAGE.en : LOCALE_BY_LANGUAGE.sr;
}

function storedLanguage(): AppLanguage | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'sr' || stored === 'en' ? stored : null;
  } catch {
    return null;
  }
}

export function detectLanguage(): AppLanguage {
  const stored = storedLanguage();
  if (stored) return stored;
  return navigator.language.toLowerCase().startsWith('sr') ? 'sr' : 'en';
}

const resources = {
  en: {
    auth: authEn,
    benchmark: benchmarkEn,
    common: commonEn,
    content: contentEn,
    guided: guidedEn,
    legal: legalEn,
    licenses: licensesEn,
    onboarding: onboardingEn,
    plan: planEn,
    premium: premiumEn,
    race: raceEn,
    settings: settingsEn,
    social: socialEn,
    stats: statsEn,
    today: todayEn,
    workout: workoutEn,
  },
  sr: {
    auth: authSr,
    benchmark: benchmarkSr,
    common: commonSr,
    content: contentSr,
    guided: guidedSr,
    legal: legalSr,
    licenses: licensesSr,
    onboarding: onboardingSr,
    plan: planSr,
    premium: premiumSr,
    race: raceSr,
    settings: settingsSr,
    social: socialSr,
    stats: statsSr,
    today: todaySr,
    workout: workoutSr,
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: 'sr',
  supportedLngs: [...LANGUAGES],
  load: 'languageOnly',
  ns: [...NAMESPACES],
  defaultNS: 'common',
  initAsync: false,
  interpolation: { escapeValue: false },
});

function applyHtmlLang(language: string) {
  document.documentElement.lang = language.toLowerCase().startsWith('en') ? 'en' : 'sr';
}

i18n.on('languageChanged', applyHtmlLang);
applyHtmlLang(i18n.language);

export function setLanguage(language: AppLanguage) {
  if (language !== i18n.resolvedLanguage) void i18n.changeLanguage(language);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    return;
  }
}

export default i18n;
