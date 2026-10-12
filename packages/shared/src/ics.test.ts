import { describe, expect, it } from 'vitest';
import {
  buildGoogleCalendarUrl,
  buildIcs,
  buildPlanEvents,
  escapeIcsText,
  foldIcsLine,
  RUN_WINDOW_START_HOUR,
  type IcsEvent,
  type IcsWorkout,
} from './ics';
import type { PlanPaces } from './types';

const PACES: PlanPaces = {
  easySlowSecPerKm: 360,
  easyFastSecPerKm: 330,
  marathonSecPerKm: 312,
  thresholdSecPerKm: 300,
  intervalSecPerKm: 285,
  repetitionSecPerKm: 270,
};

function workout(overrides: Partial<IcsWorkout> = {}): IcsWorkout {
  return {
    id: 'w1',
    date: '2026-10-20',
    type: 'EASY',
    title: 'Lako trčanje 8 km',
    distanceKm: 8,
    durationSec: null,
    steps: [{ label: 'E tempo', distanceKm: 8, pace: '5:40' }],
    ...overrides,
  };
}

function unfold(ics: string): string {
  return ics.replace(/\r\n /g, '');
}

describe('escapeIcsText', () => {
  it('escape-uje zarez, tačku-zarez i backslash bez dupliranja', () => {
    expect(escapeIcsText('a,b;c')).toBe('a\\,b\\;c');
    expect(escapeIcsText('put\\naz')).toBe('put\\\\naz');
    expect(escapeIcsText('\\,')).toBe('\\\\\\,');
  });

  it('normalizuje CRLF/CR/LF u literalno \\n', () => {
    expect(escapeIcsText('prva\r\ndruga\rtreća\nčetvrta')).toBe('prva\\ndruga\\ntreća\\nčetvrta');
  });

  it('čuva srpsku dijakritiku', () => {
    expect(escapeIcsText('Čučnjevi, ž;đ')).toBe('Čučnjevi\\, ž\\;đ');
  });
});

describe('foldIcsLine', () => {
  it('ne menja liniju do 75 okteta', () => {
    const line = 'SUMMARY:Lako trčanje 8 km';
    expect(foldIcsLine(line)).toBe(line);
  });

  it('fold-uje na 75 okteta po UTF-8 granicama sa space nastavkom', () => {
    const line = `SUMMARY:${'čćžšđ'.repeat(30)}`;
    const folded = foldIcsLine(line);
    const physical = folded.split('\r\n');
    expect(physical.length).toBeGreaterThan(1);
    for (const part of physical) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
    for (const part of physical.slice(1)) {
      expect(part.startsWith(' ')).toBe(true);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('radi i sa nižim budžetom okteta', () => {
    const folded = foldIcsLine('SUMMARY:ČĆŽŠĐČĆŽŠĐ', 10);
    for (const part of folded.split('\r\n')) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(10);
    }
    expect(folded.replace(/\r\n /g, '')).toBe('SUMMARY:ČĆŽŠĐČĆŽŠĐ');
  });
});

describe('buildIcs', () => {
  const EVENT: IcsEvent = {
    uid: 'workout-w1@runcast.app',
    date: '2026-10-20',
    startHour: 7,
    durationMinutes: 45,
    summary: 'Lako trčanje, 8 km',
    description: 'Lako trčanje 8 km\n\n1. E tempo\n\nRunCast plan',
  };

  it('gradi validan envelope i za praznu listu', () => {
    const ics = buildIcs([], { now: new Date('2026-01-02T03:04:05Z') });
    const lines = ics.split('\r\n').filter((line) => line !== '');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('PRODID:-//RunCast//Plan Export 1.0//SR');
    expect(lines[lines.length - 1]).toBe('END:VCALENDAR');
  });

  it('koristi isključivo CRLF i završava CRLF-om', () => {
    const ics = buildIcs([EVENT], { now: new Date('2026-01-02T03:04:05Z') });
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('upisuje VEVENT polja sa fiksnim DTSTAMP i escape-ovanim tekstom', () => {
    const ics = buildIcs([EVENT], { now: new Date('2026-01-02T03:04:05Z') });
    expect(ics).toContain('UID:workout-w1@runcast.app');
    expect(ics).toContain('DTSTAMP:20260102T030405Z');
    expect(ics).toContain('DTSTART:20261020T070000');
    expect(ics).toContain('DTEND:20261020T074500');
    expect(ics).toContain('SUMMARY:Lako trčanje\\, 8 km');
    expect(ics).toContain('1. E tempo\\n\\nRunCast plan');
    expect(ics).not.toContain('TZID');
    expect(ics).not.toMatch(/DTSTART:[^\r\n]*Z/);
  });
});

describe('buildPlanEvents', () => {
  it('dodeljuje sat po run_window', () => {
    expect(RUN_WINDOW_START_HOUR).toEqual({ morning: 7, evening: 18, flexible: 9 });
    const [morning] = buildPlanEvents([workout()], { runWindow: 'morning' });
    const [evening] = buildPlanEvents([workout()], { runWindow: 'evening' });
    const [flexible] = buildPlanEvents([workout()], { runWindow: 'flexible' });
    expect(morning.startHour).toBe(7);
    expect(evening.startHour).toBe(18);
    expect(flexible.startHour).toBe(9);
  });

  it('izbacuje REST i uključuje STRENGTH sa stabilnim UID-om', () => {
    const events = buildPlanEvents(
      [
        workout({ id: 'rest', type: 'REST', title: 'Odmor', distanceKm: 0, steps: [] }),
        workout({ id: 'strength', type: 'STRENGTH', title: 'Snaga A — noge i core', distanceKm: 0, steps: [] }),
      ],
      { runWindow: 'evening' },
    );
    expect(events).toHaveLength(1);
    expect(events[0].uid).toBe('workout-strength@runcast.app');
    expect(events[0].summary).toBe('Snaga A — noge i core');
  });

  it('računa trajanje: durationSec → zbir koraka → distanca × easySlow → 6:00/km', () => {
    const durationSec = buildPlanEvents([workout({ durationSec: 2700 })], { runWindow: 'morning' });
    expect(durationSec[0].durationMinutes).toBe(45);
    const fromSteps = buildPlanEvents(
      [
        workout({
          steps: [
            { label: 'a', durationSec: 1200 },
            { label: 'b', durationSec: 300 },
          ],
        }),
      ],
      { runWindow: 'morning' },
    );
    expect(fromSteps[0].durationMinutes).toBe(25);
    const fromDistance = buildPlanEvents([workout()], { runWindow: 'morning', paces: PACES });
    expect(fromDistance[0].durationMinutes).toBe(48);
    const defaultPace = buildPlanEvents([workout()], { runWindow: 'morning' });
    expect(defaultPace[0].durationMinutes).toBe(48);
    const minimum = buildPlanEvents([workout({ durationSec: 10, distanceKm: 0, steps: [] })], {
      runWindow: 'morning',
    });
    expect(minimum[0].durationMinutes).toBe(1);
  });

  it('gradi numerisane korake u opisu', () => {
    const [event] = buildPlanEvents([workout()], { runWindow: 'morning', paces: PACES });
    expect(event.description).toBe('Lako trčanje 8 km\n\n1. E tempo · 8 km · 5:40 /km\n\nRunCast plan');
  });

  it('za snagu koristi trajanje koraka u opisu', () => {
    const [event] = buildPlanEvents(
      [
        workout({
          type: 'STRENGTH',
          title: 'Mobilnost 20 min',
          distanceKm: 0,
          durationSec: 1200,
          steps: [{ label: 'Čučnjevi — 2×12', durationSec: 150 }],
        }),
      ],
      { runWindow: 'flexible' },
    );
    expect(event.description).toBe('Mobilnost 20 min\n\n1. Čučnjevi — 2×12 · 2:30\n\nRunCast plan');
  });
});

describe('buildGoogleCalendarUrl', () => {
  it('gradi TEMPLATE link bez Z i bez ctz', () => {
    const [event] = buildPlanEvents([workout({ durationSec: 2700 })], { runWindow: 'morning' });
    const url = new URL(buildGoogleCalendarUrl(event));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe(event.summary);
    expect(url.searchParams.get('dates')).toBe('20261020T070000/20261020T074500');
    expect(url.searchParams.get('dates')).not.toContain('Z');
    expect(url.searchParams.get('details')).toBe(event.description);
    expect(url.searchParams.has('ctz')).toBe(false);
  });

  it('poklapa se sa DTSTART/DTEND iz ICS-a', () => {
    const [event] = buildPlanEvents([workout({ durationSec: 5400 })], { runWindow: 'evening' });
    const ics = unfold(buildIcs([event], { now: new Date('2026-01-02T03:04:05Z') }));
    const start = ics.match(/DTSTART:(\S+)/)?.[1];
    const end = ics.match(/DTEND:(\S+)/)?.[1];
    const dates = new URL(buildGoogleCalendarUrl(event)).searchParams.get('dates');
    expect(dates).toBe(`${start}/${end}`);
  });
});
