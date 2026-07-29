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
  await sql`
    insert into toggles (user_id, habit_key, day, count)
    values (${user}, ${key}, ${toDay()}, greatest(0, least(${target}, ${delta})))
    on conflict (user_id, habit_key, day)
      do update set count = greatest(0, least(${target}, toggles.count + ${delta})),
                    updated_at = now()`
  refresh()
}

// ---------------------------------------------------------------- tasks

export async function addTask(u: string, title: string) {
  const user = check(u)
  const t = title.trim()
  if (!t) return

  await sql`insert into tasks (user_id, day, title) values (${user}, ${toDay()}, ${t})`
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

  const cal = calories && calories > 0 ? Math.round(calories) : null
  await sql`
    insert into food (user_id, day, text, calories)
    values (${user}, ${toDay()}, ${t}, ${cal})`
  refresh()
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
 * "Rest"). Set-by-set logging stays in RepCount.
 */
export async function logStrength(u: string, name: string) {
  const user = check(u)
  const n = name.trim()
  if (!n) return

  await sql`
    insert into workouts (user_id, day, mode, name)
    values (${user}, ${toDay()}, 'strength', ${n})`
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
