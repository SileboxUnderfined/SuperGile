const MS_PER_HOUR = 3_600_000;

/** YouGile stores time tracking in hours; Super Productivity in milliseconds. */
export const hoursToMs = (hours: number | undefined): number =>
  hours && hours > 0 ? Math.round(hours * MS_PER_HOUR) : 0;

/** Milliseconds to hours, rounded to 0.01 h (36 s) so floats stay readable in YouGile. */
export const msToHours = (ms: number | undefined): number =>
  ms && ms > 0 ? Math.round((ms / MS_PER_HOUR) * 100) / 100 : 0;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local calendar day "YYYY-MM-DD" of a timestamp, the format of Super Productivity's dueDay. */
export const toDayString = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Timestamp for a "YYYY-MM-DD" day, or undefined for anything else.
 * Uses local noon, so the day stays the same in every nearby time zone.
 */
export const dayStringToMs = (day: string): number | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) {
    return undefined;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12).getTime();
};

/** "1h 30m" style duration for display. */
export const formatHours = (hours: number | undefined): string => {
  if (!hours || hours <= 0) {
    return '';
  }
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};
