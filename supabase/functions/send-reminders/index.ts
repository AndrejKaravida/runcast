import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VAPID_SUBJECT = 'https://github.com/AndrejKaravida/runcast';
const DEFAULT_TIME_ZONE = 'Europe/Belgrade';
const TODAY_HOUR = 7;

const RUN_TYPES = new Set(['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS']);

const TYPE_LABELS: Record<string, string> = {
  EASY: 'Lako trčanje',
  LONG: 'Dugi trk',
  TEMPO: 'Tempo',
  INTERVALS: 'Intervali',
  REPETITIONS: 'Ponavljanja',
};

const RUN_WINDOW_HOURS: Record<string, { start: number; end: number }> = {
  morning: { start: 6, end: 9 },
  evening: { start: 17, end: 21 },
  flexible: { start: 6, end: 21 },
};

const RUN_WINDOW_LABELS: Record<string, string> = {
  morning: '06–09 h',
  evening: '17–21 h',
  flexible: '06–21 h',
};

const WEEKDAY_ACCUSATIVE = ['ponedeljak', 'utorak', 'sredu', 'četvrtak', 'petak', 'subotu', 'nedelju'];

const WEATHER_RULES = {
  rainProbabilityPct: 60,
  rainMm: 2,
  heatApparentC: 30,
  coldApparentC: -5,
  windKmh: 40,
} as const;

const TEST_PAYLOAD = {
  title: 'Danas: Lako trčanje 8 km',
  body: 'Najbolji termin: 18h.',
  url: '/today',
};

type ReminderType = 'today' | 'training' | 'weather' | 'missed' | 'recap' | 'raceWeek';

type WeatherCode = 'STORM' | 'RAIN' | 'HEAT' | 'COLD' | 'WIND';

interface PushConfigRow {
  id: number;
  vapid_public: string | null;
  vapid_private: string | null;
  cron_secret: string | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  language: string;
  timezone: string;
  remind_hour: number;
  remind_today: boolean;
  remind_training: boolean;
  remind_weather: boolean;
  remind_missed: boolean;
  remind_recap: boolean;
  remind_race_week: boolean;
}

interface ProfileRow {
  id: string;
  lat: number | null;
  lon: number | null;
  run_window: string;
}

interface WorkoutRow {
  user_id: string;
  type: string;
  distance_km: number;
  title: string;
  status: string;
  workout_date: string;
}

interface RaceRow {
  user_id: string;
  name: string | null;
  race_date: string;
  distance_km: number;
}

interface WeatherNote {
  text: string;
  bad: boolean;
  code: WeatherCode | null;
  detail: number | null;
}

interface SubscriptionSchedule {
  subscription: SubscriptionRow;
  timeZone: string;
  hour: number;
  today: string;
  tomorrow: string;
  dayAfter: string;
  weekStart: string;
  weekEnd: string;
  isSunday: boolean;
  raceDay: string;
}

interface Summary {
  ok: boolean;
  test: boolean;
  subscriptions: number;
  sent: number;
  failed: number;
  removed: number;
  skipped: number;
  types: Record<ReminderType, number>;
}

type AdminClient = ReturnType<typeof createClient>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function localDate(offsetDays: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return new Date(Date.UTC(values.year, values.month - 1, values.day + offsetDays)).toISOString().slice(0, 10);
}

function safeTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function localHour(timeZone: string): number {
  const formatted = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(
    new Date(),
  );
  return Number(formatted);
}

function localWeekday(timeZone: string): number {
  const formatted = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(new Date());
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(formatted);
}

function dayName(date: string): string {
  const index = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return WEEKDAY_ACCUSATIVE[index];
}

function formatKm(distance: number): string {
  const km = Math.round(distance * 10) / 10;
  return Number.isInteger(km) ? String(km) : km.toFixed(1);
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function ensureConfig(admin: AdminClient): Promise<PushConfigRow> {
  const { data } = await admin.from('push_config').select('*').eq('id', 1).maybeSingle();
  if (data) return data as PushConfigRow;

  const keys = webpush.generateVAPIDKeys();
  await admin.from('push_config').upsert(
    {
      id: 1,
      vapid_public: keys.publicKey,
      vapid_private: keys.privateKey,
      cron_secret: randomSecret(),
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  const { data: created } = await admin.from('push_config').select('*').eq('id', 1).single();
  return created as PushConfigRow;
}

async function hourlyForecast(
  profile: ProfileRow | null,
  timeZone: string,
  fields: string,
  forecastDays: number,
): Promise<Record<string, unknown> | null> {
  if (!profile || profile.lat === null || profile.lon === null) return null;
  const params = new URLSearchParams({
    latitude: String(profile.lat),
    longitude: String(profile.lon),
    hourly: fields,
    timezone: timeZone,
    forecast_days: String(forecastDays),
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as { hourly?: Record<string, unknown> };
  return payload.hourly ?? null;
}

function windowIndices(
  hourly: Record<string, unknown>,
  date: string,
  window: { start: number; end: number },
): number[] {
  const times = hourly.time;
  if (!Array.isArray(times)) return [];
  const indices: number[] = [];
  (times as string[]).forEach((time, index) => {
    const hour = Number(time.slice(11, 13));
    if (time.startsWith(date) && hour >= window.start && hour < window.end) indices.push(index);
  });
  return indices;
}

function windowFor(profile: ProfileRow | null): { start: number; end: number } {
  return RUN_WINDOW_HOURS[profile?.run_window ?? 'flexible'] ?? RUN_WINDOW_HOURS.flexible;
}

async function weatherFor(profile: ProfileRow | null, timeZone: string, date: string): Promise<WeatherNote | null> {
  const hourly = await hourlyForecast(
    profile,
    timeZone,
    'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    3,
  );
  if (!hourly) return null;
  const indices = windowIndices(hourly, date, windowFor(profile));
  if (indices.length === 0) return null;

  const series = (key: string): number[] =>
    indices.map((index) => Number((hourly[key] as number[] | undefined)?.[index] ?? 0));
  const maxRainPct = Math.round(Math.max(...series('precipitation_probability')));
  const rainMm = series('precipitation').reduce((sum, value) => sum + value, 0);
  const maxApparent = Math.round(Math.max(...series('apparent_temperature')));
  const minApparent = Math.round(Math.min(...series('apparent_temperature')));
  const maxGust = Math.round(Math.max(...series('wind_gusts_10m')));
  const storm = series('weather_code').some((code) => code >= 95);

  if (storm) return { text: 'Grmljavina: preporuka je da prebaciš trening.', bad: true, code: 'STORM', detail: null };
  if (maxRainPct >= WEATHER_RULES.rainProbabilityPct || rainMm >= WEATHER_RULES.rainMm) {
    return { text: `Kiša ${maxRainPct}%, razmisli o zameni ili traci.`, bad: true, code: 'RAIN', detail: maxRainPct };
  }
  if (maxApparent >= WEATHER_RULES.heatApparentC) {
    return { text: `Vruće (${maxApparent}°). Kreni ranije i pij vodu.`, bad: true, code: 'HEAT', detail: maxApparent };
  }
  if (minApparent <= WEATHER_RULES.coldApparentC) {
    return { text: `Hladno (${minApparent}°). Obuci se slojevito.`, bad: true, code: 'COLD', detail: minApparent };
  }
  if (maxGust >= WEATHER_RULES.windKmh) {
    return { text: `Jak vetar (${maxGust} km/h). Biraj zaklon.`, bad: true, code: 'WIND', detail: maxGust };
  }
  return { text: `Vreme za trening: ${maxApparent}°.`, bad: false, code: null, detail: null };
}

async function bestHourFor(profile: ProfileRow | null, timeZone: string, date: string): Promise<number | null> {
  const hourly = await hourlyForecast(profile, timeZone, 'apparent_temperature,precipitation_probability', 2);
  if (!hourly) return null;
  const indices = windowIndices(hourly, date, windowFor(profile));
  if (indices.length === 0) return null;
  const times = hourly.time as string[];
  const scored = indices.map((index) => ({
    hour: Number(times[index].slice(11, 13)),
    rain: Number((hourly.precipitation_probability as number[] | undefined)?.[index] ?? 0),
    apparent: Number((hourly.apparent_temperature as number[] | undefined)?.[index] ?? 15),
  }));
  scored.sort((a, b) => a.rain - b.rain || Math.abs(a.apparent - 15) - Math.abs(b.apparent - 15) || a.hour - b.hour);
  return scored[0].hour;
}

async function cachedWeatherNote(
  profile: ProfileRow | null,
  timeZone: string,
  date: string,
  cache: Map<string, WeatherNote | null>,
): Promise<WeatherNote | null> {
  const key = `${profile?.lat ?? ''},${profile?.lon ?? ''},${profile?.run_window ?? ''},${timeZone},${date}`;
  if (!cache.has(key)) cache.set(key, await weatherFor(profile, timeZone, date));
  return cache.get(key) ?? null;
}

async function cachedBestHour(
  profile: ProfileRow | null,
  timeZone: string,
  date: string,
  cache: Map<string, number | null>,
): Promise<number | null> {
  const key = `${profile?.lat ?? ''},${profile?.lon ?? ''},${profile?.run_window ?? ''},${timeZone},${date}`;
  if (!cache.has(key)) cache.set(key, await bestHourFor(profile, timeZone, date));
  return cache.get(key) ?? null;
}

function weatherSuggestion(note: WeatherNote, nextDay: string): string {
  const day = dayName(nextDay);
  if (note.code === 'STORM') return `Sutra grmljavina, predlog: prebaci na ${day}.`;
  if (note.code === 'RAIN') return `Sutra kiša (${note.detail ?? 0}%), predlog: prebaci na ${day}.`;
  if (note.code === 'HEAT') return `Sutra vruće (${note.detail ?? 0}°), predlog: kreni ranije ili prebaci na ${day}.`;
  if (note.code === 'COLD') return `Sutra hladno (${note.detail ?? 0}°), predlog: obuci se slojevito.`;
  if (note.code === 'WIND') return `Sutra jak vetar (${note.detail ?? 0} km/h), predlog: biraj zaklon.`;
  return note.text;
}

function bodyFor(profile: ProfileRow | null, note: WeatherNote | null): string {
  const timeLabel = RUN_WINDOW_LABELS[profile?.run_window ?? 'flexible'] ?? RUN_WINDOW_LABELS.flexible;
  const parts = [`Planirano za ${timeLabel}.`];
  if (note) parts.push(note.text);
  return parts.join(' ');
}

async function sendTo(
  admin: AdminClient,
  subscription: SubscriptionRow,
  payload: { title: string; body: string; url: string },
  summary: Summary,
  type: ReminderType,
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    summary.sent += 1;
    summary.types[type] += 1;
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode ?? 0);
    if (statusCode === 404 || statusCode === 410) {
      await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      summary.removed += 1;
    } else {
      summary.failed += 1;
    }
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = (await request.json().catch(() => ({}))) as { test?: boolean };
    const test = body.test === true;
    const config = await ensureConfig(admin);

    const cronSecret = request.headers.get('x-cron-secret');
    const authorizedAsCron = Boolean(cronSecret) && cronSecret === config.cron_secret;
    let targetUserId: string | null = null;
    if (!authorizedAsCron && test) {
      const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
      if (token) {
        const userClient = createClient(supabaseUrl, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data } = await userClient.auth.getUser(token);
        targetUserId = data.user?.id ?? null;
      }
    }
    if (!authorizedAsCron && !targetUserId) return json({ ok: false, error: 'unauthorized' }, 401);

    const query = admin.from('push_subscriptions').select('*');
    const { data: rows, error } = targetUserId ? await query.eq('user_id', targetUserId) : await query;
    if (error) throw error;
    const subscriptions = (rows ?? []) as SubscriptionRow[];

    webpush.setVapidDetails(VAPID_SUBJECT, config.vapid_public ?? '', config.vapid_private ?? '');

    const summary: Summary = {
      ok: true,
      test: test && targetUserId !== null,
      subscriptions: subscriptions.length,
      sent: 0,
      failed: 0,
      removed: 0,
      skipped: 0,
      types: { today: 0, training: 0, weather: 0, missed: 0, recap: 0, raceWeek: 0 },
    };
    if (subscriptions.length === 0) return json(summary);

    if (summary.test) {
      for (const subscription of subscriptions) {
        await sendTo(admin, subscription, TEST_PAYLOAD, summary, 'today');
      }
      return json(summary);
    }

    const userIds = [...new Set(subscriptions.map((subscription) => subscription.user_id))];
    const schedules: SubscriptionSchedule[] = [];
    const workoutDates = new Set<string>();
    const raceDates = new Set<string>();
    for (const subscription of subscriptions) {
      const timeZone = safeTimeZone(subscription.timezone || DEFAULT_TIME_ZONE);
      const weekday = localWeekday(timeZone);
      const today = localDate(0, timeZone);
      const tomorrow = localDate(1, timeZone);
      const raceDay = localDate(7, timeZone);
      workoutDates.add(today);
      workoutDates.add(tomorrow);
      for (let offset = -weekday; offset <= 6 - weekday; offset += 1) workoutDates.add(localDate(offset, timeZone));
      raceDates.add(raceDay);
      schedules.push({
        subscription,
        timeZone,
        hour: localHour(timeZone),
        today,
        tomorrow,
        dayAfter: localDate(2, timeZone),
        weekStart: localDate(-weekday, timeZone),
        weekEnd: localDate(6 - weekday, timeZone),
        isSunday: weekday === 6,
        raceDay,
      });
    }
    const sortedDates = [...workoutDates].sort();

    const [profilesResult, workoutsResult, racesResult] = await Promise.all([
      admin.from('profiles').select('id, lat, lon, run_window').in('id', userIds),
      admin
        .from('workouts')
        .select('user_id, type, distance_km, title, status, workout_date')
        .gte('workout_date', sortedDates[0])
        .lte('workout_date', sortedDates[sortedDates.length - 1])
        .in('user_id', userIds),
      admin
        .from('races')
        .select('user_id, name, race_date, distance_km')
        .in('race_date', [...raceDates])
        .in('user_id', userIds),
    ]);
    const profileById = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
    const workouts = (workoutsResult.data ?? []) as WorkoutRow[];
    const races = (racesResult.data ?? []) as RaceRow[];
    const weatherCache = new Map<string, WeatherNote | null>();
    const bestHourCache = new Map<string, number | null>();

    for (const schedule of schedules) {
      const subscription = schedule.subscription;
      let sentForSubscription = 0;
      const profile = profileById.get(subscription.user_id) ?? null;
      const userWorkouts = workouts.filter((row) => row.user_id === subscription.user_id);
      const plannedRun = (date: string): WorkoutRow | undefined =>
        userWorkouts.find((row) => row.workout_date === date && row.status === 'PLANNED' && RUN_TYPES.has(row.type));

      if (subscription.remind_today && schedule.hour === TODAY_HOUR) {
        const workout = plannedRun(schedule.today);
        if (workout) {
          const bestHour = await cachedBestHour(profile, schedule.timeZone, schedule.today, bestHourCache);
          const window = windowFor(profile);
          await sendTo(
            admin,
            subscription,
            {
              title: `Danas: ${TYPE_LABELS[workout.type] ?? workout.title} ${formatKm(workout.distance_km)} km`,
              body: `Najbolji termin: ${bestHour ?? window.start}h.`,
              url: '/today',
            },
            summary,
            'today',
          );
          sentForSubscription += 1;
        }
      }

      if (schedule.hour === subscription.remind_hour) {
        const workout = plannedRun(schedule.tomorrow);

        if (subscription.remind_training && workout) {
          const note = await cachedWeatherNote(profile, schedule.timeZone, schedule.tomorrow, weatherCache);
          await sendTo(
            admin,
            subscription,
            {
              title: `Sutra: ${TYPE_LABELS[workout.type] ?? workout.title} ${formatKm(workout.distance_km)} km`,
              body: bodyFor(profile, note),
              url: '/today',
            },
            summary,
            'training',
          );
          sentForSubscription += 1;
        }

        if (subscription.remind_weather && workout) {
          const note = await cachedWeatherNote(profile, schedule.timeZone, schedule.tomorrow, weatherCache);
          if (note?.bad) {
            await sendTo(
              admin,
              subscription,
              {
                title: 'Vremensko upozorenje',
                body: weatherSuggestion(note, schedule.dayAfter),
                url: '/today',
              },
              summary,
              'weather',
            );
            sentForSubscription += 1;
          }
        }

        if (subscription.remind_recap && schedule.isSunday) {
          const weekWorkouts = userWorkouts.filter(
            (row) =>
              row.workout_date >= schedule.weekStart && row.workout_date <= schedule.weekEnd && RUN_TYPES.has(row.type),
          );
          const planned = weekWorkouts.reduce((sum, row) => sum + row.distance_km, 0);
          if (planned > 0) {
            const done = weekWorkouts
              .filter((row) => row.status === 'DONE')
              .reduce((sum, row) => sum + row.distance_km, 0);
            await sendTo(
              admin,
              subscription,
              {
                title: 'Nedeljni rezime',
                body: `Istrčano ${formatKm(done)} od ${formatKm(planned)} km ove nedelje.`,
                url: '/today',
              },
              summary,
              'recap',
            );
            sentForSubscription += 1;
          }
        }

        if (subscription.remind_race_week) {
          const race = races.find((row) => row.user_id === subscription.user_id && row.race_date === schedule.raceDay);
          if (race) {
            await sendTo(
              admin,
              subscription,
              {
                title: 'Trka za 7 dana',
                body: `${race.name ?? 'Trka'} je za nedelju dana. Drži se plana i odmori pred start.`,
                url: '/today',
              },
              summary,
              'raceWeek',
            );
            sentForSubscription += 1;
          }
        }
      }

      if (subscription.remind_missed && schedule.hour === subscription.remind_hour + 2) {
        const workout = plannedRun(schedule.today);
        if (workout) {
          await sendTo(
            admin,
            subscription,
            {
              title: `Današnji trening: ${TYPE_LABELS[workout.type] ?? workout.title} ${formatKm(workout.distance_km)} km`,
              body: 'Još nije upisan. Ako ne stigneš danas, prebaci ga na drugi dan.',
              url: '/today',
            },
            summary,
            'missed',
          );
          sentForSubscription += 1;
        }
      }

      if (sentForSubscription === 0) summary.skipped += 1;
    }

    return json(summary);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'unexpected error' }, 500);
  }
});
