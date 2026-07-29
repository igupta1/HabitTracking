import { sql } from '@/db'
import { habitsFor, type Habit, type UserId } from './habits'
import { toDay } from './day'

export type TaskRow = { id: string; title: string; done: boolean; added_late: boolean }
export type FoodRow = { id: string; text: string; calories: number | null }
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

export async function loadDay(user: UserId, day: string = toDay()): Promise<DayData> {
  const [toggles, tasks, food, weights, workouts] = await Promise.all([
    sql<{ habit_key: string; done: boolean; count: number }[]>`
      select habit_key, done, count from toggles
      where user_id = ${user} and day = ${day}`,
    sql<TaskRow[]>`
      select id, title, done, added_late from tasks
      where user_id = ${user} and day = ${day} order by created_at`,
    sql<FoodRow[]>`
      select id, text, calories from food
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

/** Whether a single habit counts as done for the day. */
export function isDone(h: Habit, d: DayData): boolean {
  switch (h.kind) {
    case 'toggle':
      return d.toggles[h.key]?.done ?? false
    case 'counter':
      return (d.toggles[h.key]?.count ?? 0) >= (h.target ?? 1)
    case 'strength':
      return d.workouts.some((w) => w.mode === 'strength')
    case 'cardio':
      return d.workouts.some((w) => w.mode === 'cardio')
    case 'food':
      return d.food.length > 0
    case 'weight':
      return d.weight !== null
    case 'tasks':
      return d.tasks.length > 0 && d.tasks.every((t) => t.done)
  }
}

export function progress(user: UserId, d: DayData): { done: number; total: number } {
  const hs = habitsFor(user)
  return { done: hs.filter((h) => isDone(h, d)).length, total: hs.length }
}

/** Remaining task titles — what the partner view leads with. */
export function remainingTasks(d: DayData): string[] {
  return d.tasks.filter((t) => !t.done).map((t) => t.title)
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
