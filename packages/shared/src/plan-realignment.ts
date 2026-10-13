import { addDays, startOfWeek } from './dates';
import {
  missedPlannedWorkouts,
  placeWeekWorkouts,
  type RebalanceWorkout,
  type WeekPlanAdjustments,
} from './rebalance-week';

export interface PlanRealignmentParams {
  workouts: RebalanceWorkout[];
  today: string;
  longRunDay: number;
  raceDate: string;
}

export function planRealignment({ workouts, today, longRunDay, raceDate }: PlanRealignmentParams): WeekPlanAdjustments {
  const skips = missedPlannedWorkouts(workouts, today).map((workout) => workout.id);
  const moves: WeekPlanAdjustments['moves'] = [];

  for (let weekStart = startOfWeek(today); weekStart <= raceDate; weekStart = addDays(weekStart, 7)) {
    const windowStart = weekStart < today ? today : weekStart;
    const weekEnd = addDays(weekStart, 6);
    const windowEnd = weekEnd < raceDate ? weekEnd : raceDate;
    if (windowStart > windowEnd) continue;
    moves.push(...placeWeekWorkouts(workouts, windowStart, weekStart, windowEnd, longRunDay));
  }

  return { skips, moves };
}

export function recentMissedCount(workouts: RebalanceWorkout[], today: string, days = 14): number {
  const from = addDays(today, -days);
  return workouts.filter(
    (workout) =>
      workout.status === 'PLANNED' && workout.type !== 'REST' && workout.date < today && workout.date >= from,
  ).length;
}
