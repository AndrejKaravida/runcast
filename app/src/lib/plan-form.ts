import { parseTimeToSeconds, type Experience, type VolumeBand } from '@runcast/shared';
import type { GeneratePlanInput } from '@/features/plans/queries';

export interface PlanDraft {
  raceName: string;
  raceDate: string;
  distanceKm: string;
  goalTime: string;
  recentDistanceKm: string;
  recentTime: string;
  daysPerWeek: 3 | 4 | 5 | 6;
  longRunDay: number;
  runDays: number[];
  experience: Experience;
}

export type PlanDraftSection = 'raceDate' | 'goalTime' | 'recentRace' | 'schedule';

export type PlanDraftError =
  | 'raceDateRequired'
  | 'raceDateFuture'
  | 'goalTimeFormat'
  | 'recentTimeRequired'
  | 'recentTimeFormat'
  | 'recentDistanceRequired'
  | 'daysCount'
  | 'longRunDayMissing';

const MAX_GOAL_TIME_SEC = 24 * 60 * 60;

export function tryParseTime(value: string): number | null {
  try {
    return parseTimeToSeconds(value.trim());
  } catch {
    return null;
  }
}

export function parseOptionalTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const seconds = tryParseTime(trimmed);
  if (seconds === null || seconds >= MAX_GOAL_TIME_SEC) return null;
  return seconds;
}

export function validatePlanDraft(
  draft: PlanDraft,
  sections: PlanDraftSection[],
  today: string,
): PlanDraftError | null {
  if (sections.includes('raceDate')) {
    if (!draft.raceDate) return 'raceDateRequired';
    if (draft.raceDate <= today) return 'raceDateFuture';
  }
  if (sections.includes('goalTime') && draft.goalTime.trim() && parseOptionalTime(draft.goalTime) === null) {
    return 'goalTimeFormat';
  }
  if (sections.includes('recentRace')) {
    const hasRecentTime = draft.recentTime.trim().length > 0;
    const hasRecentDistance = draft.recentDistanceKm.length > 0;
    if (hasRecentDistance && !hasRecentTime) return 'recentTimeRequired';
    if (hasRecentTime && tryParseTime(draft.recentTime) === null) return 'recentTimeFormat';
    if (hasRecentTime && !hasRecentDistance) return 'recentDistanceRequired';
  }
  if (sections.includes('schedule')) {
    if (new Set(draft.runDays).size !== draft.runDays.length) return 'daysCount';
    if (draft.runDays.length !== draft.daysPerWeek) return 'daysCount';
    if (!draft.runDays.includes(draft.longRunDay)) return 'longRunDayMissing';
  }
  return null;
}

export function buildPlanInput(
  draft: PlanDraft,
  options: { hasRace: boolean; raceName?: string; volumeBand: VolumeBand },
): GeneratePlanInput {
  const goalTimeSec = parseOptionalTime(draft.goalTime);
  const recentTimeSec = draft.recentTime.trim() ? tryParseTime(draft.recentTime) : null;
  const recentRace =
    recentTimeSec !== null && draft.recentDistanceKm
      ? { distanceKm: Number(draft.recentDistanceKm), timeSec: recentTimeSec }
      : null;
  return {
    race: options.hasRace
      ? {
          name: options.raceName?.trim() || null,
          raceDate: draft.raceDate,
          distanceKm: Number(draft.distanceKm),
          goalTimeSec,
        }
      : null,
    recentRace,
    daysPerWeek: draft.daysPerWeek,
    longRunDay: draft.longRunDay,
    runDays: draft.runDays,
    experience: draft.experience,
    volumeBand: options.volumeBand,
  };
}
