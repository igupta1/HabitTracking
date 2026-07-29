import webpush from 'web-push'
import { sql } from '@/db'
import type { UserId } from './habits'

let configured = false

function configure(): boolean {
  if (configured) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:habits@example.com', pub, priv)
  configured = true
  return true
}

export type PushPayload = {
  title: string
  body: string
  /** Same tag replaces rather than stacks in the notification tray. */
  tag?: string
  url?: string
}

/** Sends to every device `user` has subscribed. Dead subscriptions self-clean. */
export async function pushTo(user: UserId, payload: PushPayload): Promise<number> {
  if (!configure()) return 0

  const subs = await sql<{ endpoint: string; p256dh: string; auth: string }[]>`
    select endpoint, p256dh, auth from push_subs where user_id = ${user}`

  let sent = 0
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
        sent++
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode
        // 404/410 mean the subscription is gone — drop it so we stop retrying.
        if (code === 404 || code === 410) {
          await sql`delete from push_subs where endpoint = ${s.endpoint}`
        } else {
          console.error('push failed', code, e)
        }
      }
    })
  )
  return sent
}
