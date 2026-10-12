export function fieldId(label: string | undefined, fallback: string | undefined): string | undefined {
  if (fallback) return fallback;
  if (!label) return undefined;
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
