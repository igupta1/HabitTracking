import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerOf, habitsFor, sectionsFor, nameOf, isUserId } from '@/lib/habits'
import { loadDay, progress } from '@/lib/queries'
import { toDay, formatDay } from '@/lib/day'
import { HabitRow } from '@/components/rows'

export const dynamic = 'force-dynamic'

export default async function PartnerPage({ params }: { params: Promise<{ user: string }> }) {
  const { user } = await params
  if (!isUserId(user)) notFound()

  const them = partnerOf(user)
  const day = toDay()
  const theirs = await loadDay(them, day)
  const p = progress(them, theirs)

  return (
    <main className="mx-auto max-w-md pb-16">
      <header className="px-4 pt-6">
        <Link href={`/${user}`} className="text-sm text-neutral-500">
          ← Today
        </Link>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{nameOf(them)}</h1>
            <p className="text-sm text-neutral-500">{formatDay(day)}</p>
          </div>
          <div className="text-2xl font-semibold tabular-nums">
            {p.done}
            <span className="text-neutral-600">/{p.total}</span>
          </div>
        </div>
      </header>

      <div className="mt-6 space-y-5">
        {sectionsFor(them).map((section) => (
          <section key={section}>
            <h2 className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {section}
            </h2>
            <div className="card divide-y divide-neutral-800">
              {habitsFor(them)
                .filter((h) => h.section === section)
                .map((h) => (
                  <HabitRow key={h.key} user={them} habit={h} day={theirs} readOnly />
                ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
