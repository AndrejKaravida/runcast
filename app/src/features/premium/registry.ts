export const PREMIUM_FEATURES = {
  multiple_races: { labelKey: 'premium:features.multipleRaces' },
} as const;

export type PremiumFeature = keyof typeof PREMIUM_FEATURES;
