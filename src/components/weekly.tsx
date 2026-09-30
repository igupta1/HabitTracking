'use client'

import { useState } from 'react'
import { formatWeek } from '@/lib/day'
import type { Habit, UserId } from '@/lib/habits'
import type { DayData } from '@/lib/queries'
import { HabitRow } from './rows'

/**
 * The week's goals, as the last row of their section's card: a line saying how
 * many of them are done that opens into the rows themselves.
 *
 * Collapsed by default, and on every load — there is no client storage in this
 * app and a week's goals are not what you came to the page for. Shut, the count
 * is the whole of what it has to say; open, the rows are ordinary habit rows,
 * checks and all, since a weekly goal differs from a daily one only in which
 * row its check is stored on (see Habit.weekly).
 */
export function WeeklyGroup({
  user,
  habits,
  done,
  day,
  readOnly,
}: {
  user: UserId
  habits: Habit[]
  /** Done by key, worked out server-side — `isDone` reads the database module. */
  done: Record<string, boolean>
  day: DayData
  readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const doneCount = habits.filter((h) => done[h.key]).length

  return (
    <div>
      {/* The text is the button's own name, so no aria-label to override it —
          "Weekly Sep 28 – Oct 4 1/2", plus expanded or not. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="font-medium">Weekly</span>
        <span className="flex-1 text-xs text-neutral-500">{formatWeek(day.week)}</span>
        <span className="tabular-nums text-sm text-neutral-400">
          {doneCount}/{habits.length}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="divide-y divide-neutral-800 border-t border-neutral-800 bg-black/20">
          {habits.map((h) => (
            <HabitRow
              key={h.key}
              user={user}
              habit={h}
              day={day}
              done={done[h.key] ?? false}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Down when there is more below, up when it is already showing. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-150 ${
        open ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6.5 8 10.5 12 6.5" />
    </svg>
  )
}
