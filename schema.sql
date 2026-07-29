-- Habits: Ishaan + Saloni. Two users, so user_id is just 'ishaan' | 'saloni'
-- and there is no users table. Apply with `npm run db:init` (idempotent).
--
-- 5 tables: toggles, tasks, food, weights, workouts.
--
-- Both users are in America/Los_Angeles, so `day` is a plain date and the
-- boundary is computed once in src/lib/day.ts.

create table if not exists toggles (
  user_id    text not null,
  habit_key  text not null,
  day        date not null,
  done       boolean not null default false,
  count      int not null default 0,          -- counters only (water 0-10)
  updated_at timestamptz not null default now(),
  primary key (user_id, habit_key, day)
);

create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  day        date not null,
  title      text not null,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_day on tasks (user_id, day);

create table if not exists food (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  day        date not null,
  text       text not null,
  calories   int,                             -- only shown for Saloni
  created_at timestamptz not null default now()
);
create index if not exists food_user_day on food (user_id, day);

create table if not exists weights (
  user_id text not null,
  day     date not null,
  lbs     real not null,
  primary key (user_id, day)
);

-- Strength and cardio share one table.
--   strength: `name` is typed free-text ("Push", "Pull", "Legs", "SolidCore").
--             Set-by-set logging lives in RepCount, not here.
--   cardio:   `name` is the type ("run"), plus distance and duration.
create table if not exists workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  day              date not null,
  mode             text not null,             -- 'strength' | 'cardio'
  name             text not null default '',
  distance_miles   real,
  duration_minutes real,
  created_at       timestamptz not null default now()
);
create index if not exists workouts_user_day on workouts (user_id, day);

-- No events or push tables: there are no notifications. Both people see each
-- other's day side by side on the same page instead.
