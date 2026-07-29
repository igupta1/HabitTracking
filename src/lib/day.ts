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
