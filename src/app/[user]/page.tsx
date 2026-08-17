import { notFound } from 'next/navigation'
import { partnerOf, habitsFor, sectionsFor, nameOf, isUserId, USERS, type UserId } from '@/lib/habits'
import {
  loadDay,
  rollOverTasks,
  progress,
  isDone,
  recentWorkoutNames,
  weightHistory,
  habitHistory,
  type DayData,
  type WeightPoint,
  type DayMark,
} from '@/lib/queries'
import { toDay, formatDay } from '@/lib/day'
import { HabitRow } from '@/components/rows'

export const dynamic = 'force-dynamic'

/**
 * Both people, side by side. Yours is interactive, theirs is read-only — that's
 * the whole accountability surface, so there's no separate partner page.
 * Stacks on narrow screens.
 */
function Column({
  who,
  day,
  weights,
  history,
  readOnly,
  names,
}: {
  who: UserId
  day: DayData
  weights: WeightPoint[]
  history: Record<string, DayMark[]>
  readOnly?: boolean
  names?: string[]
}) {
  const p = progress(who, day)

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 px-4">
        <span
          className="grid h-8 w-8 place-items-center rounded-full text-sm font-medium text-black"
          style={{ backgroundColor: USERS[who].color }}
        >
          {nameOf(who)[0]}
        </span>
        <h2 className="flex-1 text-lg font-semibold">{nameOf(who)}</h2>
        <span className="tabular-nums text-lg font-semibold">
          {p.done}
          <span className="text-neutral-600">/{p.total}</span>
        </span>
      </div>

      <div className="space-y-4">
        {sectionsFor(who).map((section) => (
          <section key={section}>
            <h3 className="px-4 pb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {section}
            </h3>
            <div className="card divide-y divide-neutral-800">
              {habitsFor(who)
                .filter((h) => h.section === section)
                .map((h) => (
                  <HabitRow
                    key={h.key}
                    user={who}
                    habit={h}
                    day={day}
                    done={isDone(who, h, day)}
                    readOnly={readOnly}
                    names={names}
                    weights={weights}
                    history={history}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default async function TodayPage({ params }: { params: Promise<{ user: string }> }) {
  const { user } = await params
  if (!isUserId(user)) notFound()

  const me = user
  const them = partnerOf(me)
  const day = toDay()

  // Before the reads, so today's list already includes what was left over.
  // There is no cron in this app; opening the page is what advances the day.
  await Promise.all([rollOverTasks(me, day), rollOverTasks(them, day)])

  const [mine, theirs, workoutNames, myWeights, theirWeights, myPast, theirPast] =
    await Promise.all([
      loadDay(me, day),
      loadDay(them, day),
      recentWorkoutNames(me),
      // Both columns, since the charts open on either person's rows.
      weightHistory(me, day),
      weightHistory(them, day),
      habitHistory(me, day),
      habitHistory(them, day),
    ])

  return (
    <main className="mx-auto max-w-5xl px-2 pb-16">
      <header className="px-4 pb-5 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-neutral-500">{formatDay(day)}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <Column who={me} day={mine} weights={myWeights} history={myPast} names={workoutNames} />
        <Column who={them} day={theirs} weights={theirWeights} history={theirPast} readOnly />
      </div>
    </main>
  )
}
