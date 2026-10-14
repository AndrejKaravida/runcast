const BENIGN_ABORT_FRAGMENTS = ['aborted', 'abortError'];

function isBenignAbort(reason: unknown): boolean {
  if (typeof reason !== 'object' || reason === null) return false;
  const name = (reason as { name?: unknown }).name;
  const message = (reason as { message?: unknown }).message;
  if (name === 'AbortError') return true;
  if (typeof message !== 'string') return false;
  return BENIGN_ABORT_FRAGMENTS.some((fragment) => message.toLowerCase().includes(fragment.toLowerCase()));
}

export function installErrorReporting(): void {
  window.addEventListener('unhandledrejection', (event) => {
    if (isBenignAbort(event.reason)) event.preventDefault();
  });
}
