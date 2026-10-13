export function fmtKm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

export function normalizeStepLabel(label: string): string {
  return label.replace(/ — /g, ' ');
}
