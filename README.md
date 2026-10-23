# Life Tracker

A personal KPI tracker for the areas of your life (Prayer, Gym, Work, Side Hustle, Quality Time, or anything else you add), built to make it hard to slack.

- **Today**: one-click logging for every KPI, with progress bars, streaks and a "streak at risk" warning after 6pm, plus a 1–10 evening check-in.
- **Dashboard**: a weekly **Life Score** (0–100), per-area scores, 12-week trend, 30-day completion, streak leaderboard, and a per-KPI heatmap and history.
- **Weekly Review**: an auto-filled scorecard for the week plus wins / what slipped / next week's focus. A banner nags you on the last and first day of each week until the review is done.
- **Goals & KPIs**: add, edit or archive areas and KPIs. KPI types: checkbox, count, amount, money, 1–10 score, milestone checklist. Targets can be per day, week or month, each with an optional reminder time.
- **Reminders**: desktop notifications (and in-app toasts) for KPIs not yet on target at their reminder time, and for the evening check-in.

## How the Life Score works
- Daily KPIs: average completion over the days elapsed this week.
- Weekly and monthly KPIs: progress compared with where you *should* be by now (pace), capped at 100%.
- Area score = mean of its KPIs. Life Score = mean of the areas. KPIs with target 0 are tracked but not scored. Days before your first log don't count against you.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

With no configuration, it runs in **local mode**: data is saved in this browser only. That's good for trying it out.

## Turn on cloud sync (Supabase, free)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`, and run it. This creates the tables, the row-level security policies (only you can see your data) and realtime sync.
3. Optional, for a personal app: under **Authentication → Providers → Email**, turn off "Confirm email" so you can sign in immediately.
4. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
5. Restart `npm run dev` and create your account. Changes now sync live across every device you're signed in on.

Starter areas and KPIs are created on first sign-in. Edit them on the Goals page.

## Scripts
| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | typecheck + production build to `dist/` |
| `npm test` | unit tests for scoring, streaks and periods |

## Project layout
```
src/lib/       types, period math, scoring (pure + tested), storage (local/Supabase), app state
src/components layout, quick-log controls, KPI row, heatmap, UI primitives
src/pages/     Today, Dashboard, WeeklyReview, Goals, Settings, Login
supabase/      SQL migration
```

## Roadmap
- Mobile: responsive layout + installable PWA on the same Supabase backend (optionally Capacitor for app stores).
- Reminders while the app is closed: Web Push driven by a Supabase scheduled function.
