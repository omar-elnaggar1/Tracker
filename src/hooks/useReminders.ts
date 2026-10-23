import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useData } from "../lib/data";
import { periodLabel, toISO } from "../lib/periods";
import { currentTotal, formatValue, hasTarget, isHit } from "../lib/scoring";
import { useNow } from "./useNow";

export interface Reminder {
  key: string;
  title: string;
  body: string;
}

const firedKey = (key: string) => `life-tracker:reminded:${key}`;

function alreadyFired(key: string) {
  try {
    return localStorage.getItem(firedKey(key)) !== null;
  } catch {
    return false;
  }
}

function markFired(key: string) {
  try {
    localStorage.setItem(firedKey(key), "1");
  } catch {
    /* ignore */
  }
}

/**
 * While the app is open, fires a reminder once per day for each KPI whose reminder time has
 * passed and whose target for the current period isn't met, plus the evening check-in.
 * Shows a system notification when permitted, and always returns in-app toasts.
 */
export function useReminders() {
  const { db, idx, ws, ready } = useData();
  const now = useNow(30_000);
  const [toasts, setToasts] = useState<Reminder[]>([]);
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    if (!ready || !db.settings.notifications) return;
    const today = toISO(now);
    const hhmm = format(now, "HH:mm");
    const due: Reminder[] = [];

    for (const k of db.kpis) {
      if (!k.active || !k.reminder_time || !hasTarget(k) || hhmm < k.reminder_time) continue;
      if (isHit(k, idx, today, ws)) continue;
      const key = `${today}:${k.id}`;
      if (alreadyFired(key)) continue;
      const area = db.areas.find((a) => a.id === k.area_id);
      due.push({
        key,
        title: `${area?.icon ?? ""} ${k.name}`.trim(),
        body: `${formatValue(k, currentTotal(k, idx, today, ws))} of ${formatValue(k, k.target)} ${periodLabel[k.period]}. Don't let it slip.`,
      });
    }

    if (hhmm >= db.settings.checkin_time && !db.reflections.some((r) => r.date === today)) {
      const key = `${today}:checkin`;
      if (!alreadyFired(key)) {
        due.push({ key, title: "Evening check-in", body: "Rate your day and log anything you missed." });
      }
    }

    if (!due.length) return;
    for (const r of due) {
      markFired(r.key);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(r.title, { body: r.body, tag: r.key, icon: "/icon.svg" });
      }
    }
    setToasts((t) => [...t, ...due]);
  }, [now, ready, db, idx, ws]);

  return { toasts, dismiss: (key: string) => setToasts((t) => t.filter((x) => x.key !== key)) };
}
