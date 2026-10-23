import { useData } from "../lib/data";
import { periodLabel } from "../lib/periods";
import { atRisk, currentTotal, formatValue, hasTarget, isHit, progress, streak } from "../lib/scoring";
import type { Kpi } from "../lib/types";
import { QuickLog } from "./QuickLog";
import { ProgressBar } from "./ui";

const streakUnit = { daily: "day", weekly: "wk", monthly: "mo" } as const;

export function KpiRow({ kpi, date, today, color, now }: { kpi: Kpi; date: string; today: string; color: string; now: Date }) {
  const { db, idx, ws } = useData();
  const p = progress(kpi, idx, db.milestones, date, ws);
  const total = currentTotal(kpi, idx, date, ws);
  const s = streak(kpi, idx, today, ws);
  const hit = isHit(kpi, idx, date, ws);
  const risk = date === today && atRisk(kpi, idx, today, now, ws);

  let status: string;
  if (kpi.type === "milestone") {
    const mine = db.milestones.filter((m) => m.kpi_id === kpi.id);
    status = `${mine.filter((m) => m.done_at).length} / ${mine.length} done`;
  } else if (kpi.type === "checkbox") {
    status =
      kpi.period === "daily" ? (total ? "Done today" : "Not done yet") : `${total} / ${kpi.target} days ${periodLabel[kpi.period]}`;
  } else if (hasTarget(kpi)) {
    status = `${formatValue(kpi, total)} / ${formatValue(kpi, kpi.target)} ${periodLabel[kpi.period]}`;
  } else {
    status = "Tracking only";
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${
        risk ? "border-red-800/70 bg-red-950/20" : hit ? "border-slate-800 bg-slate-900/30" : "border-slate-800"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{kpi.name}</span>
            {hit && <span className="text-xs text-emerald-400">✓ target hit</span>}
            {risk && <span className="text-xs font-semibold text-red-400">⚠ streak at risk</span>}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
            <span>{status}</span>
            {s > 0 && (
              <span className="font-semibold text-orange-400" title="Consecutive periods on target">
                🔥 {s} {streakUnit[kpi.period]}
                {s === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        {kpi.type !== "milestone" && <QuickLog kpi={kpi} date={date} color={color} />}
      </div>
      {kpi.type === "milestone" && (
        <div className="mt-3">
          <QuickLog kpi={kpi} date={date} color={color} />
        </div>
      )}
      {p !== null && (
        <div className="mt-3">
          <ProgressBar value={p} color={color} />
        </div>
      )}
    </div>
  );
}
