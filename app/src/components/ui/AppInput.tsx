import { clsx } from 'clsx';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { fieldId } from '@/lib/field-id';

interface AppInputProps extends ComponentProps<'input'> {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

export function AppInput({ label, error, hint, id, className, ...rest }: AppInputProps) {
  const inputId = fieldId(label, id ?? rest.name);
  const hintId = useId();
  const errorId = useId();
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div>
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={clsx(
          'h-11 w-full rounded-xl border bg-surface-elevated px-3 text-sm text-text transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger-ink">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={hintId} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
