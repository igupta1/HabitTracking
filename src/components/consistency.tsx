'use client'

import { useState } from 'react'
import { formatDay, weekdayOf } from '@/lib/day'
import { USERS, type UserId } from '@/lib/habits'
import type { DayMark } from '@/lib/queries'

/**
 * A cell per day, filled on the days the habit was done — the answer to "how
 * consistent have I been" at a glance, behind the same button the weight row
 * uses for its chart.
 *
 * Weeks run left to right and weekdays top to bottom, so a column is a week and
 * a row is every Tuesday. That is the whole reason for the shape: skipping
 * every weekend draws two blank rows, which no run of dates in a line would
 * show. There is no streak count — the app deliberately doesn't keep them.
 */

const CELL = 14
const GAP = 3
const PITCH = CELL + GAP
const LABELS = 22 // the Mon/Wed/Fri gutter
const MISSED = '#262626' // neutral-800

export function Consistency({ user, days }: { user: UserId; days: DayMark[] }) {
  // The cell under the pointer, or stepped to with the arrow keys.
  const [sel, setSel] = useState<number | null>(null)

  if (days.length === 0) return null

  const color = USERS[user].color
  const doneCount = days.filter((d) => d.done).length
  // Leading blanks so the first day lands on its own weekday row.
  const offset = weekdayOf(days[0].day)
  const weeks = Math.ceil((offset + days.length) / 7)
  const at = (i: number) => ({ col: Math.floor((offset + i) / 7), row: (offset + i) % 7 })

  return (
    <div className="px-4 pb-3 pl-12">
      <div className="flex items-baseline gap-2 pb-2 text-sm">
        <span className="font-medium tabular-nums">
          {doneCount} of {days.length} days
        </span>
        <span className="text-xs text-neutral-500">since {formatDay(days[0].day)}</span>
      </div>

      <div
        role="img"
        tabIndex={0}
        aria-label={`${doneCount} of ${days.length} days done since ${formatDay(
          days[0].day
        )}. Arrow keys read each day.`}
        onPointerLeave={() => setSel(null)}
        onBlur={() => setSel(null)}
        onKeyDown={(e) => {
          // Left and right step a day; up and down step a week, which is the
          // same move the grid makes visually.
          const d =
            e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -7 : e.key === 'ArrowDown' ? 7 : 0
          if (!d) return
          e.preventDefault()
          setSel((s) => Math.min(days.length - 1, Math.max(0, (s ?? days.length - 1) + d)))
        }}
        className="relative inline-block rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-neutral-600"
      >
        <div className="flex">
          {/* Only three labels: a full week of them is noise at this size. */}
          <div
            className="grid text-[9px] leading-none text-neutral-600"
            style={{ width: LABELS, gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }}
          >
            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => (
              <span key={i} className="self-center">
                {l}
              </span>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gridTemplateColumns: `repeat(${weeks}, ${CELL}px)`,
              gridAutoFlow: 'column',
              gap: GAP,
            }}
          >
            {Array.from({ length: offset }, (_, i) => (
              <span key={`pad${i}`} />
            ))}
            {days.map((d, i) => (
              <span
                key={d.day}
                onPointerEnter={() => setSel(i)}
                style={{
                  backgroundColor: d.done ? color : MISSED,
                  borderRadius: 3,
                  outline: sel === i ? '1px solid #737373' : undefined,
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
        </div>

        {sel !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-neutral-800 px-2 py-1 text-xs leading-tight"
            style={{
              left: LABELS + at(sel).col * PITCH + CELL / 2,
              top: at(sel).row * PITCH - 4,
            }}
          >
            {/* What was logged, where the day has a name for itself — "Push"
                says more than "Done" ever did. */}
            <span className="font-medium">
              {days[sel].done ? (days[sel].note ?? 'Done') : 'Missed'}
            </span>
            <span className="ml-1.5 text-neutral-400">{formatDay(days[sel].day)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
