import { useState } from "react";
import { MilestoneList } from "../components/QuickLog";
import { Card, btnCls, inputCls, primaryBtnCls } from "../components/ui";
import { useData } from "../lib/data";
import { newId } from "../lib/store";
import type { Area, Kpi, KpiType, Period } from "../lib/types";

const TYPES: { value: KpiType; label: string; hint: string }[] = [
  { value: "checkbox", label: "Checkbox", hint: "Done / not done each day. Target = days per period." },
  { value: "count", label: "Count", hint: "Whole numbers, e.g. prayers, pages, sets." },
  { value: "amount", label: "Amount", hint: "Hours, minutes, km, kg…" },
  { value: "money", label: "Money", hint: "Revenue, savings, spend." },
  { value: "score", label: "Score 1–10", hint: "Daily rating; target = average to aim for." },
  { value: "milestone", label: "Milestones", hint: "A checklist of steps toward a bigger goal." },
];
const PERIODS: Period[] = ["daily", "weekly", "monthly"];

export default function Goals() {
  const { db, saveArea } = useData();
  const areas = [...db.areas].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Goals & KPIs</h1>
          <p className="text-sm text-slate-400">Define what "on track" means for every part of your life.</p>
        </div>
        <button
          className={primaryBtnCls}
          onClick={() =>
            saveArea({ id: newId(), name: "New area", color: "#a855f7", icon: "⭐", sort_order: areas.length })
          }
        >
          + Add area
        </button>
      </header>
      {areas.map((a) => (
        <AreaEditor key={a.id} area={a} />
      ))}
    </div>
  );
}

function AreaEditor({ area }: { area: Area }) {
  const { db, saveArea, deleteArea, saveKpi } = useData();
  const [draft, setDraft] = useState(area);
  const dirty = JSON.stringify(draft) !== JSON.stringify(area);
  const kpis = db.kpis.filter((k) => k.area_id === area.id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <input
          className={`${inputCls} w-14 text-center text-lg`}
          value={draft.icon}
          onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          aria-label="Icon (emoji)"
        />
        <input
          className={`${inputCls} min-w-0 flex-1 font-semibold`}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="Area name"
        />
        <input
          type="color"
          className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-700 bg-slate-950"
          value={draft.color}
          onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          aria-label="Color"
        />
        {dirty && (
          <button className={primaryBtnCls} onClick={() => saveArea(draft)}>
            Save
          </button>
        )}
        <button
          className={`${btnCls} text-red-300`}
          onClick={() => confirm(`Delete "${area.name}" and all its KPIs and history?`) && deleteArea(area.id)}
          aria-label={`Delete ${area.name}`}
        >
          <span className="sm:hidden">✕</span>
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>

      <div className="space-y-2">
        {kpis.map((k) => (
          <KpiEditor key={k.id} kpi={k} color={area.color} />
        ))}
      </div>

      <button
        className={`${btnCls} mt-3`}
        onClick={() =>
          saveKpi({
            id: newId(),
            area_id: area.id,
            name: "New KPI",
            type: "checkbox",
            unit: "",
            target: 1,
            period: "daily",
            reminder_time: null,
            active: true,
            sort_order: kpis.length,
          })
        }
      >
        + Add KPI
      </button>
    </Card>
  );
}

function KpiEditor({ kpi, color }: { kpi: Kpi; color: string }) {
  const { saveKpi, deleteKpi } = useData();
  const [draft, setDraft] = useState(kpi);
  const dirty = JSON.stringify(draft) !== JSON.stringify(kpi);
  const set = <K extends keyof Kpi>(key: K, v: Kpi[K]) => setDraft((d) => ({ ...d, [key]: v }));
  const typeInfo = TYPES.find((t) => t.value === draft.type)!;

  return (
    <div className={`rounded-xl border border-slate-800 p-3 ${draft.active ? "" : "opacity-50"}`}>
      <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap">
        <Field label="Name" className="col-span-2 flex-1 sm:min-w-48">
          <input className={`${inputCls} w-full`} value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Type">
          <select className={`${inputCls} w-full`} value={draft.type} onChange={(e) => set("type", e.target.value as KpiType)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        {draft.type !== "milestone" && (
          <>
            <Field label="Target (0 = track only)">
              <input
                type="number"
                min={0}
                step="any"
                className={`${inputCls} w-full sm:w-28`}
                value={draft.target}
                onChange={(e) => set("target", Number(e.target.value) || 0)}
              />
            </Field>
            {draft.type !== "checkbox" && draft.type !== "score" && (
              <Field label="Unit">
                <input
                  className={`${inputCls} w-full sm:w-24`}
                  value={draft.unit}
                  placeholder="hrs"
                  onChange={(e) => set("unit", e.target.value)}
                />
              </Field>
            )}
            <Field label="Per">
              <select className={`${inputCls} w-full`} value={draft.period} onChange={(e) => set("period", e.target.value as Period)}>
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Remind at">
              <input
                type="time"
                className={`${inputCls} w-full`}
                value={draft.reminder_time ?? ""}
                onChange={(e) => set("reminder_time", e.target.value || null)}
              />
            </Field>
          </>
        )}
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-400">
          <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />
          Active
        </label>
        <div className="flex justify-end gap-2 sm:ml-auto">
          {dirty && (
            <button className={primaryBtnCls} onClick={() => saveKpi(draft)}>
              Save
            </button>
          )}
          <button
            className={`${btnCls} text-red-300`}
            onClick={() => confirm(`Delete "${kpi.name}" and its history?`) && deleteKpi(kpi.id)}
            aria-label={`Delete ${kpi.name}`}
          >
            ✕
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{typeInfo.hint}</p>
      {kpi.type === "milestone" && (
        <div className="mt-3">
          <MilestoneList kpi={kpi} color={color} />
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
