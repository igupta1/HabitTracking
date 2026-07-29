import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

// Next dev reloads modules on every edit; without this the pool leaks
// connections until Postgres refuses new ones.
const g = globalThis as unknown as { __sql?: ReturnType<typeof postgres> }

/** The local docker Postgres doesn't serve TLS; every hosted one requires it. */
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)

export const sql =
  g.__sql ??
  postgres(url, {
    max: 5,
    idle_timeout: 20,
    ssl: isLocal ? undefined : 'require',
  })

if (process.env.NODE_ENV !== 'production') g.__sql = sql
