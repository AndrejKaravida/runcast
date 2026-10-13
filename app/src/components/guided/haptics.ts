export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate(pattern);
}
