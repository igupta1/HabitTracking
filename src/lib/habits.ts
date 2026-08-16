/**
 * The two goal sets. This is a plain constant on purpose — editing this file
 * and pushing is simpler than any admin UI, and habit_key is stored as text so
 * removing a habit here leaves old entries intact.
 *
 * Section and habit titles are Title Case — every word capitalised, including
 * the small ones ("Call With Saloni").
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

export const SECTIONS = [
  'Career',
  'Project',
  'Physique',
  'Cardio & Stretching',
  'Family/Partner',
  'Friends',
] as const
export type Section = (typeof SECTIONS)[number]

/** A task category and the subcategories it holds, both drawn in this order. */
export type Category = { name: string; subs: string[] }

export type Habit = {
  key: string
  title: string
  kind: HabitKind
  section: Section
  /** counters only */
  target?: number
  /** food only — whether to show the calorie field */
  calories?: boolean
  /** food only — whether to show the protein field, in grams */
  protein?: boolean
  /** tasks only — the category tree, rendered in this order. Omit for a flat list. */
  categories?: Category[]
}

/**
 * A category and subcategory as the config would have them. Anything it doesn't
 * recognise — a name since removed, a subcategory under the wrong category, a
 * task filed before either existed — comes back null and draws under "Other".
 * One rule, shared by the add form, the drag and both writes.
 */
export function filing(
  cats: Category[] | undefined,
  category?: string | null,
  subcategory?: string | null
): { category: string | null; subcategory: string | null } {
  const c = cats?.find((x) => x.name === category)
  if (!c) return { category: null, subcategory: null }
  return {
    category: c.name,
    subcategory: subcategory && c.subs.includes(subcategory) ? subcategory : null,
  }
}

export const HABITS: Record<UserId, Habit[]> = {
  ishaan: [
    {
      key: 'tasks',
      title: 'Tasks',
      kind: 'tasks',
      section: 'Career',
      categories: [
        {
          name: 'SWE',
          subs: [
            'Production Operations',
            'TPU Roadmap',
            'Developer Quality of Life',
            'Collaboration',
            'General',
          ],
        },
        { name: 'Project', subs: ['Outreach', 'Product'] },
        { name: 'Misc', subs: ['Finance', 'Misc'] },
      ],
    },

    { key: 'review_gate', title: 'Review Gate', kind: 'toggle', section: 'Project' },

    { key: 'strength', title: 'Strength Workout', kind: 'strength', section: 'Physique' },
    { key: 'creatine', title: 'Creatine', kind: 'toggle', section: 'Physique' },
    { key: 'food', title: 'Food Log', kind: 'food', section: 'Physique', calories: false },
    { key: 'weight', title: 'Body Weight', kind: 'weight', section: 'Physique' },

    { key: 'cardio', title: 'Cardio', kind: 'cardio', section: 'Cardio & Stretching' },
    { key: 'stretching', title: 'Stretching', kind: 'toggle', section: 'Cardio & Stretching' },
    { key: 'pad', title: 'Wart Pad', kind: 'toggle', section: 'Cardio & Stretching' },

    { key: 'call_partner', title: 'Call With Saloni', kind: 'toggle', section: 'Family/Partner' },
    { key: 'future_date', title: 'Future Date Planned', kind: 'toggle', section: 'Family/Partner' },

    { key: 'call_friend', title: 'Call A Friend', kind: 'toggle', section: 'Friends' },
    { key: 'weekend_plans', title: 'Have Weekend Plans', kind: 'toggle', section: 'Friends' },
  ],

  saloni: [
    { key: 'tasks', title: 'Tasks', kind: 'tasks', section: 'Career' },

    { key: 'strength', title: 'Strength Workout', kind: 'strength', section: 'Physique' },
    { key: 'food', title: 'Food Log', kind: 'food', section: 'Physique', calories: true, protein: true },
    { key: 'weight', title: 'Body Weight', kind: 'weight', section: 'Physique' },

    { key: 'cardio', title: 'Cardio', kind: 'cardio', section: 'Cardio & Stretching' },
    { key: 'stretching', title: 'Stretching', kind: 'toggle', section: 'Cardio & Stretching' },
    { key: 'water', title: 'Water', kind: 'counter', section: 'Cardio & Stretching', target: 10 },

    { key: 'call_partner', title: 'Call With Ishaan', kind: 'toggle', section: 'Family/Partner' },
    { key: 'call_family', title: 'Call A Family Member', kind: 'toggle', section: 'Family/Partner' },

    { key: 'weekend_plans', title: 'Weekend Plans', kind: 'toggle', section: 'Friends' },
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
