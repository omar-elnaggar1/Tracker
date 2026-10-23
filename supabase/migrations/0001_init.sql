-- Life Tracker schema. Run once in Supabase → SQL Editor (or `supabase db push`).
-- Every row belongs to the signed-in user; Row Level Security keeps data private.

create table public.areas (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default '#22c55e',
  icon text not null default '⭐',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.kpis (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  area_id uuid not null references public.areas on delete cascade,
  name text not null,
  type text not null check (type in ('checkbox', 'count', 'amount', 'money', 'score', 'milestone')),
  unit text not null default '',
  target numeric not null default 0,
  period text not null default 'daily' check (period in ('daily', 'weekly', 'monthly')),
  reminder_time text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kpi_id uuid not null references public.kpis on delete cascade,
  date date not null,
  value numeric not null default 0,
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique (kpi_id, date)
);

create table public.milestones (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kpi_id uuid not null references public.kpis on delete cascade,
  title text not null,
  done_at timestamptz,
  sort_order int not null default 0
);

create table public.reflections (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  score int not null check (score between 1 and 10),
  note text not null default '',
  unique (user_id, date)
);

create table public.weekly_reviews (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,
  wins text not null default '',
  misses text not null default '',
  next_targets text not null default '',
  life_score int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  week_starts_on int not null default 1 check (week_starts_on between 0 and 6),
  checkin_time text not null default '21:00',
  notifications boolean not null default true
);

create index on public.kpis (user_id);
create index on public.entries (user_id, date);
create index on public.milestones (user_id);

-- Row Level Security: each user can only see and change their own rows.
do $$
declare t text;
begin
  foreach t in array array['areas', 'kpis', 'entries', 'milestones', 'reflections', 'weekly_reviews', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;
