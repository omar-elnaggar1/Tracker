import { useState } from "react";
import { Card, btnCls, inputCls } from "../components/ui";
import { useData } from "../lib/data";
import { supabase } from "../lib/store";
import type { Settings } from "../lib/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SettingsPage() {
  const { db, saveSettings, store } = useData();
  const s = db.settings;
  const update = (patch: Partial<Settings>) => saveSettings({ ...s, ...patch });
  const [perm, setPerm] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card className="space-y-4">
        <h2 className="font-semibold">Schedule</h2>
        <Row label="Week starts on">
          <select
            className={inputCls}
            value={s.week_starts_on}
            onChange={(e) => update({ week_starts_on: Number(e.target.value) as Settings["week_starts_on"] })}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Evening check-in reminder">
          <input
            type="time"
            className={inputCls}
            value={s.checkin_time}
            onChange={(e) => e.target.value && update({ checkin_time: e.target.value })}
          />
        </Row>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Reminders</h2>
        <Row label="Remind me about unfinished KPIs">
          <input type="checkbox" checked={s.notifications} onChange={(e) => update({ notifications: e.target.checked })} />
        </Row>
        <Row label="Desktop notifications">
          {perm === "granted" ? (
            <span className="text-sm text-emerald-400">Enabled</span>
          ) : perm === "unsupported" ? (
            <span className="text-sm text-slate-500">Not supported in this browser</span>
          ) : (
            <button className={btnCls} onClick={async () => setPerm(await Notification.requestPermission())}>
              {perm === "denied" ? "Blocked in browser settings" : "Enable"}
            </button>
          )}
        </Row>
        <p className="text-xs text-slate-500">
          Reminders fire while Life Tracker is open in a tab. Set each KPI's reminder time on the Goals page.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Data</h2>
        <Row label="Storage">
          <span className="text-sm text-slate-300">
            {store.mode === "cloud" ? "Supabase (synced across devices)" : "This browser only"}
          </span>
        </Row>
        <Row label="Export all entries">
          <button className={btnCls} onClick={() => exportCsv(db)}>
            Download CSV
          </button>
        </Row>
        {supabase && (
          <Row label="Account">
            <button className={btnCls} onClick={() => supabase!.auth.signOut()}>
              Sign out
            </button>
          </Row>
        )}
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function exportCsv(db: ReturnType<typeof useData>["db"]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["date", "area", "kpi", "value", "unit", "note"].join(",")];
  const sorted = [...db.entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    const k = db.kpis.find((x) => x.id === e.kpi_id);
    const a = db.areas.find((x) => x.id === k?.area_id);
    lines.push([e.date, a?.name ?? "", k?.name ?? "", e.value, k?.unit ?? "", e.note].map(esc).join(","));
  }
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `life-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
