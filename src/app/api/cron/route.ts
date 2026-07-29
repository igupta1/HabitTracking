import { NextResponse } from 'next/server'
import { sendDailySummary } from '@/lib/summary'

/**
 * Hit once a day by the Vercel cron in vercel.json. Vercel sends
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set, which is the
 * only thing keeping this endpoint from being publicly triggerable.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sent = await sendDailySummary()
  return NextResponse.json({ sent })
}
