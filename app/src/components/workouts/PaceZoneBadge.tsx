export function PaceZoneBadge({ zone }: { zone: string | null }) {
  if (!zone) return null;
  const styles: Record<string, string> = {
    E: 'bg-success-soft text-success',
    M: 'bg-rain-soft text-rain',
    T: 'bg-primary-soft text-primary',
    I: 'bg-warning-soft text-warning',
    R: 'bg-danger-soft text-danger',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[zone] ?? 'bg-surface-elevated text-text-secondary'}`}
    >
      {zone}
    </span>
  );
}
