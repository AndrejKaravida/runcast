export function PaceZoneBadge({ zone }: { zone: string | null }) {
  if (!zone) return null;
  const styles: Record<string, string> = {
    E: 'bg-success-soft text-success-ink',
    M: 'bg-rain-soft text-rain-ink',
    T: 'bg-primary-soft text-primary-ink',
    I: 'bg-warning-soft text-warning-ink',
    R: 'bg-danger-soft text-danger-ink',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[zone] ?? 'bg-surface-elevated text-text-secondary'}`}
    >
      {zone}
    </span>
  );
}
