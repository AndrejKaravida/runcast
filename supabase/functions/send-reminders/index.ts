import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VAPID_SUBJECT = 'https://github.com/AndrejKaravida/runcast';
const TIME_ZONE = 'Europe/Belgrade';

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

// Pragovi su namerno duplirani iz packages/shared/src/weather-rules.ts — Deno funkcija ne uvozi workspace paket.
const WEATHER_RULES = {
  rainProbabilityPct: 60,
  rainMm: 2,
  heatApparentC: 30,
  coldApparentC: -5,
  windKmh: 40,
} as const;

const TEST_PAYLOAD = {
  title: 'RunCast test',
  body: 'Notifikacije rade — vidimo se na treningu!',
  url: '/today',
};

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
  remind_training: boolean;
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
}

interface Summary {
  ok: boolean;
  test: boolean;
  subscriptions: number;
  sent: number;
  failed: number;
  removed: number;
  skipped: number;
}

type AdminClient = ReturnType<typeof createClient>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function localDate(offsetDays: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
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

async function weatherFor(profile: ProfileRow | null): Promise<WeatherNote | null> {
  if (!profile || profile.lat === null || profile.lon === null) return null;
  const params = new URLSearchParams({
    latitude: String(profile.lat),
    longitude: String(profile.lon),
    hourly:
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    timezone: 'auto',
    forecast_days: '3',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as { hourly?: Record<string, unknown> };
  const hourly = payload.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return null;

  const window = RUN_WINDOW_HOURS[profile.run_window] ?? RUN_WINDOW_HOURS.flexible;
  const tomorrow = localDate(1);
  const indices: number[] = [];
  (hourly.time as string[]).forEach((time, index) => {
    const hour = Number(time.slice(11, 13));
    if (time.startsWith(tomorrow) && hour >= window.start && hour < window.end) indices.push(index);
  });
  if (indices.length === 0) return null;

  const series = (key: string): number[] =>
    indices.map((index) => Number((hourly[key] as number[] | undefined)?.[index] ?? 0));
  const maxRainPct = Math.round(Math.max(...series('precipitation_probability')));
  const rainMm = series('precipitation').reduce((sum, value) => sum + value, 0);
  const maxApparent = Math.round(Math.max(...series('apparent_temperature')));
  const minApparent = Math.round(Math.min(...series('apparent_temperature')));
  const maxGust = Math.round(Math.max(...series('wind_gusts_10m')));
  const storm = series('weather_code').some((code) => code >= 95);

  if (storm) return { text: 'Grmljavina — preporuka je da prebaciš trening.', bad: true };
  if (maxRainPct >= WEATHER_RULES.rainProbabilityPct || rainMm >= WEATHER_RULES.rainMm) {
    return { text: `Kiša ${maxRainPct}% — razmisli o zameni ili traci.`, bad: true };
  }
  if (maxApparent >= WEATHER_RULES.heatApparentC) {
    return { text: `Vruće (${maxApparent}°) — kreni ranije i pij vodu.`, bad: true };
  }
  if (minApparent <= WEATHER_RULES.coldApparentC) {
    return { text: `Hladno (${minApparent}°) — obuci se slojevito.`, bad: true };
  }
  if (maxGust >= WEATHER_RULES.windKmh) {
    return { text: `Jak vetar (${maxGust} km/h) — biraj zaklon.`, bad: true };
  }
  return { text: `Vreme za trening: ${maxApparent}°.`, bad: false };
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
    };
    if (subscriptions.length === 0) return json(summary);

    if (summary.test) {
      for (const subscription of subscriptions) {
        await sendTo(admin, subscription, TEST_PAYLOAD, summary);
      }
      return json(summary);
    }

    const tomorrow = localDate(1);
    const raceDay = localDate(7);
    const userIds = [...new Set(subscriptions.map((subscription) => subscription.user_id))];
    const [profilesResult, workoutsResult, racesResult] = await Promise.all([
      admin.from('profiles').select('id, lat, lon, run_window').in('id', userIds),
      admin
        .from('workouts')
        .select('user_id, type, distance_km, title')
        .eq('workout_date', tomorrow)
        .eq('status', 'PLANNED')
        .in('user_id', userIds),
      admin
        .from('races')
        .select('user_id, name, race_date, distance_km')
        .eq('race_date', raceDay)
        .in('user_id', userIds),
    ]);
    const profileById = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
    const workouts = (workoutsResult.data ?? []) as WorkoutRow[];
    const races = (racesResult.data ?? []) as RaceRow[];
    const weatherCache = new Map<string, WeatherNote | null>();

    for (const subscription of subscriptions) {
      let sentForSubscription = 0;
      const profile = profileById.get(subscription.user_id) ?? null;

      if (subscription.remind_training) {
        const workout = workouts.find((row) => row.user_id === subscription.user_id && RUN_TYPES.has(row.type));
        if (workout) {
          const cacheKey = `${profile?.lat ?? ''},${profile?.lon ?? ''},${profile?.run_window ?? ''}`;
          if (!weatherCache.has(cacheKey)) weatherCache.set(cacheKey, await weatherFor(profile));
          const note = weatherCache.get(cacheKey) ?? null;
          await sendTo(
            admin,
            subscription,
            {
              title: `Sutra: ${TYPE_LABELS[workout.type] ?? workout.title} ${formatKm(workout.distance_km)} km`,
              body: bodyFor(profile, note),
              url: '/today',
            },
            summary,
          );
          sentForSubscription += 1;
        }
      }

      if (subscription.remind_race_week) {
        const race = races.find((row) => row.user_id === subscription.user_id);
        if (race) {
          await sendTo(
            admin,
            subscription,
            {
              title: 'Trka za 7 dana',
              body: `${race.name ?? 'Trka'} je za nedelju dana — drži se plana i odmori pred start.`,
              url: '/today',
            },
            summary,
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
