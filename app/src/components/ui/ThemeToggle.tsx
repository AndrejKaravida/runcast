import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('theme.system') },
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
  ];
  return <SegmentedControl options={options} value={preference} onChange={setPreference} />;
}

export function ThemeQuickToggle() {
  const { t } = useTranslation();
  const { resolved, setPreference } = useTheme();
  const isDark = resolved === 'dark';
  return (
    <IconButton
      label={isDark ? t('theme.toLight') : t('theme.toDark')}
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      className="-my-1.5 -mr-2 h-9 w-9"
    >
      {isDark ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
    </IconButton>
  );
}
