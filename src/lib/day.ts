/**
 * Day boundaries. Both users are in America/Los_Angeles, so there is exactly
 * one notion of "today" in this app and it lives here.
 */

export const APP_TZ = 'America/Los_Angeles'

/**
 * The day flips at 4am, not midnight — anything logged between midnight and
 * 4am belongs to the day you're still awake in, not the one that just started.
 */
export const RESET_HOUR = 4

const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  // h23 rather than hour12:false: some ICU builds render midnight as "24" there.
  hourCycle: 'h23',
})

/** `YYYY-MM-DD` for the given instant in app time. */
export function toDay(instant: Date = new Date()): string {
  const parts = PARTS.formatToParts(instant)
  const at = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value)

  // Roll back over the wall clock, not the instant, so the boundary stays at
  // 4am local on the two DST days as well.
  const midnight = Date.UTC(at('year'), at('month') - 1, at('day'))
  const day = new Date(midnight - (at('hour') < RESET_HOUR ? 86_400_000 : 0))
  // Sliced off an ISO string, which is YYYY-MM-DD — what the `date` column wants.
  return day.toISOString().slice(0, 10)
}


/**
 * Noon UTC on a `YYYY-MM-DD`, which is what everything below reads. Noon rather
 * than midnight so no formatter's own timezone can round it onto the day before.
 */
function noon(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

const LONG = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const SHORT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
})

/** "Tue, Jul 29" for the day header. */
export function formatDay(day: string): string {
  return LONG.format(noon(day))
}

/** "Jul 29" — the weight chart, where the weekday is noise on every tick. */
export function formatShortDay(day: string): string {
  return SHORT.format(noon(day))
}

/**
 * Days since the epoch. Lets a chart space its points by the gaps between them
 * rather than by how many there are, so a week of not weighing in reads as a
 * week.
 */
export function dayIndex(day: string): number {
  return Math.round(noon(day).getTime() / 86_400_000)
}
