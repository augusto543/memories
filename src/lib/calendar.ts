/** Date-only helpers: avoid UTC shifting a romantic date to the previous day. */
const DAY_MS = 86_400_000;
export const APP_TIME_ZONE = "America/Belem";

export function todayInAppTimeZone(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function toDateOnlyUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addCalendarDays(iso: string, days: number): string {
  return new Date(toDateOnlyUTC(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function dayDifference(from: string, to: string): number {
  return Math.round((toDateOnlyUTC(to).getTime() - toDateOnlyUTC(from).getTime()) / DAY_MS);
}

export function mondayOfWeek(iso: string): string {
  const day = toDateOnlyUTC(iso).getUTCDay();
  return addCalendarDays(iso, -(day === 0 ? 6 : day - 1));
}

export function validISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** 29 Feb anniversaries fall on 28 Feb in non-leap years. */
export function occurrenceInYear(eventDate: string, year: number): string {
  const month = Number(eventDate.slice(5, 7));
  const day = Number(eventDate.slice(8, 10));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function nextOccurrence(eventDate: string, repeatsAnnually: boolean, today: string): string | null {
  if (!repeatsAnnually) return eventDate >= today ? eventDate : null;
  const year = Number(today.slice(0, 4));
  const current = occurrenceInYear(eventDate, year);
  return current >= today ? current : occurrenceInYear(eventDate, year + 1);
}

/** Returns a local date label, so an encounter timestamp doesn't jump calendar days. */
export function encounterLocalDay(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
