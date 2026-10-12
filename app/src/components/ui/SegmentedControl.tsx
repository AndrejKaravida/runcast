import { clsx } from 'clsx';

interface SegmentedOption<Value extends string | number> {
  value: Value;
  label: string;
}

interface SegmentedControlProps<Value extends string | number> {
  options: SegmentedOption<Value>[];
  value: Value | null;
  onChange: (value: Value) => void;
  className?: string;
}

export function SegmentedControl<Value extends string | number>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<Value>) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const currentIndex = options.findIndex((option) => option.value === value);
    if (currentIndex === -1) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'ArrowRight'
        ? (currentIndex + 1) % options.length
        : (currentIndex - 1 + options.length) % options.length;
    onChange(options[nextIndex].value);
  }

  return (
    <div
      role="group"
      onKeyDown={handleKeyDown}
      className={clsx('grid gap-1 rounded-xl border border-border bg-surface-elevated p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'select-none rounded-lg px-2 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.97]',
            option.value === value ? 'bg-primary text-bg' : 'text-text-secondary hover:text-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
