import { sql } from '@/db'
import { toDay } from './day'
import { nameOf, partnerOf, USER_IDS } from './habits'
import { pushTo } from './push'
import { loadDay, progress, remainingTasks } from './queries'

/**
 * The 8pm check-in: each person gets their own standing, the other's, and
 * whatever they still have open. Driven by a once-daily Vercel cron.
 */
export async function sendDailySummary(): Promise<boolean> {
  const day = toDay()

  // The marker row makes this idempotent, so a retried cron won't double-send.
  const claimed = await sql<{ id: string }[]>`
    insert into events (actor, kind, day, summary)
    select 'ishaan', 'daily_summary', ${day}, '8pm summary sent'
    where not exists (
      select 1 from events where kind = 'daily_summary' and day = ${day}
    )
    returning id`
  if (claimed.length === 0) return false

  for (const me of USER_IDS) {
    const them = partnerOf(me)
    const [mine, theirs] = await Promise.all([loadDay(me, day), loadDay(them, day)])
    const mp = progress(me, mine)
    const tp = progress(them, theirs)
    const left = remainingTasks(mine)

    await pushTo(me, {
      title: '8pm check-in',
      body:
        `You ${mp.done}/${mp.total} · ${nameOf(them)} ${tp.done}/${tp.total}` +
        (left.length
          ? ` — ${left.length} task${left.length === 1 ? '' : 's'} left: ${left.join(', ')}`
          : ''),
      tag: 'summary',
      url: `/${me}`,
    })
  }
  return true
}
