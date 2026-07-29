import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerOf, habitsFor, sectionsFor, nameOf, isUserId, USERS } from '@/lib/habits'
import { loadDay, progress, remainingTasks, recentWorkoutNames } from '@/lib/queries'
import { toDay, formatDay } from '@/lib/day'
import { HabitRow } from '@/components/rows'
import EnableNotifications from '@/components/EnableNotifications'

export const dynamic = 'force-dynamic'

export default async function TodayPage({ params }: { params: Promise<{ user: string }> }) {
  const { user } = await params
  if (!isUserId(user)) notFound()

  const me = user
  const them = partnerOf(me)
  const day = toDay()

  const [mine, theirs, workoutNames] = await Promise.all([
    loadDay(me, day),
    loadDay(them, day),
    recentWorkoutNames(me),
  ])
  const myProgress = progress(me, mine)
  const theirProgress = progress(them, theirs)
  const theirLeft = remainingTasks(theirs)

  return (
    <main className="mx-auto max-w-md pb-16">
      <header className="px-4 pt-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
            <p className="text-sm text-neutral-500">{formatDay(day)}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums">
              {myProgress.done}
              <span className="text-neutral-600">/{myProgress.total}</span>
            </div>
            <p className="text-xs text-neutral-500">{nameOf(me)}</p>
          </div>
        </div>

        <Link
          href={`/${me}/partner`}
          className="tap mt-4 flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-sm font-medium text-black"
            style={{ backgroundColor: USERS[them].color }}
          >
            {nameOf(them)[0]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{nameOf(them)}</span>
            <span className="block truncate text-xs text-neutral-500">
              {theirLeft.length > 0
                ? `${theirLeft.length} task${theirLeft.length === 1 ? '' : 's'} left: ${theirLeft.join(', ')}`
                : theirs.tasks.length > 0
                  ? 'all tasks done'
                  : 'no tasks planned yet'}
            </span>
          </span>
          <span className="tabular-nums text-sm text-neutral-400">
            {theirProgress.done}/{theirProgress.total}
          </span>
        </Link>
      </header>

      <div className="mt-6 space-y-5">
        {sectionsFor(me).map((section) => (
          <section key={section}>
            <h2 className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {section}
            </h2>
            <div className="card divide-y divide-neutral-800">
              {habitsFor(me)
                .filter((h) => h.section === section)
                .map((h) => (
                  <HabitRow key={h.key} user={me} habit={h} day={mine} names={workoutNames} />
                ))}
            </div>
          </section>
        ))}
      </div>

      <EnableNotifications user={me} />
    </main>
  )
}
