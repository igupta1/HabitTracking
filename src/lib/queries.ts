import { sql } from '@/db'
import { habitsFor, ownsTask, type Habit, type UserId } from './habits'
import { toDay } from './day'

export type TaskRow = {
  id: string
  title: string
  done: boolean
  category: string | null
  subcategory: string | null
  priority: number | null
}
export type FoodRow = {
  id: string
  text: string
  calories: number | null
  protein_g: number | null
}
export type WorkoutRow = {
  id: string
  mode: 'strength' | 'cardio'
  name: string
  distance_miles: number | null
  duration_minutes: number | null
}

export type DayData = {
  day: string
  toggles: Record<string, { done: boolean; count: number }>
  tasks: TaskRow[]
  food: FoodRow[]
  weight: number | null
  workouts: WorkoutRow[]
}

/**
 * `tasks.sort_order`, `tasks.subcategory` and `food.protein_g` all arrived
 * after the app was already deployed, and the only way to reach the hosted
 * database is a SQL console. Rather than make a schema edit a manual step, the
 * same idempotent statements from schema.sql run once per server process,
 * before the first read.
 */
let migrated: Promise<void> | undefined
function ensureColumns(): Promise<void> {
  migrated ??= (async () => {
    await sql`alter table tasks add column if not exists sort_order double precision`
    await sql`
      update tasks t set sort_order = s.n * 1000
      from (select id, row_number() over (partition by user_id, day
                                          order by done, priority nulls last, created_at) as n
            from tasks) s
      where t.id = s.id and t.sort_order is null`
    await sql`alter table tasks add column if not exists subcategory text`
    // These four spent one deploy as top-level categories before SWE gained
    // subcategories; move them down a level rather than orphaning them under
    // "Other". Matches nothing once it has run.
    await sql`
      update tasks set subcategory = category, category = 'SWE'
      where category in ('Production Operations', 'TPU Roadmap',
                         'Developer Quality of Life', 'Collaboration')`
    // No backfill: entries logged before protein tracking simply have none.
    await sql`alter table food add column if not exists protein_g int`
  })().catch((e) => {
    migrated = undefined // a cold-start timeout shouldn't poison every later load
    throw e
  })
  return migrated
}

/**
 * Unfinished tasks follow you forward: anything still open from an earlier day
 * is moved onto `day` the first time someone loads the page. Moving the row
 * rather than copying it keeps one task with one id — you can't finish
 * yesterday's copy and still be staring at today's.
 *
 * Only ever called for today. Carried tasks keep their order relative to each
 * other and land as a block above whatever today already holds, so a task left
 * open for a week keeps arriving at the top until it's done or ✕'d.
 */
export async function rollOverTasks(user: UserId, day: string = toDay()): Promise<void> {
  await ensureColumns()
  await sql`
    with carried as (
      select id, row_number() over (order by sort_order nulls last, created_at) as n
      from tasks where user_id = ${user} and day < ${day} and not done
    ),
    today as (
      select coalesce(min(sort_order), 0) as floor, (select count(*) from carried) as n
      from tasks where user_id = ${user} and day = ${day}
    )
    update tasks t
    set day = ${day},
        -- n + 1 so the last carried row still lands below today's first, not on it
        sort_order = (select floor - (n + 1) * 1000 from today) + c.n * 1000
    from carried c
    where t.id = c.id`
}

export async function loadDay(user: UserId, day: string = toDay()): Promise<DayData> {
  await ensureColumns() // a no-op after the first call; see above
  const [toggles, tasks, food, weights, workouts] = await Promise.all([
    sql<{ habit_key: string; done: boolean; count: number }[]>`
      select habit_key, done, count from toggles
      where user_id = ${user} and day = ${day}`,
    // Hand-picked order within a segment; the client groups by category and
    // then priority (see groupTasks), which is the only sort that happens on
    // its own. Ticking a task off leaves it exactly where you put it.
    sql<TaskRow[]>`
      select id, title, done, category, subcategory, priority from tasks
      where user_id = ${user} and day = ${day}
      order by sort_order nulls last, created_at`,
    sql<FoodRow[]>`
      select id, text, calories, protein_g from food
      where user_id = ${user} and day = ${day} order by created_at`,
    sql<{ lbs: number }[]>`
      select lbs from weights where user_id = ${user} and day = ${day}`,
    sql<WorkoutRow[]>`
      select id, mode, name, distance_miles, duration_minutes
      from workouts where user_id = ${user} and day = ${day} order by created_at`,
  ])

  return {
    day,
    toggles: Object.fromEntries(toggles.map((t) => [t.habit_key, { done: t.done, count: t.count }])),
    tasks,
    food,
    weight: weights[0]?.lbs ?? null,
    workouts,
  }
}

/** Whether today's data alone implies the habit is done. */
function impliedByData(user: UserId, h: Habit, d: DayData): boolean {
  switch (h.kind) {
    case 'strength':
      return d.workouts.some((w) => w.mode === 'strength')
    case 'cardio':
      return d.workouts.some((w) => w.mode === 'cardio')
    case 'food':
      return d.food.length > 0
    case 'weight':
      return d.weight !== null
    case 'tasks': {
      // Each list is judged on its own rows, so clearing SWE says nothing about
      // Project — they are separate habits with separate checks.
      const mine = d.tasks.filter((t) => ownsTask(user, h, t))
      if (mine.length === 0) return false
      // Clearing the must-dos counts as done, even with P2/P3 left over. With no
      // P1s to clear (always the case for Saloni, who has no priorities) it
      // falls back to needing the whole list.
      const p1 = mine.filter((t) => t.priority === 1)
      return p1.length > 0 ? p1.every((t) => t.done) : mine.every((t) => t.done)
    }
    default:
      return false
  }
}

/**
 * Whether a single habit counts as done for the day.
 *
 * For toggles and counters the stored row *is* the state. For the data-backed
 * kinds it's a manual override: the mere existence of a row means it was
 * checked or unchecked by hand, and that beats what the data implies. Adding
 * data deletes the row, so the automatic behaviour resumes.
 */
export function isDone(user: UserId, h: Habit, d: DayData): boolean {
  const row = d.toggles[h.key]
  switch (h.kind) {
    case 'toggle':
      return row?.done ?? false
    case 'counter':
      return (row?.count ?? 0) >= (h.target ?? 1)
    default:
      return row ? row.done : impliedByData(user, h, d)
  }
}

export function progress(user: UserId, d: DayData): { done: number; total: number } {
  const hs = habitsFor(user)
  return { done: hs.filter((h) => isDone(user, h, d)).length, total: hs.length }
}


export type WeightPoint = { day: string; lbs: number }

/** How far back the chart behind the weight row reaches. */
export const WEIGHT_WINDOW_DAYS = 90

/**
 * Body weight over the last WEIGHT_WINDOW_DAYS, oldest first — the whole of
 * what the weight chart draws. The only read in the app that looks past today,
 * so it's the only place `day` comes back out of the database: as text, to stay
 * the same `YYYY-MM-DD` string everything else passes around.
 */
export async function weightHistory(
  user: UserId,
  day: string = toDay()
): Promise<WeightPoint[]> {
  return sql<WeightPoint[]>`
    select to_char(day, 'YYYY-MM-DD') as day, lbs from weights
    where user_id = ${user} and day > ${day}::date - ${WEIGHT_WINDOW_DAYS}::int
    order by day`
}

/**
 * Strength workout names this user has typed before ("Push", "Pull", "Legs"),
 * most recent first — feeds the datalist so it's one tap after the first week.
 */
export async function recentWorkoutNames(user: UserId): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`
    select name from workouts
    where user_id = ${user} and mode = 'strength' and name <> ''
    group by name order by max(created_at) desc limit 12`
  return rows.map((r) => r.name)
}
