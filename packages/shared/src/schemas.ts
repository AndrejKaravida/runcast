import { z } from 'zod';
import type { WorkoutStep } from './types';

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Invalid date');

export const timeStringSchema = z
  .string()
  .regex(/^\d{1,3}:\d{1,2}(:\d{1,2})?$/)
  .refine((value) => {
    try {
      parseTimeToSeconds(value);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid time');

export function parseTimeToSeconds(value: string): number {
  const match = /^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Invalid time');
  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = match[3] === undefined ? null : Number(match[3]);
  if (third === null) {
    if (second > 59) throw new Error('Invalid time');
    return first * 60 + second;
  }
  if (second > 59 || third > 59) throw new Error('Invalid time');
  return first * 3600 + second * 60 + third;
}

export const raceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  raceDate: isoDateSchema,
  distanceKm: z.number().positive().default(42.195),
  goalTime: timeStringSchema.optional(),
});

export const profileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  heightCm: z.number().int().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(250).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  units: z.enum(['km', 'mi']).default('km'),
  city: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  runWindow: z.enum(['morning', 'evening', 'flexible']).default('morning'),
  weatherRefreshMinutes: z
    .union([z.literal(30), z.literal(60), z.literal(180), z.literal(360), z.literal(720), z.null()])
    .default(60),
});

export const onboardingSchema = profileSchema.extend({
  experience: z.enum(['first', 'experienced']),
  volumeBand: z.enum(['lt20', '20-40', '40-60', 'gt60']),
  daysPerWeek: z.number().int().min(3).max(6),
  longRunDay: z.number().int().min(0).max(6),
  goalTime: timeStringSchema.optional(),
  recentRaceDistanceKm: z.number().positive().optional(),
  recentRaceTime: timeStringSchema.optional(),
});

export const runLogSchema = z.object({
  distanceKm: z.number().positive().max(100),
  durationSec: z.number().int().positive(),
  rpe: z.number().int().min(1).max(10),
  notes: z.string().max(1000).optional(),
});

export const workoutStepSchema = z.object({
  label: z.string(),
  distanceKm: z.number().optional(),
  durationSec: z.number().optional(),
  pace: z.string().optional(),
});

export const workoutStepsSchema = z.array(workoutStepSchema);

export function parseWorkoutSteps(json: unknown): WorkoutStep[] {
  const result = workoutStepsSchema.safeParse(json);
  return result.success ? result.data : [];
}

export type RaceInput = z.infer<typeof raceSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type RunLogInput = z.infer<typeof runLogSchema>;
