import { format, isWithinInterval, type Locale } from 'date-fns';

/** Devolve uma `Date` válida ou `null` (evita `Invalid time value` no date-fns). */
export function parseValidDate(input: unknown): Date | null {
  if (input == null) return null;
  if (typeof input === 'number' && Number.isFinite(input)) {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = typeof input === 'string' ? input.trim() : String(input).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function safeFormat(
  input: unknown,
  formatStr: string,
  options?: { locale?: Locale },
  fallback = '—',
): string {
  const d = parseValidDate(input);
  if (!d) return fallback;
  try {
    return format(d, formatStr, options ?? {});
  } catch {
    return fallback;
  }
}

/** Para relatórios: ignora viagens com `timestamp` inválido (dados legados / BD). */
export function tripTimestampInRange(timestamp: unknown, start: Date, end: Date): boolean {
  const d = parseValidDate(timestamp);
  if (!d) return false;
  try {
    return isWithinInterval(d, { start, end });
  } catch {
    return false;
  }
}
