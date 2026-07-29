# Habits

Daily accountability for Ishaan + Saloni. A web app, used from laptops.

Replaces the SwiftUI app that used to live in this repo. That code is gone from
the working tree but preserved in commit `b79a969` if it's ever wanted.

## Why a web app

The native app couldn't work for two people without a paid Apple developer
account: its provisioning profile expired every 7 days, and CloudKit sync is
paid-only. A web app has neither limit and nothing to install.

## How it works

Open `/ishaan` or `/saloni`. You see **both people side by side** — your habits
interactive, theirs read-only. That's the whole app. No notifications: the point
is that you can both see where the other stands at a glance.

Identity is the URL. There are no accounts, passwords, or cookies. The trade is
that anyone with the URL can write as either person — fine for two people on an
unlisted deploy URL, but it is not security. If it ever matters, a
shared-password cookie is ~20 lines.

## Shape of it

Deliberately small. Two users, so there's no users table — `user_id` is just
the text `'ishaan'` or `'saloni'`.

```
schema.sql                5 tables, plain SQL, no ORM or migration tool
src/lib/habits.ts         the two goal sets, as a constant
src/lib/day.ts            day boundaries (both users are America/Los_Angeles)
src/lib/queries.ts        reads
src/actions.ts            writes (server actions — no REST API, no client store)
src/components/rows.tsx   one component per habit kind
src/app/[user]/page.tsx   the only real page: both columns
```

`rows.tsx` is shared between your column and theirs — a `readOnly` prop strips
the buttons and forms. That's the only difference between the two, so there's
one place to change when a habit kind changes.

Adding or changing a habit means editing `src/lib/habits.ts` and pushing.
`habit_key` is stored as text, so removing a habit leaves old entries intact.

## Local setup

```bash
nvm use                                        # Node 20
docker run -d --name habits-pg \
  -e POSTGRES_USER=habits -e POSTGRES_PASSWORD=habits -e POSTGRES_DB=habits \
  -p 5433:5432 postgres:16-alpine
npm install
cp .env.example .env.local                     # DATABASE_URL is the only var
npm run db:init                                # idempotent
npm run dev
```

Schema changes: edit `schema.sql`, re-run `npm run db:init` (which is just
`psql < schema.sql` against the local docker container). Everything is
`create ... if not exists`, so re-running is safe — but changing an *existing*
column still means writing the `alter table` yourself. Against Neon, paste
`schema.sql` into their SQL editor instead.

## Deploying to Vercel

Import the repo — root directory is the repo root. Free Hobby tier is enough.

Attach **Neon** from the Vercel marketplace (free tier). It sets `DATABASE_URL`,
which is the only environment variable this app needs. Then paste `schema.sql`
into Neon's SQL editor and run it once.

Note: **the first build fails until `DATABASE_URL` exists** — `src/db.ts` throws
without it. Attach Neon, then redeploy.

Neon's free tier sleeps after ~5 minutes idle, so the first load after a while
takes an extra second.

## Deliberately not built

Cut to keep this small; add only if actually missed:

- **Notifications.** Dropped once this became laptop-only: desktop push only
  fires while the laptop is awake with the browser open, so most nudges would
  never land. Both columns being visible on one page covers the same need. This
  also removed the `events` and `push_subs` tables, web-push, VAPID keys, the
  service worker, and the cron.
- **A RepCount clone.** Strength logging is just the typed name of the session
  ("Push", "Pull", "Legs", "SolidCore", "Rest"), autocompleted from what you've
  typed before. Sets, reps and weights stay in RepCount, which already has good
  UI for them — duplicating it was a third of the codebase and added nothing to
  the accountability loop, which only needs "he trained, and it was Push day".
- Streaks and weekly scores.
- An activity feed / history page. The data is all there per-day; nothing reads
  it beyond today.
- Offline support. Logging with no signal fails rather than queuing.
