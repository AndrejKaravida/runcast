import { clsx } from 'clsx';
import { BarChart3, CalendarDays, House, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { ThemeQuickToggle } from '@/components/ui/ThemeToggle';

const tabs = [
  { to: '/today', labelKey: 'nav.today', icon: House },
  { to: '/plan', labelKey: 'nav.plan', icon: CalendarDays },
  { to: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function TabLayout() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col bg-bg">
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between px-4 py-3">
          <span className="text-base font-bold tracking-tight">
            Run<span className="text-primary-ink">Cast</span>
          </span>
          <ThemeQuickToggle />
        </div>
        <div className="pointer-events-none absolute inset-x-0 -bottom-4 h-4 bg-gradient-to-b from-bg/80 to-transparent" />
      </header>
      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-surface/90 backdrop-blur-xl backdrop-saturate-150">
        <div className="pointer-events-none absolute inset-x-0 -top-4 h-4 bg-gradient-to-t from-surface/80 to-transparent" />
        <div className="mx-auto grid max-w-[720px] grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex select-none flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60 active:scale-[0.97]',
                  isActive ? 'text-primary-ink' : 'text-text-secondary hover:text-text',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t(labelKey)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
