import { clsx } from 'clsx';
import type { ComponentProps } from 'react';
import { fieldId } from '@/lib/field-id';

interface AppTextareaProps extends ComponentProps<'textarea'> {
  label?: string;
  error?: string;
}

export function AppTextarea({ label, error, id, className, ...rest }: AppTextareaProps) {
  const textareaId = fieldId(label, id ?? rest.name);
  return (
    <div>
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor={textareaId}>
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        className={clsx(
          'min-h-24 w-full rounded-xl border bg-surface-elevated px-3 py-2 text-sm text-text transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...rest}
      />
      {error ? <p className="mt-1 text-xs text-danger-ink">{error}</p> : null}
    </div>
  );
}
