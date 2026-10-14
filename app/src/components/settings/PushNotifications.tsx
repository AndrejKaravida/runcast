import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppSelect } from '@/components/ui/AppSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  fetchPushPublicKey,
  useDeletePushSubscription,
  usePushSubscription,
  useSavePushSubscription,
  useSendTestPush,
  useUpdatePushPreferences,
} from '@/features/push/queries';
import {
  pushPermission,
  serviceWorkerRegistration,
  urlBase64ToUint8Array,
  type PushPermission,
} from '@/features/push/push';
import { deviceTimeZone } from '@/lib/dates';
import type { PushSubscriptionsUpdate } from '@/types';

const TOGGLE_OPTIONS = [
  { value: 'on', labelKey: 'push.on' },
  { value: 'off', labelKey: 'push.off' },
] as const;

const REMINDERS = [
  { key: 'remind_today', labelKey: 'push.today', testId: 'push-today' },
  { key: 'remind_training', labelKey: 'push.training', testId: 'push-training' },
  { key: 'remind_weather', labelKey: 'push.weather', testId: 'push-weather' },
  { key: 'remind_missed', labelKey: 'push.missed', testId: 'push-missed' },
  { key: 'remind_race_week', labelKey: 'push.raceWeek', testId: 'push-race-week' },
  { key: 'remind_recap', labelKey: 'push.recap', testId: 'push-recap' },
] as const;

type ReminderKey = (typeof REMINDERS)[number]['key'];

const HOURS = Array.from({ length: 18 }, (_, index) => index + 5);

function PushSkeleton() {
  return (
    <div data-testid="push-skeleton" className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11" />
      </div>
    </div>
  );
}

export function PushNotifications() {
  const { t, i18n } = useTranslation('settings');
  const { data: subscription, isLoading: subscriptionLoading } = usePushSubscription();
  const saveSubscription = useSavePushSubscription();
  const updatePreferences = useUpdatePushPreferences();
  const deleteSubscription = useDeletePushSubscription();
  const sendTest = useSendTestPush();

  const [permission, setPermission] = useState<PushPermission>(pushPermission);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'sr';
  const options = TOGGLE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }));

  if (permission === 'unsupported') {
    return (
      <AppCard>
        <p data-testid="push-unsupported" className="text-sm text-text-muted">
          {t('push.unsupported')}
        </p>
      </AppCard>
    );
  }

  async function handleEnable() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setError(t('push.denied'));
        return;
      }
      const registration = await serviceWorkerRegistration();
      const publicKey = await fetchPushPublicKey();
      if (!publicKey) {
        setError(t('push.notConfigured'));
        return;
      }
      const browserSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = browserSubscription.toJSON();
      await saveSubscription.mutateAsync({
        endpoint: browserSubscription.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
        language,
        timezone: deviceTimeZone(),
        remind_hour: subscription?.remind_hour ?? 18,
        remind_today: subscription?.remind_today ?? true,
        remind_training: subscription?.remind_training ?? true,
        remind_weather: subscription?.remind_weather ?? true,
        remind_missed: subscription?.remind_missed ?? true,
        remind_recap: subscription?.remind_recap ?? true,
        remind_race_week: subscription?.remind_race_week ?? true,
      });
      setNotice(t('push.enabled'));
    } catch {
      setError(t('push.unavailable'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      let endpoint = subscription?.endpoint ?? null;
      const registration = await serviceWorkerRegistration(2000).catch(() => null);
      const browserSubscription = registration
        ? await registration.pushManager.getSubscription().catch(() => null)
        : null;
      if (browserSubscription) {
        endpoint = browserSubscription.endpoint;
        await browserSubscription.unsubscribe();
      }
      await deleteSubscription.mutateAsync(endpoint);
      setNotice(t('push.disabled'));
    } catch {
      setError(t('push.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  function handlePreference(key: ReminderKey, value: boolean) {
    if (!subscription) return;
    setError(null);
    const patch: { id: string } & PushSubscriptionsUpdate = { id: subscription.id };
    patch[key] = value;
    updatePreferences.mutate(patch, { onError: () => setError(t('push.saveFailed')) });
  }

  function handleHour(hour: number) {
    if (!subscription) return;
    setError(null);
    updatePreferences.mutate(
      { id: subscription.id, remind_hour: hour },
      { onError: () => setError(t('push.saveFailed')) },
    );
  }

  async function handleTest() {
    setError(null);
    setNotice(null);
    try {
      await sendTest.mutateAsync();
      setNotice(t('push.testSent'));
    } catch {
      setError(t('push.testFailed'));
    }
  }

  return (
    <AppCard className="space-y-4">
      {permission === 'denied' && !subscription ? (
        <p data-testid="push-denied" className="text-sm text-text-muted">
          {t('push.denied')}
        </p>
      ) : null}

      {subscriptionLoading ? (
        <PushSkeleton />
      ) : (
        <>
          <div data-testid="push-master" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('push.master')}</p>
              {busy ? <p className="text-caption text-text-muted">{t('push.working')}</p> : null}
            </div>
            <SegmentedControl
              value={subscription ? 'on' : 'off'}
              onChange={(value) => {
                if (value === 'on') void handleEnable();
                else void handleDisable();
              }}
              options={options}
            />
            <p className="text-caption text-text-muted">{t('push.hint')}</p>
          </div>

          {subscription ? (
            <>
              <p data-testid="push-status" className="text-sm text-success-ink">
                {t('push.enabled')}
              </p>
              <AppSelect
                data-testid="push-hour"
                label={t('push.hour')}
                value={String(subscription.remind_hour)}
                onChange={(event) => handleHour(Number(event.target.value))}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {t('push.hourOption', { hour })}
                  </option>
                ))}
              </AppSelect>
              {REMINDERS.map((reminder) => (
                <div key={reminder.key} data-testid={reminder.testId}>
                  <p className="section-label mb-1.5">{t(reminder.labelKey)}</p>
                  <SegmentedControl
                    value={subscription[reminder.key] ? 'on' : 'off'}
                    onChange={(value) => handlePreference(reminder.key, value === 'on')}
                    options={options}
                  />
                </div>
              ))}
              <AppButton
                type="button"
                variant="secondary"
                className="w-full"
                data-testid="push-test"
                loading={sendTest.isPending}
                onClick={() => void handleTest()}
              >
                {t('push.test')}
              </AppButton>
            </>
          ) : null}
        </>
      )}

      {notice ? (
        <p data-testid="push-notice" role="status" className="text-sm text-success-ink">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p data-testid="push-error" role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
    </AppCard>
  );
}
