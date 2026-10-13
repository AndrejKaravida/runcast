import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { fieldId } from '@/lib/field-id';

interface AppSelectProps extends ComponentProps<'select'> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function AppSelect({ label, error, id, className, children, ...rest }: AppSelectProps) {
  const selectId = fieldId(label, id ?? rest.name);
  const errorId = useId();
  return (
    <div>
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={clsx(
            'h-11 w-full appearance-none rounded-xl border bg-surface-elevated px-3 pr-9 text-sm text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
            error ? 'border-danger' : 'border-border',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
