/**
 * The two goal sets. This is a plain constant on purpose — editing this file
 * and pushing is simpler than any admin UI, and habit_key is stored as text so
 * removing a habit here leaves old entries intact.
 *
 * Section and habit titles are Title Case — every word capitalised, including
 * the small ones ("Dinner With Parents").
 */

export const USERS = {
  ishaan: { name: 'Ishaan', color: '#59d9d9' },
} as const

export type UserId = keyof typeof USERS
export const USER_IDS = Object.keys(USERS) as UserId[]

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
  // The work splits across the first three, one task list each.
  'SWE',
  'Project',
  'Miscellaneous',
  // One section for the body and one for the people in Ishaan's life.
  'Health',
  'Relationships',
] as const
export type Section = (typeof SECTIONS)[number]

/**
 * How an entry ate: the traffic light tapped onto it after it is logged, on the
 * food rows whose habit asks for one. Also the order the swatch cycles in.
 */
export const FOOD_RATINGS = ['green', 'yellow', 'red'] as const
export type FoodRating = (typeof FOOD_RATINGS)[number]

export function isFoodRating(v: unknown): v is FoodRating {
  return FOOD_RATINGS.includes(v as FoodRating)
}

/**
 * The two states a SWE or Project task can be in, drawn as headings in this
 * order. Stored in tasks.subcategory, so they are subcategories as far as the
 * filing, the drag and both writes are concerned — nothing else knows they
 * mean anything special.
 */
export const TASK_STATES = ['In Progress', 'Blocked']

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
  /** food only — whether each entry carries a red/yellow/green swatch */
  ratings?: boolean
  /** tasks only — the category tree, rendered in this order. Omit for a flat list. */
  categories?: Category[]
  /**
   * tasks only — whether each task carries a check of its own. Default true.
   * `false` where finishing a task means deleting it: the ✕ is the only way off
   * the list, so there is no such thing as a done task to draw a check for, and
   * the row's own check goes back to being a plain manual toggle (see
   * impliedByData).
   */
  checks?: boolean
  /**
   * Whether this is a week's goal rather than a day's. Its check is stored
   * against the Monday its week starts on (see weekStart), so it reads the same
   * from any day of that week; it is drawn in the collapsed Weekly group at the
   * foot of its section instead of among the day's rows, and it sits out the
   * day's score — a week's work is not today's. For the kinds whose whole state
   * is the check: toggle and counter.
   */
  weekly?: boolean
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
      // Two runs of rows rather than one: what is being worked on, and what is
      // waiting on someone else. Each is sorted on its own — priority first,
      // hand order inside a priority — and dragging a task across the heading
      // is what moves it between them. Miscellaneous stays a single flat list.
      categories: [{ name: 'SWE', subs: TASK_STATES }],
      // All three lists are ✕-to-finish.
      checks: false,
    },

    {
      key: 'tasks_project',
      title: 'Project',
      kind: 'tasks',
      section: 'Project',
      categories: [{ name: 'Project', subs: TASK_STATES }],
      checks: false,
    },
    // Last of the three, so it is also the catch-all — see ownsTask.
    {
      key: 'tasks_misc',
      title: 'Miscellaneous',
      kind: 'tasks',
      section: 'Miscellaneous',
      categories: [{ name: 'Miscellaneous', subs: [] }],
      checks: false,
    },

    // The rest of the Project section: the outreach that has to happen daily
    // for any of the list above it to matter. Plain checks, no list of their
    // own — the same three things every day.
    { key: 'review_gate', title: 'Review Gate With Full Pipeline', kind: 'toggle', section: 'Project' },
    { key: 'linkedin_connections', title: '20 LinkedIn Connections/Day', kind: 'toggle', section: 'Project' },
    { key: 'linkedin_followups', title: 'LinkedIn Follow Ups', kind: 'toggle', section: 'Project' },

    // The day's training, then the two it is easy to forget. The four with
    // `history`: the ones worth seeing a run of days for.
    { key: 'strength', title: 'Strength Workout', kind: 'strength', section: 'Health', history: true },
    { key: 'cardio', title: 'Cardio', kind: 'cardio', section: 'Health', history: true },
    { key: 'stretching', title: 'Stretching', kind: 'toggle', section: 'Health', history: true },
    { key: 'pad', title: 'Wart Pad', kind: 'toggle', section: 'Health', history: true },

    { key: 'call_partner', title: 'Call With Saloni', kind: 'toggle', section: 'Relationships' },
    { key: 'call_friend', title: 'Respond To Texts', kind: 'toggle', section: 'Relationships' },

    // The week's goals, two sections' worth. Each lot is drawn in a Weekly
    // group at the foot of its own section, collapsed until you open it —
    // they're what the daily rows are for, not something to check off today.
    // Kept together here, and in section order, since they read as one set.
    { key: 'w_finances', title: 'Review Finances & Investments', kind: 'toggle', section: 'Miscellaneous', weekly: true },

    { key: 'w_dinner_parents', title: 'Dinner With Parents', kind: 'toggle', section: 'Relationships', weekly: true },
    { key: 'w_two_dates', title: 'Two Planned Dates', kind: 'toggle', section: 'Relationships', weekly: true },
    { key: 'w_friends_adventure', title: 'Plans To See All Groups', kind: 'toggle', section: 'Relationships', weekly: true },
    { key: 'w_album', title: 'Pictures From Hangouts & Dates', kind: 'toggle', section: 'Relationships', weekly: true },
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

/**
 * Whether a habit is a week's goal rather than a day's — which decides the row
 * its check is stored on, where it is drawn, and whether the day's score counts
 * it. See Habit.weekly.
 */
export function isWeekly(h: Habit): boolean {
  return h.weekly === true
}

/** A section's daily rows, in config order — the card's own contents. */
export function dailyIn(user: UserId, section: Section): Habit[] {
  return HABITS[user].filter((h) => h.section === section && !isWeekly(h))
}

/** A section's weekly goals, which hang together in the group below them. */
export function weeklyIn(user: UserId, section: Section): Habit[] {
  return HABITS[user].filter((h) => h.section === section && isWeekly(h))
}

/** Every weekly key this user has — what a read of the week's row asks for. */
export function weeklyKeys(user: UserId): string[] {
  return HABITS[user].filter(isWeekly).map((h) => h.key)
}

/** This user's task lists, in the order their sections appear. */
export function taskLists(user: UserId): Habit[] {
  return HABITS[user].filter((h) => h.kind === 'tasks')
}

/**
 * Whether a task belongs to this list. A task says which list it is in by the
 * category it is filed under — 'SWE', 'Project', 'Miscellaneous' — which is
 * why those names are both a list's own and a section's.
 *
 * The last list is the catch-all: a task filed under a category no list claims,
 * or under none at all, lands there rather than vanishing off the page.
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
