/**
 * The two goal sets. This is a plain constant on purpose — editing this file
 * and pushing is simpler than any admin UI, and habit_key is stored as text so
 * removing a habit here leaves old entries intact.
 */

export const USERS = {
  ishaan: { name: 'Ishaan', color: '#59d9d9' },
  saloni: { name: 'Saloni', color: '#f0a3c4' },
} as const

export type UserId = keyof typeof USERS
export const USER_IDS = Object.keys(USERS) as UserId[]

export function partnerOf(id: UserId): UserId {
  return id === 'ishaan' ? 'saloni' : 'ishaan'
}

export function nameOf(id: UserId): string {
  return USERS[id].name
}

export type HabitKind =
  | 'toggle' // done / not done
  | 'counter' // 0..target
  | 'strength' // typed workout name — sets live in RepCount
  | 'cardio' // distance + duration
  | 'food' // free-text entries
  | 'tasks' // the morning-planned EOD list
  | 'weight' // daily body weight

export const SECTIONS = ['Career', 'Physique', 'Cardio & Stretching', 'Family', 'Friends'] as const
export type Section = (typeof SECTIONS)[number]

export type Habit = {
  key: string
  title: string
  kind: HabitKind
  section: Section
  /** counters only */
  target?: number
  /** food only — whether to show the calorie field */
  calories?: boolean
  /** tasks only — grouping headers, rendered in this order. Omit for a flat list. */
  categories?: string[]
}

export const HABITS: Record<UserId, Habit[]> = {
  ishaan: [
    {
      key: 'tasks',
      title: 'Tasks',
      kind: 'tasks',
      section: 'Career',
      categories: ['SWE', 'Project', 'Misc'],
    },

    { key: 'strength', title: 'Strength Workout', kind: 'strength', section: 'Physique' },
    { key: 'creatine', title: 'Creatine', kind: 'toggle', section: 'Physique' },
    { key: 'food', title: 'Food Log', kind: 'food', section: 'Physique', calories: false },
    { key: 'weight', title: 'Body weight', kind: 'weight', section: 'Physique' },

    { key: 'cardio', title: 'Cardio', kind: 'cardio', section: 'Cardio & Stretching' },
    { key: 'stretching', title: 'Stretching', kind: 'toggle', section: 'Cardio & Stretching' },
    { key: 'pad', title: 'Wart pad', kind: 'toggle', section: 'Cardio & Stretching' },

    { key: 'call_partner', title: 'Call with Saloni', kind: 'toggle', section: 'Family' },
    { key: 'future_date', title: 'Future date planned', kind: 'toggle', section: 'Family' },

    { key: 'call_friend', title: 'Call a friend', kind: 'toggle', section: 'Friends' },
    { key: 'weekend_plans', title: 'Weekend plans', kind: 'toggle', section: 'Friends' },
  ],

  saloni: [
    { key: 'tasks', title: 'Tasks', kind: 'tasks', section: 'Career' },

    { key: 'strength', title: 'Strength Workout', kind: 'strength', section: 'Physique' },
    { key: 'food', title: 'Food Log', kind: 'food', section: 'Physique', calories: true },
    { key: 'weight', title: 'Body weight', kind: 'weight', section: 'Physique' },

    { key: 'cardio', title: 'Cardio', kind: 'cardio', section: 'Cardio & Stretching' },
    { key: 'stretching', title: 'Stretching', kind: 'toggle', section: 'Cardio & Stretching' },
    { key: 'water', title: 'Water', kind: 'counter', section: 'Cardio & Stretching', target: 10 },

    { key: 'call_partner', title: 'Call with Ishaan', kind: 'toggle', section: 'Family' },
    { key: 'call_family', title: 'Call a family member', kind: 'toggle', section: 'Family' },

    { key: 'weekend_plans', title: 'Weekend plans', kind: 'toggle', section: 'Friends' },
  ],
}

export function habitsFor(user: UserId): Habit[] {
  return HABITS[user]
}

export function habit(user: UserId, key: string): Habit | undefined {
  return HABITS[user].find((h) => h.key === key)
}

/** Each kind appears at most once per person, so kind identifies the habit. */
export function keyOfKind(user: UserId, kind: HabitKind): string | undefined {
  return HABITS[user].find((h) => h.kind === kind)?.key
}

/** Sections that actually have habits for this user, in display order. */
export function sectionsFor(user: UserId): Section[] {
  const present = new Set(HABITS[user].map((h) => h.section))
  return SECTIONS.filter((s) => present.has(s))
}

export function isUserId(v: unknown): v is UserId {
  return typeof v === 'string' && v in USERS
}
