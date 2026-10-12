import { Loader2 } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center bg-bg">
      <Loader2 className="h-8 w-8 animate-spin text-primary-ink" aria-hidden />
      <span className="sr-only">Učitavanje</span>
    </div>
  );
}
