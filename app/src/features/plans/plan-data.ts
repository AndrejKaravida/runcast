import type { PlanAnchor, PlanPaces } from '@runcast/shared';
import type { PlansRow } from '@/types';

type PlanJsonValues = Pick<PlansRow, 'paces' | 'anchor'>;

const PACE_FIELDS = [
  'easySlowSecPerKm',
  'easyFastSecPerKm',
  'marathonSecPerKm',
  'thresholdSecPerKm',
  'intervalSecPerKm',
  'repetitionSecPerKm',
] as const;

function hasNumericFields<K extends string>(value: unknown, fields: readonly K[]): value is Record<K, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    fields.every((field) => typeof (value as Record<string, unknown>)[field] === 'number')
  );
}

export function planPaces(plan: PlanJsonValues | null | undefined): PlanPaces | null {
  const value = plan?.paces;
  return hasNumericFields(value, PACE_FIELDS) ? value : null;
}

export function planAnchor(plan: PlanJsonValues | null | undefined): PlanAnchor | null {
  const value = plan?.anchor;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const kind = value.kind;
  const distanceKm = value.distanceKm;
  const timeSec = value.timeSec;
  if (kind !== 'race' && kind !== 'goal') return null;
  if (typeof distanceKm !== 'number' || typeof timeSec !== 'number') return null;
  return { kind, distanceKm, timeSec };
}
