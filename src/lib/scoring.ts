import { getDaysInMonth } from "date-fns";
import {
  daysBetween,
  fromISO,
  periodRange,
  previousPeriodDate,
  type Range,
  type WeekStart,
} from "./periods";
import type { Area, Entry, Kpi, Milestone } from "./types";

/** kpi_id → date → value, for O(1) day lookups. */
export type EntryIndex = Map<string, Map<string, number>>;

export function indexEntries(entries: Entry[]): EntryIndex {
  const idx: EntryIndex = new Map();
  for (const e of entries) {
    let byDate = idx.get(e.kpi_id);
    if (!byDate) idx.set(e.kpi_id, (byDate = new Map()));
    byDate.set(e.date, e.value);
  }
  return idx;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const hasTarget = (k: Kpi) => k.type !== "milestone" && k.target > 0;

/** Sum of a KPI's values over a range (average for 1–10 scores). */
export function periodTotal(kpi: Kpi, idx: EntryIndex, range: Range): number {
  const byDate = idx.get(kpi.id);
  if (!byDate) return 0;
  const vals: number[] = [];
  for (const d of daysBetween(range)) {
    const v = byDate.get(d);
    if (v !== undefined) vals.push(v);
  }
  if (kpi.type === "score") return vals.length ? avg(vals) : 0;
  return vals.reduce((a, b) => a + b, 0);
}

export function currentTotal(kpi: Kpi, idx: EntryIndex, date: string, ws: WeekStart) {
  return periodTotal(kpi, idx, periodRange(kpi.period, date, ws));
}

/** 0–1 progress toward the target for the period containing `date`; null if there's no target. */
export function progress(
  kpi: Kpi,
  idx: EntryIndex,
  milestones: Milestone[],
  date: string,
  ws: WeekStart,
): number | null {
  if (kpi.type === "milestone") {
    const mine = milestones.filter((m) => m.kpi_id === kpi.id);
    return mine.length ? mine.filter((m) => m.done_at).length / mine.length : null;
  }
  if (kpi.target <= 0) return null;
  return clamp01(currentTotal(kpi, idx, date, ws) / kpi.target);
}

export function isHit(kpi: Kpi, idx: EntryIndex, date: string, ws: WeekStart): boolean {
  return hasTarget(kpi) && currentTotal(kpi, idx, date, ws) >= kpi.target;
}

/**
 * Consecutive periods (days/weeks/months) in which the target was hit, ending at the
 * current period. The current period doesn't break a streak until it's over.
 */
export function streak(kpi: Kpi, idx: EntryIndex, today: string, ws: WeekStart): number {
  if (!hasTarget(kpi)) return 0;
  let d = today;
  if (!isHit(kpi, idx, d, ws)) d = previousPeriodDate(kpi.period, d);
  let n = 0;
  while (n < 5000 && isHit(kpi, idx, d, ws)) {
    n++;
    d = previousPeriodDate(kpi.period, d);
  }
  return n;
}

/** A daily KPI that still isn't done late in the day. */
export function atRisk(kpi: Kpi, idx: EntryIndex, today: string, now: Date, ws: WeekStart) {
  return kpi.period === "daily" && hasTarget(kpi) && now.getHours() >= 18 && !isHit(kpi, idx, today, ws);
}

export interface WeekScore {
  life: number; // 0–100
  areas: Record<string, number>; // 0–100
  kpis: Record<string, number>; // 0–1
}

/**
 * Life Score for the week containing `date`, as of `today`.
 * - daily KPIs: average daily completion over the days elapsed so far
 * - weekly/monthly KPIs: progress vs. where you should be by now (pace), capped at 100%
 * Each area is the mean of its KPIs; the Life Score is the mean of the areas.
 * `since` (first day of tracking) trims the elapsed days so a new user isn't penalised.
 */
export function weekScore(
  areas: Area[],
  kpis: Kpi[],
  idx: EntryIndex,
  date: string,
  today: string,
  ws: WeekStart,
  since?: string,
): WeekScore {
  const week = periodRange("weekly", date, ws);
  const asOf = today < week.end ? today : week.end;
  // Days before you started tracking don't count against you.
  const from = since && since > week.start ? since : week.start;
  if (from > asOf) return { life: 0, areas: {}, kpis: {} };
  const elapsed = daysBetween({ start: from, end: asOf });

  const kpiScores: Record<string, number> = {};
  for (const k of kpis) {
    if (!k.active || !hasTarget(k)) continue;
    if (k.period === "daily") {
      kpiScores[k.id] = avg(elapsed.map((d) => clamp01(periodTotal(k, idx, { start: d, end: d }) / k.target)));
    } else if (k.period === "weekly") {
      const pace = elapsed.length / 7;
      kpiScores[k.id] = clamp01(periodTotal(k, idx, week) / (k.target * pace));
    } else {
      const month = periodRange("monthly", asOf, ws);
      const start = from > month.start ? from : month.start;
      const pace = daysBetween({ start, end: asOf }).length / getDaysInMonth(fromISO(asOf));
      const total = periodTotal(k, idx, { start, end: asOf });
      kpiScores[k.id] = clamp01(total / (k.target * pace));
    }
  }

  const areaScores: Record<string, number> = {};
  for (const a of areas) {
    const scores = kpis.filter((k) => k.area_id === a.id && k.id in kpiScores).map((k) => kpiScores[k.id]);
    if (scores.length) areaScores[a.id] = Math.round(avg(scores) * 100);
  }
  const life = Math.round(avg(Object.values(areaScores)));
  return { life, areas: areaScores, kpis: kpiScores };
}

/** Average completion (0–1) of all daily KPIs with targets on one day; null if none exist. */
export function dayCompletion(kpis: Kpi[], idx: EntryIndex, date: string): number | null {
  const daily = kpis.filter((k) => k.active && k.period === "daily" && hasTarget(k));
  if (!daily.length) return null;
  return avg(daily.map((k) => clamp01(periodTotal(k, idx, { start: date, end: date }) / k.target)));
}

export function formatValue(kpi: Pick<Kpi, "type" | "unit">, v: number): string {
  if (kpi.type === "checkbox") return v ? "Done" : "Not yet";
  const n =
    kpi.type === "money"
      ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : Number.isInteger(v)
        ? String(v)
        : v.toFixed(1);
  return kpi.unit ? `${n} ${kpi.unit}` : n;
}

/** First day anything was logged (today if nothing yet): the start of scoring. */
export function trackingSince(entries: Entry[], today: string): string {
  let first = today;
  for (const e of entries) if (e.date < first) first = e.date;
  return first;
}
