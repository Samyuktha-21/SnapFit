// Unit formatting helpers. Internally everything is cm; we convert for display.

export const cmToIn = (cm: number): number => Math.round((cm / 2.54) * 10) / 10;

export function fmtVal(cm: number, unit: 'cm' | 'in'): string {
  return unit === 'in' ? `${cmToIn(cm)}"` : `${cm} cm`;
}

export function fmtRange(
  range: [number, number] | undefined,
  unit: 'cm' | 'in',
): string {
  if (!range) return '—';
  if (unit === 'in') return `${cmToIn(range[0])}–${cmToIn(range[1])}"`;
  return `${range[0]}–${range[1]} cm`;
}
