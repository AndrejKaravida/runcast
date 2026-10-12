export function formatKm(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}
