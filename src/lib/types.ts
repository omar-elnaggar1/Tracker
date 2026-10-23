export type KpiType = "checkbox" | "count" | "amount" | "money" | "score" | "milestone";
export type Period = "daily" | "weekly" | "monthly";

export interface Area {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
}

export interface Kpi {
  id: string;
  area_id: string;
  name: string;
  type: KpiType;
  /** e.g. "prayers", "hrs", "EGP". */
  unit: string;
  /** Goal per period. 0 means "track only" (no target, excluded from scores). */
  target: number;
  period: Period;
  /** "HH:mm" local time to remind if the current period's target isn't met. */
  reminder_time: string | null;
  active: boolean;
  sort_order: number;
}

/** One row per KPI per day; `value` is that day's total (1/0 for checkboxes, 1–10 for scores). */
export interface Entry {
  id: string;
  kpi_id: string;
  date: string; // yyyy-MM-dd
  value: number;
  note: string;
}

export interface Milestone {
  id: string;
  kpi_id: string;
  title: string;
  done_at: string | null;
  sort_order: number;
}

/** Evening check-in: an overall 1–10 rating of the day plus a note. */
export interface Reflection {
  id: string;
  date: string;
  score: number;
  note: string;
}

export interface WeeklyReview {
  id: string;
  week_start: string;
  wins: string;
  misses: string;
  next_targets: string;
  life_score: number;
}

export interface Settings {
  /** 0 = Sunday … 6 = Saturday. */
  week_starts_on: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  checkin_time: string; // "HH:mm"
  notifications: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  week_starts_on: 1,
  checkin_time: "21:00",
  notifications: true,
};

export interface Tables {
  areas: Area;
  kpis: Kpi;
  entries: Entry;
  milestones: Milestone;
  reflections: Reflection;
  weekly_reviews: WeeklyReview;
}
export type TableName = keyof Tables;

export type DB = { [T in TableName]: Tables[T][] } & { settings: Settings };

export const emptyDB = (): DB => ({
  areas: [],
  kpis: [],
  entries: [],
  milestones: [],
  reflections: [],
  weekly_reviews: [],
  settings: { ...DEFAULT_SETTINGS },
});
