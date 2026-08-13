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
  -- Only for users whose `tasks` habit defines categories (see lib/habits.ts).
  category   text,
  priority   int,                             -- 1..3, P1 highest
  -- Hand-picked order within the day, set by dragging. Spaced by 1000 so a row
  -- can be slotted between two others; `float` so it never runs out of room.
  sort_order double precision,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_day on tasks (user_id, day);

-- Added after the first deploy; src/lib/queries.ts runs the same two statements
-- once per process so a fresh push doesn't need anyone to open a SQL console.
alter table tasks add column if not exists sort_order double precision;
update tasks t set sort_order = s.n * 1000
  from (select id, row_number() over (partition by user_id, day
                                      order by done, priority nulls last, created_at) as n
        from tasks) s
  where t.id = s.id and t.sort_order is null;

create table if not exists food (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  day        date not null,
  text       text not null,
  calories   int,                             -- only shown for Saloni
  protein_g  int,                             -- likewise, in grams
  created_at timestamptz not null default now()
);
create index if not exists food_user_day on food (user_id, day);

-- Added after the first deploy, like tasks.sort_order above; src/lib/queries.ts
-- runs it once per process so a fresh push doesn't need a SQL console.
alter table food add column if not exists protein_g int;

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
-- One strength workout per day. Cardio is still unrestricted.
create unique index if not exists workouts_one_strength_per_day
  on workouts (user_id, day) where mode = 'strength';

-- No events or push tables: there are no notifications. Both people see each
-- other's day side by side on the same page instead.
