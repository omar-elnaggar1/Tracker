import { useState } from "react";
import { useData } from "../lib/data";
import { newId } from "../lib/store";
import type { Kpi } from "../lib/types";
import { btnCls, inputCls } from "./ui";

/** One-click logging control for a KPI on a given day, specialised per KPI type. */
export function QuickLog({ kpi, date, color }: { kpi: Kpi; date: string; color: string }) {
  const { idx, setEntry } = useData();
  const day = idx.get(kpi.id)?.get(date) ?? 0;
  const set = (v: number) => setEntry(kpi.id, date, Math.max(0, v));

  switch (kpi.type) {
    case "checkbox":
      return (
        <button
          onClick={() => set(day ? 0 : 1)}
          aria-pressed={!!day}
          className="flex h-9 min-w-24 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition"
          style={
            day
              ? { background: color, borderColor: color, color: "#020617" }
              : { borderColor: "#334155", color: "#cbd5e1" }
          }
        >
          {day ? "✓ Done" : "Mark done"}
        </button>
      );

    case "count":
      // Small daily targets (like 5 prayers) get one tappable pip per unit.
      if (kpi.period === "daily" && kpi.target > 0 && kpi.target <= 10) {
        return (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: kpi.target }, (_, i) => (
              <button
                key={i}
                title={`${i + 1}`}
                aria-label={`Set ${kpi.name} to ${i + 1}`}
                onClick={() => set(day === i + 1 ? i : i + 1)}
                className="h-7 w-7 rounded-full border-2 transition"
                style={i < day ? { background: color, borderColor: color } : { borderColor: "#334155" }}
              />
            ))}
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <button className={btnCls} onClick={() => set(day - 1)} disabled={day <= 0} aria-label="Decrease">
            −
          </button>
          <span className="w-10 text-center font-semibold tabular-nums">{day}</span>
          <button className={btnCls} onClick={() => set(day + 1)} aria-label="Increase">
            +
          </button>
        </div>
      );

    case "amount":
    case "money":
      return <AmountLog value={day} unit={kpi.unit} onSet={set} />;

    case "score":
      return (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => set(day === n ? 0 : n)}
              className="h-7 w-7 rounded-md border text-xs font-semibold transition"
              style={n === day ? { background: color, borderColor: color, color: "#020617" } : { borderColor: "#334155" }}
            >
              {n}
            </button>
          ))}
        </div>
      );

    case "milestone":
      return <MilestoneList kpi={kpi} color={color} />;
  }
}

function AmountLog({ value, unit, onSet }: { value: number; unit: string; onSet: (v: number) => void }) {
  const [input, setInput] = useState("");
  const n = parseFloat(input);
  const valid = Number.isFinite(n);
  const submit = (mode: "add" | "set") => {
    if (!valid) return;
    onSet(mode === "add" ? value + n : n);
    setInput("");
  };
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit("add");
      }}
    >
      <span className="min-w-16 text-right font-semibold tabular-nums">{value.toLocaleString()}</span>
      <input
        type="number"
        step="any"
        inputMode="decimal"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={unit || "amount"}
        className={`${inputCls} w-24`}
      />
      <button type="submit" className={btnCls} disabled={!valid} title="Add to today's total">
        + Add
      </button>
      <button type="button" className={btnCls} disabled={!valid} onClick={() => submit("set")} title="Replace today's total">
        Set
      </button>
    </form>
  );
}

export function MilestoneList({ kpi, color, editable = true }: { kpi: Kpi; color: string; editable?: boolean }) {
  const { db, saveMilestone, deleteMilestone } = useData();
  const [title, setTitle] = useState("");
  const items = db.milestones.filter((m) => m.kpi_id === kpi.id).sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="w-full space-y-1.5">
      {items.map((m) => (
        <div key={m.id} className="group flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!m.done_at}
            onChange={() => saveMilestone({ ...m, done_at: m.done_at ? null : new Date().toISOString() })}
            className="h-4 w-4"
            style={{ accentColor: color }}
          />
          <span className={m.done_at ? "text-slate-500 line-through" : ""}>{m.title}</span>
          {editable && (
            <button
              onClick={() => deleteMilestone(m.id)}
              className="ml-auto text-xs text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
              aria-label={`Delete ${m.title}`}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {editable && (
        <form
          className="flex gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            saveMilestone({ id: newId(), kpi_id: kpi.id, title: title.trim(), done_at: null, sort_order: items.length });
            setTitle("");
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a milestone…"
            className={`${inputCls} flex-1`}
          />
          <button className={btnCls} disabled={!title.trim()}>
            Add
          </button>
        </form>
      )}
    </div>
  );
}
