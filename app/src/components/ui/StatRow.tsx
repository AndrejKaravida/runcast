import { clsx } from 'clsx';

export interface StatRowItem {
  label: string;
  value: string;
}

interface StatRowProps {
  items: StatRowItem[];
  className?: string;
  compact?: boolean;
}

export function StatRow({ items, className, compact = false }: StatRowProps) {
  return (
    <dl className={clsx('grid divide-x divide-border', items.length === 2 ? 'grid-cols-2' : 'grid-cols-3', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1 px-3 py-2">
          <dt className="section-label">{item.label}</dt>
          <dd className={clsx('num truncate font-semibold', compact ? 'text-base' : 'text-lg')}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
