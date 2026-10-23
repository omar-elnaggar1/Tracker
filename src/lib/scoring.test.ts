import { describe, expect, it } from "vitest";
import { periodRange, reviewDueWeek } from "./periods";
import { atRisk, dayCompletion, indexEntries, isHit, periodTotal, progress, streak, weekScore } from "./scoring";
import type { Area, Entry, Kpi } from "./types";

const area: Area = { id: "a", name: "Prayer", color: "#000", icon: "", sort_order: 0 };
const kpi = (over: Partial<Kpi>): Kpi => ({
  id: "k",
  area_id: "a",
  name: "k",
  type: "count",
  unit: "",
  target: 5,
  period: "daily",
  reminder_time: null,
  active: true,
  sort_order: 0,
  ...over,
});
const entry = (kpi_id: string, date: string, value: number): Entry => ({ id: `${kpi_id}${date}`, kpi_id, date, value, note: "" });

// 2026-10-19 is a Monday.
const MON = 1 as const;

describe("periodRange", () => {
  it("respects the configured week start", () => {
    expect(periodRange("weekly", "2026-10-21", MON)).toEqual({ start: "2026-10-19", end: "2026-10-25" });
    expect(periodRange("weekly", "2026-10-21", 6)).toEqual({ start: "2026-10-17", end: "2026-10-23" });
  });
  it("covers whole months", () => {
    expect(periodRange("monthly", "2026-02-10", MON)).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
});

describe("totals and progress", () => {
  it("sums counts and averages scores", () => {
    const idx = indexEntries([entry("k", "2026-10-19", 3), entry("k", "2026-10-20", 7)]);
    const week = periodRange("weekly", "2026-10-20", MON);
    expect(periodTotal(kpi({}), idx, week)).toBe(10);
    expect(periodTotal(kpi({ type: "score" }), idx, week)).toBe(5);
  });
  it("caps progress at 1 and returns null without a target", () => {
    const idx = indexEntries([entry("k", "2026-10-19", 9)]);
    expect(progress(kpi({}), idx, [], "2026-10-19", MON)).toBe(1);
    expect(progress(kpi({ target: 0 }), idx, [], "2026-10-19", MON)).toBeNull();
  });
  it("computes milestone progress from done items", () => {
    const k = kpi({ type: "milestone" });
    const ms = [
      { id: "1", kpi_id: "k", title: "a", done_at: "x", sort_order: 0 },
      { id: "2", kpi_id: "k", title: "b", done_at: null, sort_order: 1 },
    ];
    expect(progress(k, new Map(), ms, "2026-10-19", MON)).toBe(0.5);
  });
});

describe("streak", () => {
  const k = kpi({});
  it("counts consecutive hit days and ignores an unfinished today", () => {
    const idx = indexEntries([
      entry("k", "2026-10-17", 5),
      entry("k", "2026-10-18", 5),
      entry("k", "2026-10-19", 5),
      entry("k", "2026-10-20", 2), // today, not done yet
    ]);
    expect(streak(k, idx, "2026-10-20", MON)).toBe(3);
  });
  it("includes today once it's hit and breaks on a missed day", () => {
    const idx = indexEntries([entry("k", "2026-10-17", 5), entry("k", "2026-10-19", 5), entry("k", "2026-10-20", 5)]);
    expect(streak(k, idx, "2026-10-20", MON)).toBe(2);
  });
  it("works across week boundaries for weekly KPIs", () => {
    const w = kpi({ type: "checkbox", target: 2, period: "weekly" });
    const idx = indexEntries([
      entry("k", "2026-10-06", 1),
      entry("k", "2026-10-08", 1),
      entry("k", "2026-10-13", 1),
      entry("k", "2026-10-18", 1), // Sunday: still the week of the 12th
    ]);
    expect(streak(w, idx, "2026-10-20", MON)).toBe(2);
  });
});

describe("weekScore", () => {
  it("averages daily completion over elapsed days and paces weekly targets", () => {
    const daily = kpi({ id: "d" });
    const weekly = kpi({ id: "w", type: "checkbox", target: 4, period: "weekly" });
    const idx = indexEntries([
      entry("d", "2026-10-19", 5), // 100%
      entry("d", "2026-10-20", 0), // 0%
      entry("w", "2026-10-19", 1),
      entry("w", "2026-10-20", 1), // 2 of 4 with 2/7 of the week elapsed → ahead of pace
    ]);
    const s = weekScore([area], [daily, weekly], idx, "2026-10-20", "2026-10-20", MON);
    expect(s.kpis.d).toBeCloseTo(0.5);
    expect(s.kpis.w).toBe(1);
    expect(s.areas.a).toBe(75);
    expect(s.life).toBe(75);
  });
  it("marks a weekly KPI behind pace", () => {
    const weekly = kpi({ id: "w", type: "checkbox", target: 4, period: "weekly" });
    const idx = indexEntries([entry("w", "2026-10-19", 1)]);
    // 1 done vs. 4 × 2/7 ≈ 1.14 expected by Tuesday.
    expect(weekScore([area], [weekly], idx, "2026-10-20", "2026-10-20", MON).kpis.w).toBeCloseTo(0.875);
  });
  it("uses the full week for past weeks and skips track-only KPIs", () => {
    const daily = kpi({ id: "d" });
    const trackOnly = kpi({ id: "t", target: 0 });
    const idx = indexEntries([entry("d", "2026-10-12", 5)]);
    const s = weekScore([area], [daily, trackOnly], idx, "2026-10-12", "2026-10-20", MON);
    expect(s.kpis.d).toBeCloseTo(1 / 7);
    expect("t" in s.kpis).toBe(false);
  });
});

describe("misc", () => {
  it("flags unfinished daily KPIs after 6pm", () => {
    const idx = indexEntries([entry("k", "2026-10-20", 2)]);
    expect(atRisk(kpi({}), idx, "2026-10-20", new Date(2026, 9, 20, 19), MON)).toBe(true);
    expect(atRisk(kpi({}), idx, "2026-10-20", new Date(2026, 9, 20, 9), MON)).toBe(false);
    expect(isHit(kpi({}), indexEntries([entry("k", "2026-10-20", 5)]), "2026-10-20", MON)).toBe(true);
  });
  it("computes day completion across daily KPIs", () => {
    const idx = indexEntries([entry("a", "2026-10-20", 5)]);
    expect(dayCompletion([kpi({ id: "a" }), kpi({ id: "b" })], idx, "2026-10-20")).toBe(0.5);
  });
  it("knows when the weekly review is due", () => {
    expect(reviewDueWeek("2026-10-25", MON)).toBe("2026-10-19"); // Sunday: review this week
    expect(reviewDueWeek("2026-10-26", MON)).toBe("2026-10-19"); // Monday: review last week
    expect(reviewDueWeek("2026-10-22", MON)).toBeNull();
  });
});

describe("tracking start", () => {
  it("doesn't count days before the first log against you", () => {
    const daily = kpi({ id: "d" });
    const idx = indexEntries([entry("d", "2026-10-23", 5)]);
    // Friday is the first day tracked: 100%, not 1/5.
    expect(weekScore([area], [daily], idx, "2026-10-23", "2026-10-23", MON, "2026-10-23").kpis.d).toBe(1);
    expect(weekScore([area], [daily], idx, "2026-10-12", "2026-10-23", MON, "2026-10-23").life).toBe(0);
  });
});
