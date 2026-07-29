/**
 * Day boundaries. Both users are in America/Los_Angeles, so there is exactly
 * one notion of "today" in this app and it lives here.
 */

export const APP_TZ = 'America/Los_Angeles'

/** `YYYY-MM-DD` for the given instant in app time. */
export function toDay(instant: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is what the `date` column wants.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** Wall-clock hour (0-23) in app time — used for quiet hours and the late-task cutoff. */
export function appHour(instant: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TZ,
      hour: '2-digit',
      hour12: false,
    }).format(instant)
  )
}

/** Tasks added after this hour are flagged `addedLate`. */
export const LATE_TASK_HOUR = 12

export function isLate(instant: Date = new Date()): boolean {
  return appHour(instant) >= LATE_TASK_HOUR
}

/** "Tue, Jul 29" for the day header. */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}
