import { newId } from "./store";
import type { Area, Kpi, KpiType, Period } from "./types";

type KpiSeed = [name: string, type: KpiType, unit: string, target: number, period: Period, reminder?: string];

const SEED: { name: string; color: string; icon: string; kpis: KpiSeed[] }[] = [
  {
    name: "Prayer",
    color: "#22c55e",
    icon: "🕌",
    kpis: [
      ["5 daily prayers", "count", "prayers", 5, "daily", "21:30"],
      ["Quran pages", "count", "pages", 20, "weekly"],
    ],
  },
  {
    name: "Gym",
    color: "#f97316",
    icon: "🏋️",
    kpis: [
      ["Workout done", "checkbox", "", 4, "weekly", "18:00"],
      ["Body weight", "amount", "kg", 0, "daily"],
    ],
  },
  {
    name: "Work",
    color: "#3b82f6",
    icon: "💼",
    kpis: [["Deep-work hours", "amount", "hrs", 6, "daily", "17:00"]],
  },
  {
    name: "Side Hustle",
    color: "#eab308",
    icon: "🚀",
    kpis: [
      ["Revenue", "money", "EGP", 10000, "monthly"],
      ["Hours invested", "amount", "hrs", 8, "weekly"],
      ["Launch milestones", "milestone", "", 0, "monthly"],
    ],
  },
  {
    name: "Quality Time",
    color: "#ec4899",
    icon: "❤️",
    kpis: [["Quality time with family", "amount", "min", 300, "weekly", "20:00"]],
  },
];

export function buildSeed(): { areas: Area[]; kpis: Kpi[] } {
  const areas: Area[] = [];
  const kpis: Kpi[] = [];
  SEED.forEach((a, ai) => {
    const area: Area = { id: newId(), name: a.name, color: a.color, icon: a.icon, sort_order: ai };
    areas.push(area);
    a.kpis.forEach(([name, type, unit, target, period, reminder], ki) => {
      kpis.push({
        id: newId(),
        area_id: area.id,
        name,
        type,
        unit,
        target,
        period,
        reminder_time: reminder ?? null,
        active: true,
        sort_order: ki,
      });
    });
  });
  return { areas, kpis };
}
