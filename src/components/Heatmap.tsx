import { addDays, format } from "date-fns";
import { fromISO, toISO, weekStart, type WeekStart } from "../lib/periods";

/** GitHub-style calendar: one column per week, one cell per day, shaded by a 0–1 value. */
export function Heatmap({
  values,
  end,
  weeks = 20,
  ws,
  color,
}: {
  values: (date: string) => number | null;
  end: string;
  weeks?: number;
  ws: WeekStart;
  color: string;
}) {
  const first = addDays(fromISO(weekStart(end, ws)), -7 * (weeks - 1));
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => toISO(addDays(first, w * 7 + d))),
  );
  return (
    <div className="flex gap-1 overflow-x-auto">
      {cols.map((days, w) => (
        <div key={w} className="flex flex-col gap-1">
          {days.map((d) => {
            const v = d > end ? null : values(d);
            return (
              <div
                key={d}
                title={`${format(fromISO(d), "EEE d MMM")}${v === null ? "" : ` · ${Math.round(v * 100)}%`}`}
                className="h-3.5 w-3.5 rounded-sm"
                style={{
                  background: v === null || v === 0 ? "#1e293b" : color,
                  opacity: v === null || v === 0 ? (d > end ? 0.3 : 1) : 0.25 + 0.75 * v,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
