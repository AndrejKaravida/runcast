import { Capacitor } from '@capacitor/core';
import type { HealthRun } from '@runcast/shared';

export type HealthAvailability = 'available' | 'needs-install' | 'unavailable';

export interface HealthSource {
  isAvailable(): Promise<HealthAvailability>;
  requestPermissions(): Promise<boolean>;
  fetchRuns(sinceIso: string): Promise<HealthRun[]>;
}

export interface HealthMock {
  available?: HealthAvailability;
  runs?: HealthRun[];
}

declare global {
  interface Window {
    __runcastHealthMock?: HealthMock;
  }
}

const RUNNING_WORKOUT_TYPES = ['running', 'runningTreadmill'];

function isRunningWorkoutType(type: string): boolean {
  return RUNNING_WORKOUT_TYPES.includes(type);
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

  async fetchRuns(): Promise<HealthRun[]> {
    return this.mock.runs ?? [];
  }
}

export class WebStubSource implements HealthSource {
  async isAvailable(): Promise<HealthAvailability> {
    return 'unavailable';
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async fetchRuns(): Promise<HealthRun[]> {
    return [];
  }
}

export function getHealthSource(): HealthSource {
  const mock = typeof window === 'undefined' ? undefined : window.__runcastHealthMock;
  if (mock) return new MockHealthSource(mock);
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') return new CapacitorHealthSource(platform);
  return new WebStubSource();
}
