'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/db'
import { logEvent } from '@/lib/events'
import { toDay, isLate } from '@/lib/day'
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

function refresh(user: UserId) {
  revalidatePath(`/${user}`)
  // The partner's view of this user changed too.
  revalidatePath('/ishaan/partner')
  revalidatePath('/saloni/partner')
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
  refresh(user)
}

// ---------------------------------------------------------------- toggles

export async function toggleHabit(u: string, key: string) {
  const user = check(u)
  const h = habit(user, key)
  if (!h || h.kind !== 'toggle') return

  const day = toDay()
  const [row] = await sql<{ done: boolean }[]>`
    insert into toggles (user_id, habit_key, day, done)
    values (${user}, ${key}, ${day}, true)
    on conflict (user_id, habit_key, day)
      do update set done = not toggles.done, updated_at = now()
    returning done`

  if (row.done) await logEvent(user, 'toggle_checked', `✓ ${h.title}`, day)
  refresh(user)
}

export async function setCounter(u: string, key: string, delta: number) {
  const user = check(u)
  const h = habit(user, key)
  if (!h || h.kind !== 'counter') return

  const day = toDay()
  const target = h.target ?? 1
  const [row] = await sql<{ count: number }[]>`
    insert into toggles (user_id, habit_key, day, count)
    values (${user}, ${key}, ${day}, greatest(0, least(${target}, ${delta})))
    on conflict (user_id, habit_key, day)
      do update set count = greatest(0, least(${target}, toggles.count + ${delta})),
                    updated_at = now()
    returning count`

  // Only the moment it hits the target is worth a notification.
  if (row.count >= target) {
    await logEvent(user, 'counter_completed', `✓ ${h.title} ${row.count}/${target}`, day)
  }
  refresh(user)
}

// ---------------------------------------------------------------- tasks

export async function addTask(u: string, title: string) {
  const user = check(u)
  const t = title.trim()
  if (!t) return

  const day = toDay()
  const late = isLate()
  await sql`insert into tasks (user_id, day, title, added_late) values (${user}, ${day}, ${t}, ${late})`

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from tasks where user_id = ${user} and day = ${day}`
  // One event when the morning list is first laid down, not per task.
  if (!late && n === 1) await logEvent(user, 'tasks_planned', `planned today's tasks`, day)

  refresh(user)
}

export async function toggleTask(u: string, id: string) {
  const user = check(u)
  if (!(await ownsRow('tasks', id, user))) return

  const [row] = await sql<{ title: string; done: boolean; day: string }[]>`
    update tasks set done = not done where id = ${id}
    returning title, done, day::text as day`

  if (row.done) await logEvent(user, 'task_completed', `✓ ${row.title}`, row.day)
  refresh(user)
}

// ---------------------------------------------------------------- food

export async function addFood(u: string, text: string, calories?: number | null) {
  const user = check(u)
  const t = text.trim()
  if (!t) return

  const day = toDay()
  const cal = calories && calories > 0 ? Math.round(calories) : null
  await sql`insert into food (user_id, day, text, calories) values (${user}, ${day}, ${t}, ${cal})`
  await logEvent(user, 'food_logged', cal ? `ate ${t} (${cal} cal)` : `ate ${t}`, day)
  refresh(user)
}

// ---------------------------------------------------------------- weight

export async function setWeight(u: string, lbs: number) {
  const user = check(u)
  if (!Number.isFinite(lbs) || lbs <= 0 || lbs > 1000) return

  const day = toDay()
  await sql`
    insert into weights (user_id, day, lbs) values (${user}, ${day}, ${lbs})
    on conflict (user_id, day) do update set lbs = ${lbs}`
  await logEvent(user, 'weight_logged', `logged ${lbs} lbs`, day)
  refresh(user)
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

  const day = toDay()
  await sql`insert into workouts (user_id, day, mode, name) values (${user}, ${day}, 'strength', ${n})`
  await logEvent(user, 'workout_logged', `did ${n}`, day)
  refresh(user)
}

export async function logCardio(
  u: string,
  name: string,
  distanceMiles?: number | null,
  durationMinutes?: number | null
) {
  const user = check(u)
  const day = toDay()

  await sql`
    insert into workouts (user_id, day, mode, name, distance_miles, duration_minutes)
    values (${user}, ${day}, 'cardio', ${name}, ${distanceMiles ?? null}, ${durationMinutes ?? null})`

  const bits = [
    distanceMiles ? `${distanceMiles} mi` : null,
    durationMinutes ? `${durationMinutes} min` : null,
  ].filter(Boolean)
  await logEvent(
    user,
    'cardio_logged',
    `${name}${bits.length ? ` — ${bits.join(', ')}` : ''}`,
    day
  )
  refresh(user)
}

// ---------------------------------------------------------------- push

export async function savePushSubscription(
  u: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  const user = check(u)
  await sql`
    insert into push_subs (endpoint, user_id, p256dh, auth)
    values (${sub.endpoint}, ${user}, ${sub.keys.p256dh}, ${sub.keys.auth})
    on conflict (endpoint) do update set user_id = ${user},
      p256dh = ${sub.keys.p256dh}, auth = ${sub.keys.auth}`
}

export async function sendTestPush(u: string) {
  const user = check(u)
  const { pushTo } = await import('@/lib/push')
  const { nameOf } = await import('@/lib/habits')
  return pushTo(user, {
    title: 'Habits',
    body: `Notifications are on, ${nameOf(user)}.`,
    url: `/${user}`,
  })
}
