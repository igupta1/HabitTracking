import { sql } from '@/db'
import { appHour, toDay } from './day'
import { nameOf, partnerOf, type UserId } from './habits'
import { pushTo } from './push'

/** Nothing pushes between these hours — you'll see it in the app tomorrow. */
export const QUIET_START = 22
export const QUIET_END = 7

export function inQuietHours(now: Date = new Date()): boolean {
  const h = appHour(now)
  return h >= QUIET_START || h < QUIET_END
}

/** Records a completion and notifies the partner right away. */
export async function logEvent(
  actor: UserId,
  kind: string,
  summary: string,
  day: string = toDay()
): Promise<void> {
  await sql`insert into events (actor, kind, day, summary)
            values (${actor}, ${kind}, ${day}, ${summary})`

  if (inQuietHours()) return

  await pushTo(partnerOf(actor), {
    title: nameOf(actor),
    body: summary,
    tag: kind,
    url: `/${partnerOf(actor)}/partner`,
  })
}

