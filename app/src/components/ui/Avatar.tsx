import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
}

function initialsOf(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function Avatar({ src, name, className }: AvatarProps) {
  const { t } = useTranslation();
  if (src) {
    return (
      <img
        src={src}
        alt={t('avatar')}
        className={clsx(
          'shrink-0 rounded-full border border-border bg-surface-elevated object-cover',
          className ?? 'h-10 w-10',
        )}
      />
    );
  }
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated font-semibold text-text-secondary',
        className ?? 'h-10 w-10',
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
