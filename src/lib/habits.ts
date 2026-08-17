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
  // Ishaan's work splits across the first three, one task list each. Saloni's
  // one undivided list stays under Career; nothing of hers is in the others.
  'Career',
  'SWE',
  'Project',
  'Misc',
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
  /**
   * Whether the row carries a button opening its consistency grid — a cell per
   * day, filled on the days it was done. Only for the kinds whose day is a
   * yes/no answerable from stored rows alone: toggle, counter, strength and
   * cardio (see habitHistory). Body weight has its own chart; tasks and food
   * have no single answer to draw.
   */
  history?: boolean
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
    // One task list per section, each titled for the work in it rather than
    // "Tasks" three times over. The category each list is named for is stored
    // on every task in it, which is how a task says which list it belongs to —
    // so the lists stay separate without a column of their own.
    {
      key: 'tasks',
      title: 'SWE',
      kind: 'tasks',
      section: 'SWE',
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
      ],
    },

    {
      key: 'tasks_project',
      title: 'Project',
      kind: 'tasks',
      section: 'Project',
      categories: [{ name: 'Project', subs: ['Outreach', 'Product'] }],
    },
    { key: 'review_gate', title: 'Review Gate', kind: 'toggle', section: 'Project' },

    // Last of the three, so it is also the catch-all — see ownsTask.
    {
      key: 'tasks_misc',
      title: 'Misc',
      kind: 'tasks',
      section: 'Misc',
      categories: [{ name: 'Misc', subs: ['Finance', 'Misc'] }],
    },

    // The five with `history`: the ones worth seeing a run of days for.
    { key: 'strength', title: 'Strength Workout', kind: 'strength', section: 'Physique', history: true },
    { key: 'creatine', title: 'Creatine', kind: 'toggle', section: 'Physique', history: true },
    { key: 'food', title: 'Food Log', kind: 'food', section: 'Physique', calories: false },
    { key: 'weight', title: 'Body Weight', kind: 'weight', section: 'Physique' },

    { key: 'cardio', title: 'Cardio', kind: 'cardio', section: 'Cardio & Stretching', history: true },
    {
      key: 'stretching',
      title: 'Stretching',
      kind: 'toggle',
      section: 'Cardio & Stretching',
      history: true,
    },
    { key: 'pad', title: 'Wart Pad', kind: 'toggle', section: 'Cardio & Stretching', history: true },

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

/**
 * Every kind but `tasks` appears at most once per person, so for those the kind
 * identifies the habit. Task lists come one per section, and are addressed by
 * key instead.
 */
export function keyOfKind(user: UserId, kind: HabitKind): string | undefined {
  return HABITS[user].find((h) => h.kind === kind)?.key
}

/** This user's task lists, in the order their sections appear. */
export function taskLists(user: UserId): Habit[] {
  return HABITS[user].filter((h) => h.kind === 'tasks')
}

/**
 * Whether a task belongs to this list. A task says which list it is in by the
 * category it is filed under — 'SWE', 'Project', 'Misc' — which is why those
 * names are both a list's own and a section's.
 *
 * The last list is the catch-all: a task filed under a category no list claims,
 * or under none at all, lands there rather than vanishing off the page. For
 * Saloni, whose one list has no categories, that is every task she has.
 */
export function ownsTask(user: UserId, h: Habit, t: { category: string | null }): boolean {
  if (h.categories?.some((c) => c.name === t.category)) return true
  const claimed = taskLists(user).some((l) => l.categories?.some((c) => c.name === t.category))
  return !claimed && h.key === taskLists(user).at(-1)?.key
}

/** Sections that actually have habits for this user, in display order. */
export function sectionsFor(user: UserId): Section[] {
  const present = new Set(HABITS[user].map((h) => h.section))
  return SECTIONS.filter((s) => present.has(s))
}

export function isUserId(v: unknown): v is UserId {
  return typeof v === 'string' && v in USERS
}
