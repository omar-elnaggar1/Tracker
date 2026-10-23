import { addDays, addWeeks, format } from "date-fns";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Heatmap } from "../components/Heatmap";
import { Card, ProgressRing, inputCls, scoreColor } from "../components/ui";
import { useNow } from "../hooks/useNow";
import { useData } from "../lib/data";
import { fromISO, periodRange, toISO, weekStart } from "../lib/periods";
import { dayCompletion, formatValue, hasTarget, periodTotal, streak, weekScore } from "../lib/scoring";

const tooltipStyle = { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 };
const axis = { stroke: "#64748b", fontSize: 11, tickLine: false, axisLine: false } as const;

export default function Dashboard() {
  const { db, idx, ws, since } = useData();
  const today = toISO(useNow());
  const areas = [...db.areas].sort((a, b) => a.sort_order - b.sort_order);
  const active = db.kpis.filter((k) => k.active);
  const week = weekScore(db.areas, db.kpis, idx, today, today, ws, since);

  const weekly = useMemo(() => {
    const thisWeek = fromISO(weekStart(today, ws));
    return Array.from({ length: 12 }, (_, i) => {
      const d = toISO(addWeeks(thisWeek, i - 11));
      const tracked = periodRange("weekly", d, ws).end >= since;
      return {
        week: format(fromISO(d), "d MMM"),
        score: tracked ? weekScore(db.areas, db.kpis, idx, d, today, ws, since).life : null,
      };
    });
  }, [db.areas, db.kpis, idx, today, ws, since]);

  const daily = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const d = toISO(addDays(fromISO(today), i - 29));
        const c = dayCompletion(db.kpis, idx, d);
        return { day: format(fromISO(d), "d MMM"), pct: c === null || d < since ? null : Math.round(c * 100) };
      }),
    [db.kpis, idx, today, since],
  );

  const streaks = active
    .filter(hasTarget)
    .map((k) => ({ k, s: streak(k, idx, today, ws), area: db.areas.find((a) => a.id === k.area_id) }))
    .sort((a, b) => b.s - a.s);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-3">
          <ProgressRing value={week.life} size={160} stroke={14} color={scoreColor(week.life)} sublabel="Life Score" />
          <p className="text-sm text-slate-400">This week, based on pace toward every target</p>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold">Areas this week</h2>
          <div className="space-y-3">
            {areas.map((a) => {
              const s = week.areas[a.id];
              if (s === undefined) return null;
              return (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="w-28 truncate text-sm sm:w-36">
                    {a.icon} {a.name}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full transition-[width]" style={{ width: `${s}%`, background: a.color }} />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums" style={{ color: scoreColor(s) }}>
                    {s}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Life Score, last 12 weeks</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekly}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="week" {...axis} />
              <YAxis domain={[0, 100]} {...axis} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Daily targets completed, last 30 days (%)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" {...axis} interval={4} />
              <YAxis domain={[0, 100]} {...axis} width={30} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1e293b" }} />
              <Bar dataKey="pct" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-semibold">🔥 Streaks</h2>
          <div className="space-y-2">
            {streaks.map(({ k, s, area }) => (
              <div key={k.id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {area?.icon} {k.name}
                </span>
                <span className={`font-semibold tabular-nums ${s ? "text-orange-400" : "text-slate-600"}`}>
                  {s} {k.period === "daily" ? "d" : k.period === "weekly" ? "wk" : "mo"}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <KpiDetail today={today} />
      </div>
    </div>
  );
}

function KpiDetail({ today }: { today: string }) {
  const { db, idx, ws } = useData();
  const tracked = db.kpis.filter((k) => k.active && k.type !== "milestone");
  const [id, setId] = useState(tracked[0]?.id ?? "");
  const kpi = tracked.find((k) => k.id === id) ?? tracked[0];
  if (!kpi) return null;
  const area = db.areas.find((a) => a.id === kpi.area_id);
  const color = area?.color ?? "#22c55e";
  const byDate = idx.get(kpi.id);

  const series = Array.from({ length: 90 }, (_, i) => {
    const d = toISO(addDays(fromISO(today), i - 89));
    return { day: format(fromISO(d), "d MMM"), value: byDate?.get(d) ?? null };
  });

  // Daily KPIs shade by % of target; period KPIs by how much of the period target that day covered.
  const cell = (d: string) => {
    const v = byDate?.get(d) ?? 0;
    if (!v) return 0;
    if (!hasTarget(kpi)) return 1;
    return Math.min(1, kpi.period === "daily" || kpi.type === "score" ? v / kpi.target : (v / kpi.target) * 3);
  };
  const current = periodTotal(kpi, idx, periodRange(kpi.period, today, ws));

  return (
    <Card className="lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">KPI history</h2>
        <select className={`${inputCls} w-full sm:w-auto`} value={kpi.id} onChange={(e) => setId(e.target.value)}>
          {db.areas.map((a) => (
            <optgroup key={a.id} label={a.name}>
              {tracked
                .filter((k) => k.area_id === a.id)
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <p className="mb-3 text-sm text-slate-400">
        Current {kpi.period} total: <span className="font-semibold text-slate-200">{formatValue(kpi, current)}</span>
        {hasTarget(kpi) && <> of {formatValue(kpi, kpi.target)}</>}
      </p>
      <Heatmap values={cell} end={today} ws={ws} color={color} />
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={series}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="day" {...axis} interval={14} />
            <YAxis {...axis} width={40} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
