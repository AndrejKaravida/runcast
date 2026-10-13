import { Bell, CalendarDays, ChevronRight, Footprints, HeartPulse, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { useProfile } from '@/features/profile/queries';
import { useAuth } from '@/auth/AuthProvider';
import { setLanguage, type AppLanguage } from '@/i18n';

export function SettingsPage() {
  const { session, signOut } = useAuth();
  const { t, i18n } = useTranslation('settings');
  const { data: profile } = useProfile();

  const language: AppLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'sr';

  return (
    <div className="space-y-6">
      <Link
        to="/settings/profile"
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99]"
      >
        <Avatar
          src={profile?.avatar_url ?? null}
          name={profile?.display_name ?? session?.user.email ?? null}
          className="h-11 w-11"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{profile?.display_name ?? session?.user.email}</span>
          <span className="block break-all text-caption text-text-muted">{session?.user.email}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
      </Link>

      <section className="space-y-2">
        <SectionHeader label={t('language.label')} />
        <AppCard>
          <SegmentedControl
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'sr', label: t('language.sr') },
              { value: 'en', label: t('language.en') },
            ]}
          />
        </AppCard>
      </section>

      <section className="space-y-2">
        <SectionHeader label={t('appearance.label')} />
        <AppCard>
          <ThemeToggle />
        </AppCard>
      </section>

      <section className="space-y-2">
        <SectionHeader label={t('index.trainingGroup')} />
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <SettingsRow
            to="/settings/plan"
            icon={CalendarDays}
            label={t('plan.label')}
            subtitle={t('index.planSubtitle')}
          />
          <SettingsRow
            to="/settings/notifications"
            icon={Bell}
            label={t('push.label')}
            subtitle={t('index.notificationsSubtitle')}
          />
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader label={t('index.connectionsGroup')} />
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <SettingsRow
            to="/settings/health"
            icon={HeartPulse}
            label={t('index.healthLabel')}
            subtitle={t('index.healthSubtitle')}
          />
          <SettingsRow
            to="/settings/gear"
            icon={Footprints}
            label={t('gear.label')}
            subtitle={t('index.gearSubtitle')}
          />
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader label={t('account.label')} />
        <AppCard>
          <AppButton
            variant="danger"
            size="sm"
            className="self-start"
            onClick={() => {
              void signOut();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden /> {t('account.signOut')}
          </AppButton>
        </AppCard>
      </section>
    </div>
  );
}
