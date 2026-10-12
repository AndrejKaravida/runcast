import { Moon, Sun } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistem' },
  { value: 'light', label: 'Svetla' },
  { value: 'dark', label: 'Tamna' },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return <SegmentedControl options={THEME_OPTIONS} value={preference} onChange={setPreference} />;
}

export function ThemeQuickToggle() {
  const { resolved, setPreference } = useTheme();
  const isDark = resolved === 'dark';
  return (
    <IconButton
      label={isDark ? 'Uključi svetlu temu' : 'Uključi tamnu temu'}
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      className="-my-1.5 -mr-2 h-9 w-9"
    >
      {isDark ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
    </IconButton>
  );
}
