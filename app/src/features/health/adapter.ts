import { Capacitor } from '@capacitor/core';
import type { HealthDataType, HealthSample } from '@capgo/capacitor-health';
import type { HealthRun, ReadinessSnapshot } from '@runcast/shared';

export type HealthAvailability = 'available' | 'needs-install' | 'unavailable';

export interface HealthSource {
  isAvailable(): Promise<HealthAvailability>;
  requestPermissions(): Promise<boolean>;
  requestReadinessPermissions(): Promise<boolean>;
  fetchRuns(sinceIso: string): Promise<HealthRun[]>;
  fetchReadiness(sinceIso: string): Promise<ReadinessSnapshot | null>;
}

export interface HealthReadinessMock {
  sleepHours?: number | null;
  restingHr?: number | null;
  hrv?: number | null;
}

export interface HealthMock {
  available?: HealthAvailability;
  runs?: HealthRun[];
  readiness?: HealthReadinessMock | null;
}

declare global {
  interface Window {
    __runcastHealthMock?: HealthMock;
  }
}

const RUNNING_WORKOUT_TYPES = ['running', 'runningTreadmill'];
const ASLEEP_STAGES = new Set(['asleep', 'rem', 'deep', 'light']);
const READINESS_TYPES: HealthDataType[] = ['sleep', 'restingHeartRate', 'heartRateVariability'];

function isRunningWorkoutType(type: string): boolean {
  return RUNNING_WORKOUT_TYPES.includes(type);
}

function asleepMinutes(samples: HealthSample[]): number {
  let minutes = 0;
  for (const sample of samples) {
    if (sample.stages && sample.stages.length > 0) {
      for (const stage of sample.stages) {
        if (ASLEEP_STAGES.has(stage.stage)) minutes += stage.durationMinutes;
      }
      continue;
    }
    if (sample.sleepState === undefined || ASLEEP_STAGES.has(sample.sleepState)) {
      minutes += sample.value;
    }
  }
  return minutes;
}

function roundKm(meters: number): number {
  return Math.round((meters / 1000) * 100) / 100;
}

export class CapacitorHealthSource implements HealthSource {
  constructor(private readonly platform: 'ios' | 'android') {}

  async isAvailable(): Promise<HealthAvailability> {
    const { Health } = await import('@capgo/capacitor-health');
    const result = await Health.isAvailable();
    if (result.available) return 'available';
    if (this.platform === 'android' && /update|install/i.test(result.reason ?? '')) return 'needs-install';
    return 'unavailable';
  }

  async requestPermissions(): Promise<boolean> {
    const { Health } = await import('@capgo/capacitor-health');
    try {
      await Health.requestAuthorization({ read: ['workouts'], write: [], requestHistoryAccess: true });
      return true;
    } catch {
      return false;
    }
  }

  async requestReadinessPermissions(): Promise<boolean> {
    const { Health } = await import('@capgo/capacitor-health');
    try {
      await Health.requestAuthorization({ read: READINESS_TYPES, write: [] });
      return true;
    } catch {
      return false;
    }
  }

  async fetchReadiness(sinceIso: string): Promise<ReadinessSnapshot | null> {
    const endIso = new Date().toISOString();
    const [sleepHours, restingHr, hrv] = await Promise.all([
      this.readSleepHours(sinceIso, endIso).catch(() => null),
      this.readLatestValue('restingHeartRate', sinceIso, endIso).catch(() => null),
      this.readLatestValue('heartRateVariability', sinceIso, endIso).catch(() => null),
    ]);
    return {
      sleepHours,
      restingHr,
      hrv,
      source: this.platform === 'ios' ? 'healthkit' : 'healthconnect',
    };
  }

  private async readSleepHours(startIso: string, endIso: string): Promise<number | null> {
    const { Health } = await import('@capgo/capacitor-health');
    const { samples } = await Health.readSamples({
      dataType: 'sleep',
      startDate: startIso,
      endDate: endIso,
      limit: 500,
    });
    const minutes = asleepMinutes(samples);
    return minutes > 0 ? Math.round((minutes / 60) * 10) / 10 : null;
  }

  private async readLatestValue(dataType: HealthDataType, startIso: string, endIso: string): Promise<number | null> {
    const { Health } = await import('@capgo/capacitor-health');
    const { samples } = await Health.readSamples({ dataType, startDate: startIso, endDate: endIso, limit: 10 });
    if (samples.length === 0) return null;
    const latest = samples.reduce((best, sample) => (sample.startDate > best.startDate ? sample : best));
    return Number.isFinite(latest.value) ? latest.value : null;
  }

  async fetchRuns(sinceIso: string): Promise<HealthRun[]> {
    const { Health } = await import('@capgo/capacitor-health');
    const runs: HealthRun[] = [];
    let anchor: string | undefined;
    do {
      const page = await Health.queryWorkouts({
        startDate: sinceIso,
        endDate: new Date().toISOString(),
        limit: 100,
        ...(anchor ? { anchor } : {}),
      });
      for (const workout of page.workouts) {
        if (!isRunningWorkoutType(workout.workoutType)) continue;
        runs.push({
          date: workout.startDate,
          distanceKm: workout.totalDistance ? roundKm(workout.totalDistance) : null,
          durationSec: Math.round(workout.duration),
          externalId: workout.platformId ?? `${workout.sourceId ?? this.platform}:${workout.startDate}`,
          source: this.platform === 'ios' ? 'healthkit' : 'healthconnect',
          sourceName: workout.sourceName ?? (this.platform === 'ios' ? 'Apple Health' : 'Health Connect'),
        });
      }
      anchor = page.anchor;
    } while (anchor);
    return runs;
  }
}

export class MockHealthSource implements HealthSource {
  constructor(private readonly mock: HealthMock) {}

  async isAvailable(): Promise<HealthAvailability> {
    return this.mock.available ?? 'available';
  }

  async requestPermissions(): Promise<boolean> {
    return true;
  }

  async requestReadinessPermissions(): Promise<boolean> {
    return true;
  }

  async fetchRuns(): Promise<HealthRun[]> {
    return this.mock.runs ?? [];
  }

  async fetchReadiness(): Promise<ReadinessSnapshot | null> {
    const readiness = this.mock.readiness;
    if (!readiness) return null;
    return {
      sleepHours: readiness.sleepHours ?? null,
      restingHr: readiness.restingHr ?? null,
      hrv: readiness.hrv ?? null,
      source: 'healthkit',
    };
  }
}

export class WebStubSource implements HealthSource {
  async isAvailable(): Promise<HealthAvailability> {
    return 'unavailable';
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async requestReadinessPermissions(): Promise<boolean> {
    return false;
  }

  async fetchRuns(): Promise<HealthRun[]> {
    return [];
  }

  async fetchReadiness(): Promise<ReadinessSnapshot | null> {
    return null;
  }
}

export function getHealthSource(): HealthSource {
  const mock = typeof window === 'undefined' ? undefined : window.__runcastHealthMock;
  if (mock) return new MockHealthSource(mock);
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') return new CapacitorHealthSource(platform);
  return new WebStubSource();
}
