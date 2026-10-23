import { addDays, format } from "date-fns";
import { useState } from "react";
import { KpiRow } from "../components/KpiRow";
import { Card, ProgressRing, btnCls, inputCls, scoreColor } from "../components/ui";
import { useNow } from "../hooks/useNow";
import { useData } from "../lib/data";
import { fromISO, toISO } from "../lib/periods";
import { dayCompletion, hasTarget, isHit, weekScore } from "../lib/scoring";

export default function Today() {
  const { db, idx, ws, since } = useData();
  const now = useNow();
  const today = toISO(now);
  const [date, setDate] = useState(today);
  const isToday = date === today;

  const areas = [...db.areas].sort((a, b) => a.sort_order - b.sort_order);
  const active = db.kpis.filter((k) => k.active);
  const daily = active.filter((k) => k.period === "daily" && hasTarget(k));
  const doneCount = daily.filter((k) => isHit(k, idx, date, ws)).length;
  const completion = dayCompletion(active, idx, date);
  const week = weekScore(db.areas, db.kpis, idx, date, today, ws, since);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{format(fromISO(date), "EEEE, d MMMM yyyy")}</p>
          <h1 className="text-3xl font-bold">{isToday ? greeting(now) : "Editing a past day"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className={btnCls} onClick={() => setDate(toISO(addDays(fromISO(date), -1)))} aria-label="Previous day">
            ←
          </button>
          <input
            type="date"
            className={inputCls}
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <button
            className={btnCls}
            onClick={() => setDate(toISO(addDays(fromISO(date), 1)))}
            disabled={isToday}
            aria-label="Next day"
          >
            →
          </button>
          {!isToday && (
            <button className={btnCls} onClick={() => setDate(today)}>
              Today
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-5">
          <ProgressRing
            value={(completion ?? 0) * 100}
            size={88}
            stroke={8}
            color={scoreColor((completion ?? 0) * 100)}
            label={`${doneCount}/${daily.length}`}
          />
          <div>
            <p className="text-sm text-slate-400">Daily targets</p>
            <p className="text-lg font-semibold">
              {daily.length === 0
                ? "No daily targets"
                : doneCount === daily.length
                  ? "All done 💪"
                  : `${daily.length - doneCount} left ${isToday ? "today" : "that day"}`}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-5">
          <ProgressRing value={week.life} size={88} stroke={8} color={scoreColor(week.life)} />
          <div>
            <p className="text-sm text-slate-400">Life Score this week</p>
            <p className="text-lg font-semibold">{verdict(week.life)}</p>
          </div>
        </Card>
        <CheckIn key={date} date={date} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {areas.map((a) => {
          const kpis = active.filter((k) => k.area_id === a.id).sort((x, y) => x.sort_order - y.sort_order);
          if (!kpis.length) return null;
          const s = week.areas[a.id];
          return (
            <Card key={a.id}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <span className="text-2xl">{a.icon}</span>
                  {a.name}
                </h2>
                {s !== undefined && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: `${scoreColor(s)}22`, color: scoreColor(s) }}
                    title="Area score this week"
                  >
                    {s}%
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {kpis.map((k) => (
                  <KpiRow key={k.id} kpi={k} date={date} today={today} color={a.color} now={now} />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CheckIn({ date }: { date: string }) {
  const { db, saveReflection } = useData();
  const existing = db.reflections.find((r) => r.date === date);
  const [note, setNote] = useState(existing?.note ?? "");
  const [editing, setEditing] = useState(false);
  const score = existing?.score ?? 0;
  const save = (s: number, n = note) => saveReflection({ date, score: s, note: n });

  return (
    <Card>
      <p className="mb-2 text-sm text-slate-400">How was the day? (1–10)</p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => save(n, existing?.note ?? note)}
            className="h-7 w-7 rounded-md border text-xs font-semibold"
            style={
              n === score
                ? { background: scoreColor(n * 10), borderColor: scoreColor(n * 10), color: "#020617" }
                : { borderColor: "#334155" }
            }
          >
            {n}
          </button>
        ))}
      </div>
      {editing || (!existing?.note && score > 0) ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(score || 5);
            setEditing(false);
          }}
        >
          <input
            className={`${inputCls} flex-1`}
            placeholder="One line about today…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className={btnCls}>Save</button>
        </form>
      ) : existing?.note ? (
        <button
          className="mt-2 block text-left text-sm text-slate-300 hover:text-white"
          onClick={() => {
            setNote(existing.note);
            setEditing(true);
          }}
        >
          “{existing.note}”
        </button>
      ) : null}
    </Card>
  );
}

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function verdict(score: number) {
  if (score >= 90) return "Crushing it 🔥";
  if (score >= 75) return "On track";
  if (score >= 50) return "Slipping. Push today";
  return "Off track. Get back on it";
}
