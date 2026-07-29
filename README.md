# Habits

Daily accountability for Ishaan + Saloni. A home-screen web app, so there's no
Apple developer account, no 7-day resigning, and nothing to reinstall.

Replaces the SwiftUI app that used to live in this repo. That code is gone from
the working tree but preserved in commit `b79a969` if it's ever wanted.

## Why a web app

The native app needs a paid Apple developer account to work for two people:
its provisioning profile expires every 7 days, push notifications need an
entitlement free accounts can't have, and CloudKit sync is paid-only. A
home-screen web app has none of those limits — iOS 16.4+ supports real push
notifications for web apps added to the Home Screen.

## No login

Identity is the URL: **`/ishaan`** and **`/saloni`**. You each bookmark yours;
`/` is just a two-button picker. There are no accounts, passwords, or cookies.

The trade: anyone with the URL can write as either person. That's fine for two
people on an unlisted deploy URL, but it is not security. If it ever matters, a
shared-password cookie is ~20 lines.

## Shape of it

Deliberately small. Two users, so there's no users table — `user_id` is just
the text `'ishaan'` or `'saloni'`.

```
schema.sql                     7 tables, plain SQL, no ORM or migration tool
src/lib/habits.ts              the two goal sets, as a constant
src/lib/day.ts                 day boundaries (both users are America/Los_Angeles)
src/lib/queries.ts             reads
src/actions.ts                 writes (server actions — no REST API, no client store)
src/lib/events.ts              every completion -> events row -> partner push
src/lib/push.ts                web push
src/lib/summary.ts             the 8pm check-in
src/app/api/cron/route.ts      what the daily Vercel cron hits
src/components/rows.tsx        one component per habit kind
```

`rows.tsx` is shared between your Today page and the read-only partner view —
a `readOnly` prop strips the buttons and forms. That's the only difference
between the two views, so there's one place to change when a habit kind changes.

Adding or changing a habit means editing `src/lib/habits.ts` and pushing.
`habit_key` is stored as text, so removing a habit leaves old entries intact.

## Local setup

```bash
nvm use                                        # Node 20
docker run -d --name habits-pg \
  -e POSTGRES_USER=habits -e POSTGRES_PASSWORD=habits -e POSTGRES_DB=habits \
  -p 5433:5432 postgres:16-alpine
npm install
cp .env.example .env.local                     # then fill it in
npm run db:init                                # idempotent
npm run dev
```

For `.env.local`: `npm run keys:vapid` prints both VAPID lines, and
`openssl rand -hex 16` gives you a `CRON_SECRET`.

Schema changes: edit `schema.sql`, re-run `npm run db:init` (which is just
`psql < schema.sql` against the local docker container). Everything is
`create ... if not exists`, so re-running is safe — but changing an *existing*
column still means writing the `alter table` yourself. Against Neon, paste
`schema.sql` into their SQL editor instead.

The app icons in `public/icons/` are committed. To change them, drop in any
192px and 512px PNG with the same filenames.

## Deploying to Vercel

Import the repo — root directory is the repo root. Free Hobby tier is enough.

For the database, attach **Neon** from the Vercel marketplace (free tier) — it
sets `DATABASE_URL` for you, and every query here is plain Postgres so nothing
in the code changes. Then run `npm run db:init` once against that URL.

Set the rest of the env vars from `.env.example`. `vercel.json` already
declares the cron; add `CRON_SECRET` in Vercel's env settings and it gets sent
as a bearer token automatically.

Two Hobby-tier quirks worth knowing:

- **Neon sleeps after ~5 minutes idle**, so the first load after a while takes
  an extra second or so.
- **Hobby crons run once a day, best-effort within the hour.** `vercel.json`
  uses `0 3 * * *` UTC, which is 8pm during PDT and 7pm during PST — a fixed
  UTC cron can't track DST. Close enough for a check-in nudge.

`NEXT_PUBLIC_APP_URL` must match the real origin. **Push subscriptions are
bound to the origin**, so moving to a custom domain later means you both
re-enable notifications once. Worth picking the final domain before sharing it.

## Notifications

Everything notifies the other person instantly: tasks, workouts, cardio, body
weight, toggles, food. Plus an 8pm check-in with both standings and your own
remaining tasks.

**Quiet hours 22:00–07:00** skip sending entirely — you'll see it in the app in
the morning rather than getting a buzz at 1am.

iOS requires the app to be added to the Home Screen before push works at all,
and the permission prompt must come from a tap — that's what the "Turn on
notifications" button on the Today page is for. In a plain Safari tab it shows
Add-to-Home-Screen instructions instead.

## Deliberately not built

Cut to keep this small; add only if actually missed:

- Streaks and weekly scores.
- An activity feed page (the `events` table is written on every completion and
  is a full history; there's just no page listing it).
- Offline write queue. Logging with no signal fails rather than queuing.
- **A RepCount clone.** Strength logging is just the typed name of the session
  ("Push", "Pull", "Legs", "SolidCore", "Rest"), autocompleted from what you've
  typed before. Sets, reps and weights stay in RepCount, which already has good
  UI for them — duplicating it was a third of the codebase and added nothing to
  the accountability loop, which only needs "he trained, and it was Push day".
- Food-log digesting. Food notifies instantly like everything else — at 3–5
  entries a day it isn't worth the machinery, and dropping it is what made a
  single daily cron (and therefore free Vercel Hobby) sufficient.
