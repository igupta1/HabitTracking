'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/db'
import { toDay } from '@/lib/day'
import { habit, isUserId, type UserId } from '@/lib/habits'

/**
 * There is no login: identity is the `/ishaan` or `/saloni` path, and every
 * action takes the acting user as an argument. That means anyone with the URL
 * can write as either person — an accepted trade for a two-person app on an
 * unlisted deploy URL. `check()` only stops a bogus user_id from reaching the
 * database; it is not protection against impersonation.
 */
function check(user: string): UserId {
  if (!isUserId(user)) throw new Error(`unknown user: ${user}`)
  return user
}

/** Both pages show both people, so any change invalidates both. */
function refresh() {
  revalidatePath('/ishaan')
  revalidatePath('/saloni')
}

type OwnedTable = 'tasks' | 'food' | 'workouts'

/** Every by-id mutation goes through this so one user can't touch the other's rows. */
async function ownsRow(table: OwnedTable, id: string, user: UserId) {
  const rows = await sql<{ id: string }[]>`
    select id from ${sql(table)} where id = ${id} and user_id = ${user}`
  return rows.length > 0
}

/** One delete for tasks, food entries and workouts. */
export async function deleteRow(u: string, table: OwnedTable, id: string) {
  const user = check(u)
  if (!(await ownsRow(table, id, user))) return
  await sql`delete from ${sql(table)} where id = ${id}`
  refresh()
}

// ---------------------------------------------------------------- toggles

export async function toggleHabit(u: string, key: string) {
  const user = check(u)
  const h = habit(user, key)
  if (!h || h.kind !== 'toggle') return

  await sql`
    insert into toggles (user_id, habit_key, day, done)
    values (${user}, ${key}, ${toDay()}, true)
    on conflict (user_id, habit_key, day)
      do update set done = not toggles.done, updated_at = now()`
  refresh()
}

export async function setCounter(u: string, key: string, delta: number) {
  const user = check(u)
  const h = habit(user, key)
  if (!h || h.kind !== 'counter') return

  const target = h.target ?? 1
  // The clamp for a brand-new row needs no SQL at all. For the update, both
  // bounds are cast explicitly: `least($1, $2)` over two bare parameters gives
  // Postgres nothing to infer from, so it picks text and greatest(0, text)
  // fails with "types integer and text cannot be matched".
  const initial = Math.max(0, Math.min(target, delta))
  await sql`
    insert into toggles (user_id, habit_key, day, count)
    values (${user}, ${key}, ${toDay()}, ${initial})
    on conflict (user_id, habit_key, day)
      do update set count = greatest(0, least(${target}::int, toggles.count + ${delta}::int)),
                    updated_at = now()`
  refresh()
}

// ---------------------------------------------------------------- tasks

export async function addTask(
  u: string,
  title: string,
  category?: string | null,
  priority?: number | null
) {
  const user = check(u)
  const t = title.trim()
  if (!t) return

  // Only users whose tasks habit defines categories send these.
  const cats = habit(user, 'tasks')?.categories
  const cat = cats && category && cats.includes(category) ? category : null
  const pri = cats && priority && priority >= 1 && priority <= 3 ? Math.round(priority) : null

  await sql`
    insert into tasks (user_id, day, title, category, priority)
    values (${user}, ${toDay()}, ${t}, ${cat}, ${pri})`
  refresh()
}

export async function setTaskPriority(u: string, id: string, priority: number) {
  const user = check(u)
  if (priority < 1 || priority > 3) return
  if (!(await ownsRow('tasks', id, user))) return

  await sql`update tasks set priority = ${Math.round(priority)} where id = ${id}`
  refresh()
}

export async function toggleTask(u: string, id: string) {
  const user = check(u)
  if (!(await ownsRow('tasks', id, user))) return
  await sql`update tasks set done = not done where id = ${id}`
  refresh()
}

// ---------------------------------------------------------------- food

export async function addFood(u: string, text: string, calories?: number | null) {
  const user = check(u)
  const t = text.trim()
  if (!t) return

  await sql`
    insert into food (user_id, day, text, calories)
    values (${user}, ${toDay()}, ${t}, ${cleanCalories(calories)})`
  refresh()
}

export async function updateFood(
  u: string,
  id: string,
  text: string,
  calories?: number | null
) {
  const user = check(u)
  if (!(await ownsRow('food', id, user))) return

  const t = text.trim()
  // Clearing the text is how you delete an entry by editing.
  if (!t) {
    await sql`delete from food where id = ${id}`
  } else {
    await sql`
      update food set text = ${t}, calories = ${cleanCalories(calories)}
      where id = ${id}`
  }
  refresh()
}

function cleanCalories(c?: number | null): number | null {
  return c && c > 0 ? Math.round(c) : null
}

// ---------------------------------------------------------------- weight

export async function setWeight(u: string, lbs: number) {
  const user = check(u)
  if (!Number.isFinite(lbs) || lbs <= 0 || lbs > 1000) return

  await sql`
    insert into weights (user_id, day, lbs) values (${user}, ${toDay()}, ${lbs})
    on conflict (user_id, day) do update set lbs = ${lbs}`
  refresh()
}

// ---------------------------------------------------------------- workouts

/**
 * Strength is just the typed name of the session ("Push", "Legs", "SolidCore",
 * "Rest"). Set-by-set logging stays in RepCount. One per day.
 */
export async function logStrength(u: string, name: string) {
  const user = check(u)
  const n = name.trim()
  if (!n) return

  // A partial unique index enforces one strength workout per day; a second
  // insert is silently ignored rather than erroring in the UI.
  await sql`
    insert into workouts (user_id, day, mode, name)
    values (${user}, ${toDay()}, 'strength', ${n})
    on conflict do nothing`
  refresh()
}

export async function logCardio(
  u: string,
  name: string,
  distanceMiles?: number | null,
  durationMinutes?: number | null
) {
  const user = check(u)
  await sql`
    insert into workouts (user_id, day, mode, name, distance_miles, duration_minutes)
    values (${user}, ${toDay()}, 'cardio', ${name},
            ${distanceMiles ?? null}, ${durationMinutes ?? null})`
  refresh()
}
