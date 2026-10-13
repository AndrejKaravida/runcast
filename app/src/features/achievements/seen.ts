import { computeAchievements, type Achievement, type WorkoutStatus, type WorkoutType } from '@runcast/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { todayIso } from '@/lib/dates';
import type { ProfilesRow, RunLogsRow, WorkoutsRow } from '@/types';

const SEEN_KEY = 'runcast.achievements.seen';

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    return;
  }
}

function winner(fresh: Achievement[]): Achievement | null {
  return fresh.reduce<Achievement | null>(
    (best, item) =>
      best === null || item.tier > best.tier || (item.tier === best.tier && item.progress.target > best.progress.target)
        ? item
        : best,
    null,
  );
}

export interface AchievementCelebration {
  achievements: Achievement[];
  fresh: Achievement[];
  achievement: Achievement | null;
  dismiss: () => void;
}

export function useAchievementCelebration(
  workouts: WorkoutsRow[],
  logs: RunLogsRow[],
  profile: ProfilesRow | undefined,
): AchievementCelebration {
  const today = todayIso();
  const [seenAtMount] = useState(readSeen);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const achievements = useMemo(
    () =>
      computeAchievements({
        workouts: workouts.map((row) => ({
          id: row.id,
          workout_date: row.workout_date,
          type: row.type as WorkoutType,
          status: row.status as WorkoutStatus,
          distance_km: row.distance_km,
        })),
        logs: logs.map((row) => ({
          workout_id: row.workout_id,
          log_date: row.log_date,
          distance_km: row.distance_km,
          duration_sec: row.duration_sec,
        })),
        profile: profile ? { experience: profile.experience, volume_band: profile.volume_band } : null,
        today,
      }),
    [workouts, logs, profile, today],
  );

  const fresh = useMemo(
    () => achievements.filter((item) => item.unlockedAt === today && !seenAtMount.has(item.id)),
    [achievements, seenAtMount, today],
  );

  useEffect(() => {
    const seen = new Set(seenAtMount);
    let changed = false;
    for (const item of achievements) {
      if (item.unlockedAt !== null && item.unlockedAt <= today && !seen.has(item.id)) {
        seen.add(item.id);
        changed = true;
      }
    }
    if (changed) writeSeen(seen);
  }, [achievements, seenAtMount, today]);

  const visible = useMemo(() => fresh.filter((item) => !dismissed.has(item.id)), [fresh, dismissed]);

  const dismiss = useCallback(() => {
    setDismissed((previous) => {
      const next = new Set(previous);
      for (const item of fresh) next.add(item.id);
      return next;
    });
  }, [fresh]);

  return { achievements, fresh, achievement: winner(visible), dismiss };
}
