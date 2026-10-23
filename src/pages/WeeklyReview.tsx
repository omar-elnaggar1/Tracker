import { addDays, format } from "date-fns";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, ProgressRing, btnCls, inputCls, primaryBtnCls, scoreColor } from "../components/ui";
import { useNow } from "../hooks/useNow";
import { useData } from "../lib/data";
import { daysBetween, fromISO, periodRange, previousPeriodDate, reviewDueWeek, toISO, weekStart } from "../lib/periods";
import { formatValue, hasTarget, periodTotal, weekScore } from "../lib/scoring";
import type { Kpi } from "../lib/types";

export default function WeeklyReview() {
  const { db, ws } = useData();
  const today = toISO(useNow());
  const [params, setParams] = useSearchParams();
  // Default to the week that's due, else the week that just ended.
  const fallback = reviewDueWeek(today, ws) ?? weekStart(previousPeriodDate("weekly", today), ws);
  const start = weekStart(params.get("week") ?? fallback, ws);
  const go = (deltaDays: number) => setParams({ week: toISO(addDays(fromISO(start), deltaDays)) });
  const range = periodRange("weekly", start, ws);
  const history = [...db.weekly_reviews].sort((a, b) => b.week_start.localeCompare(a.week_start));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Weekly Review</h1>
          <p className="text-sm text-slate-400">
            {format(fromISO(range.start), "d MMM")} – {format(fromISO(range.end), "d MMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <button className={btnCls} onClick={() => go(-7)}>
            ← Previous week
          </button>
          <button className={btnCls} onClick={() => go(7)} disabled={range.end >= today}>
            Next week →
          </button>
        </div>
      </header>
      <ReviewWeek key={start} start={start} today={today} />
      {history.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Past reviews</h2>
          <div className="divide-y divide-slate-800">
            {history.map((r) => (
              <button
                key={r.id}
                onClick={() => setParams({ week: r.week_start })}
                className="flex w-full items-center justify-between py-2 text-left text-sm hover:text-white"
              >
                <span>Week of {format(fromISO(r.week_start), "d MMM yyyy")}</span>
                <span className="line-clamp-1 flex-1 px-4 text-slate-500">{r.next_targets}</span>
                <span className="font-semibold" style={{ color: scoreColor(r.life_score) }}>
                  {r.life_score}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ReviewWeek({ start, today }: { start: string; today: string }) {
  const { db, idx, ws, since, saveReview } = useData();
  const existing = db.weekly_reviews.find((r) => r.week_start === start);
  const [wins, setWins] = useState(existing?.wins ?? "");
  const [misses, setMisses] = useState(existing?.misses ?? "");
  const [next, setNext] = useState(existing?.next_targets ?? "");
  const [saved, setSaved] = useState(false);

  const score = weekScore(db.areas, db.kpis, idx, start, today, ws, since);
  const week = periodRange("weekly", start, ws);
  const areas = [...db.areas].sort((a, b) => a.sort_order - b.sort_order);
  const rows = db.kpis.filter((k) => k.active && hasTarget(k));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <div className="mb-4 flex items-center gap-5">
          <ProgressRing value={score.life} size={96} stroke={8} color={scoreColor(score.life)} sublabel="Life Score" />
          <div className="flex flex-wrap gap-2">
            {areas.map((a) =>
              score.areas[a.id] === undefined ? null : (
                <span key={a.id} className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                  {a.icon} {a.name}{" "}
                  <b style={{ color: scoreColor(score.areas[a.id]) }}>{score.areas[a.id]}%</b>
                </span>
              ),
            )}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-2">KPI</th>
              <th className="pb-2">Result</th>
              <th className="pb-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((k) => {
              const s = Math.round((score.kpis[k.id] ?? 0) * 100);
              const area = db.areas.find((a) => a.id === k.area_id);
              return (
                <tr key={k.id}>
                  <td className="py-2">
                    {s >= 100 ? "✅" : s >= 50 ? "🟡" : "❌"} {area?.icon} {k.name}
                  </td>
                  <td className="py-2 text-slate-400">{resultText(k, week, today)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums" style={{ color: scoreColor(s) }}>
                    {s}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-4 lg:col-span-2">
        <ReviewField label="🏆 Wins: what went well?" value={wins} onChange={setWins} />
        <ReviewField label="⚠️ What slipped, and why?" value={misses} onChange={setMisses} />
        <ReviewField label="🎯 Next week's focus" value={next} onChange={setNext} />
        <button
          className={`${primaryBtnCls} w-full py-2`}
          onClick={() => {
            saveReview({ week_start: start, wins, misses, next_targets: next, life_score: score.life });
            setSaved(true);
          }}
        >
          {existing ? "Update review" : "Complete review"}
        </button>
        {saved && <p className="text-center text-sm text-emerald-400">Saved. Now go win next week.</p>}
      </Card>
    </div>
  );

  function resultText(k: Kpi, w: { start: string; end: string }, t: string) {
    if (k.period === "daily") {
      const from = since > w.start ? since : w.start;
      const end = t < w.end ? t : w.end;
      const days = from > end ? [] : daysBetween({ start: from, end });
      const hit = days.filter((d) => periodTotal(k, idx, { start: d, end: d }) >= k.target).length;
      return `Hit ${hit} of ${days.length} days`;
    }
    const asOf = w.end < t ? w.end : t;
    const r = k.period === "weekly" ? w : { start: periodRange("monthly", asOf, ws).start, end: asOf };
    const label = k.period === "weekly" ? "" : " (month to date)";
    const total = periodTotal(k, idx, r);
    if (k.type === "checkbox") return `${total} / ${k.target} days${label}`;
    return `${formatValue(k, total)} / ${formatValue(k, k.target)}${label}`;
  }
}

function ReviewField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea className={`${inputCls} h-24 w-full resize-y`} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
