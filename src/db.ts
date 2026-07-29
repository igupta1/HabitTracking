import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

// Next dev reloads modules on every edit; without this the pool leaks
// connections until Postgres refuses new ones.
const g = globalThis as unknown as { __sql?: ReturnType<typeof postgres> }

export const sql =
  g.__sql ??
  postgres(url, {
    max: 5,
    idle_timeout: 20,
    // Railway's public proxy needs TLS; its internal hostname doesn't.
    ssl: url.includes('rlwy.net') || url.includes('proxy.rlwy') ? 'require' : undefined,
  })

if (process.env.NODE_ENV !== 'production') g.__sql = sql
