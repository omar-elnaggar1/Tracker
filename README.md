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

It connects to the Supabase project configured in `.env`. If those values are empty, it runs in **local mode** instead: data is saved in this browser only.

## Turn on cloud sync (Supabase, free)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`, and run it. This creates the tables, the row-level security policies (only you can see your data) and realtime sync.
3. Optional, for a personal app: under **Authentication → Providers → Email**, turn off "Confirm email" so you can sign in immediately.
4. The project's URL and public anon key are already in `.env`. To point at a different project, put your own `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env.local` (see `.env.example`).
5. Restart `npm run dev` and create your account. Changes now sync live across every device you're signed in on.

Starter areas and KPIs are created on first sign-in. Edit them on the Goals page.

## Put it online + install on your phone

The app is a PWA: one codebase that works on desktop and installs on phones like a normal app.

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub.
2. Click **Add New… → Project**, import `omar-elnaggar1/Tracker`, and click **Deploy**. The defaults are correct: Vite, `npm run build`, output `dist`. If the branch you want isn't `main`, change it under **Settings → Environments → Production → Branch Tracking**.
3. Copy your live URL (e.g. `https://tracker-xyz.vercel.app`). In Supabase, go to **Authentication → URL Configuration** and set **Site URL** to it.
4. On your phone, open the URL and sign in:
   - **iPhone:** Safari → Share → **Add to Home Screen**
   - **Android:** Chrome → ⋮ → **Install app**

Every push to the branch redeploys automatically, and the installed app updates itself.

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
- Reminders while the app is closed: Web Push driven by a Supabase scheduled function.
