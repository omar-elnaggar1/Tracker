import { NavLink, Outlet, Link } from "react-router-dom";
import { useNow } from "../hooks/useNow";
import { useReminders } from "../hooks/useReminders";
import { useData } from "../lib/data";
import { reviewDueWeek, toISO } from "../lib/periods";
import { weekScore } from "../lib/scoring";
import { Splash } from "../App";
import { ProgressRing, scoreColor } from "./ui";

const NAV = [
  { to: "/", label: "Today", short: "Today", icon: "☀️" },
  { to: "/dashboard", label: "Dashboard", short: "Stats", icon: "📊" },
  { to: "/review", label: "Weekly Review", short: "Review", icon: "📝" },
  { to: "/goals", label: "Goals & KPIs", short: "Goals", icon: "🎯" },
  { to: "/settings", label: "Settings", short: "Settings", icon: "⚙️" },
];

export function Layout() {
  const { db, idx, ws, since, ready, error, clearError, store } = useData();
  const { toasts, dismiss } = useReminders();
  const today = toISO(useNow());
  if (!ready) return <Splash />;

  const score = weekScore(db.areas, db.kpis, idx, today, today, ws, since);
  const dueWeek = reviewDueWeek(today, ws);
  const reviewPending = dueWeek && !db.weekly_reviews.some((r) => r.week_start === dueWeek);

  return (
    <div className="flex min-h-screen">
      {/* Desktop: sidebar. Phones: top bar + bottom tab bar (below). */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src="/icon.svg" alt="" className="h-7 w-7" />
          <span className="text-lg font-bold">Life Tracker</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`
              }
            >
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2 rounded-xl border border-slate-800 p-4">
          <ProgressRing value={score.life} size={96} stroke={8} color={scoreColor(score.life)} sublabel="this week" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Life Score</span>
        </div>
        <p className="mt-3 px-2 text-center text-[11px] text-slate-600">
          {store.mode === "cloud" ? "☁️ Synced to the cloud" : "💾 Local mode (this browser only)"}
        </p>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-6 w-6" />
          <span className="font-bold">Life Tracker</span>
        </div>
        <span
          className="rounded-full px-3 py-1 text-sm font-bold"
          style={{ background: `${scoreColor(score.life)}22`, color: scoreColor(score.life) }}
        >
          Life Score {score.life}
        </span>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-[calc(env(safe-area-inset-top)+4rem)] md:p-8">
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            <span>Couldn't save: {error}</span>
            <button onClick={clearError} className="text-red-300 hover:text-white">
              ✕
            </button>
          </div>
        )}
        {reviewPending && (
          <Link
            to={`/review?week=${dueWeek}`}
            className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200 hover:bg-amber-950/70"
          >
            <span>📝 Your weekly review is due. Take 5 minutes to look back and set next week's focus.</span>
            <span className="font-semibold">Start review →</span>
          </Link>
        )}
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? "text-white" : "text-slate-500"}`
            }
          >
            <span className="text-xl leading-none">{n.icon}</span>
            {n.short}
          </NavLink>
        ))}
      </nav>

      <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex flex-col gap-2 md:inset-x-auto md:bottom-4 md:right-4 md:w-80">
        {toasts.map((t) => (
          <div key={t.key} className="rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">⏰ {t.title}</p>
                <p className="mt-1 text-sm text-slate-400">{t.body}</p>
              </div>
              <button onClick={() => dismiss(t.key)} className="text-slate-500 hover:text-white" aria-label="Dismiss">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
