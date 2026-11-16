import { Pipe, PipeTransform } from '@angular/core';

/**
 * Time spent on a worksheet as hh:mm, e.g. 2307 seconds → "00:38".
 * Rounded to the nearest minute, but time spent never shows as "00:00".
 */
export function formatHoursMinutes(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** The exact time for a tooltip, e.g. "38 min 27 s" or "1 h 2 min 5 s". */
export function describeDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h && `${h} h`, (h || m) && `${m} min`, `${s} s`].filter(Boolean).join(' ');
}

@Pipe({ name: 'hhmm', standalone: true })
export class HoursMinutesPipe implements PipeTransform {
  transform(seconds: number | null | undefined): string {
    return formatHoursMinutes(seconds);
  }
}
