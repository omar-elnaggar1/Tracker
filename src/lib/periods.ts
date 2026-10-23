import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Period, Settings } from "./types";

export type WeekStart = Settings["week_starts_on"];

export interface Range {
  start: string; // inclusive, yyyy-MM-dd
  end: string; // inclusive, yyyy-MM-dd
}

export const toISO = (d: Date) => format(d, "yyyy-MM-dd");
export const fromISO = (s: string) => parseISO(s);
export const todayISO = () => toISO(new Date());

export function periodRange(period: Period, date: string, weekStartsOn: WeekStart): Range {
  const d = fromISO(date);
  switch (period) {
    case "daily":
      return { start: date, end: date };
    case "weekly":
      return {
        start: toISO(startOfWeek(d, { weekStartsOn })),
        end: toISO(endOfWeek(d, { weekStartsOn })),
      };
    case "monthly":
      return { start: toISO(startOfMonth(d)), end: toISO(endOfMonth(d)) };
  }
}

/** The period immediately before the one containing `date`. */
export function previousPeriodDate(period: Period, date: string): string {
  const d = fromISO(date);
  switch (period) {
    case "daily":
      return toISO(addDays(d, -1));
    case "weekly":
      return toISO(addWeeks(d, -1));
    case "monthly":
      return toISO(addMonths(d, -1));
  }
}

export const inRange = (date: string, r: Range) => date >= r.start && date <= r.end;

export function daysBetween(r: Range): string[] {
  const out: string[] = [];
  const start = fromISO(r.start);
  const n = differenceInCalendarDays(fromISO(r.end), start);
  for (let i = 0; i <= n; i++) out.push(toISO(addDays(start, i)));
  return out;
}

export const weekStart = (date: string, ws: WeekStart) => periodRange("weekly", date, ws).start;

export const periodLabel: Record<Period, string> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
};

/**
 * The week whose review is due today: on the last day of a week that week,
 * on the first day of a week the one that just ended. Null otherwise.
 */
export function reviewDueWeek(today: string, ws: WeekStart): string | null {
  const r = periodRange("weekly", today, ws);
  if (today === r.end) return r.start;
  if (today === r.start) return weekStart(previousPeriodDate("weekly", today), ws);
  return null;
}
