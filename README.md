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
schema.sql                       5 tables, plain SQL, no ORM or migration tool
src/lib/habits.ts                the two goal sets, as a constant
src/lib/day.ts                   day boundaries (America/LA, flips at 4am)
src/lib/queries.ts               reads
src/actions.ts                   writes (server actions — no REST API, no store)
src/components/rows.tsx          one component per habit kind
src/components/weight-chart.tsx  date vs lbs, the only chart in the app
src/app/[user]/page.tsx          the only real page: both columns
```

`rows.tsx` is shared between your column and theirs — a `readOnly` prop strips
the buttons and forms. That's the only difference between the two, so there's
one place to change when a habit kind changes.

Adding or changing a habit means editing `src/lib/habits.ts` and pushing.
`habit_key` is stored as text, so removing a habit leaves old entries intact.

Per-person differences all live in that config:

- **Task categories** — Ishaan's `tasks` habit sets six: the four his work
  splits into (Production Operations, TPU Roadmap, Developer Quality of Life,
  Collaboration), then Project and Misc. His list groups under those headers in
  that order. Saloni's has no `categories`, so hers is a flat list with no
  priorities. Give her some by adding the field.
- **Calories and protein** — only shown on Saloni's food log (`calories: true`,
  `protein: true`). Either flag can stand on its own; the daily total row shows
  whichever are on.

Tasks that predate categories, or whose category was removed from the config,
collect under a trailing "Other" heading rather than disappearing. That is where
the old `SWE` tasks went when it split into four; drag them where they belong.

**A category is one consecutive list, sorted P1 first.** No headings and no gaps
between the priorities — the only thing saying which one a task is at is the P
on its own row. Inside a run of one priority the order is yours: drag a row by
its ⠿ grip, or focus the grip and press ↑/↓. New tasks land at the bottom, and
ticking something off leaves it exactly where you put it.

**Where you drop a task is what sets its priority.** It takes the priority of
the row it lands under — drop a P1 below a P2 and it *is* a P2 — or, at the top
of a category, of the row it lands above. So the list can't come out of order,
whatever you do to it, and there is no such thing as an invalid place to drop.
Dragging alone can't make the first P1 in a category that has none, since there
is no neighbour to copy; the P select on the row does that.

The category headings are part of the same drag surface, so dropping a task
under a different heading is how you recategorise it; empty categories appear as
drop targets for as long as a drag is in progress. The order lives in
`tasks.sort_order`, spaced by 1000 and rewritten for the whole day on every drop.

The **Tasks** habit counts as done once every **P1** is done, even with P2/P3
left over — clearing the must-dos is the bar. With no P1s on the list (always
the case for Saloni, who has no priorities) it falls back to needing everything
done.

**Unfinished tasks roll over.** Opening the page moves any task still open from
an earlier day onto today — the row moves rather than being copied, so it stays
one task with one id, and it arrives as a block above whatever today already
holds, keeping the order you gave it. There's no cron: loading the page is what advances
the day, so a week away rolls everything forward at once. Finish it or ✕ it to
make it stop coming back. Everything else (checks, food, weight, workouts) is
per-day and starts empty.

**One strength workout per day**, enforced by a partial unique index rather
than app logic. Delete the logged one to change it. Cardio is unrestricted.

Food entries are always-editable inputs that save on blur — clearing the text
deletes the entry. Saloni's log totals its calories and protein in a row at the
bottom.

**Body weight has a chart.** The small trend button on either person's weight
row — yours or theirs — opens a line of date vs lbs for the last 90 days, drawn
as plain SVG in `src/components/weight-chart.tsx` rather than by a chart
library. Points are spaced by *date*, so a week of not weighing in reads as a
week-long gap instead of one more step along the line, and the axis is not
zero-based: pounds of empty chart under the line would flatten the only thing it
is drawn to show. Pointing at it, or focusing it and pressing ←/→, reads out a
single day. Each chart draws one person, in that person's colour, so nothing
ever has to tell the two colours apart — they don't separate under deuteranopia.

This is the only read in the app that looks past today: `weightHistory` in
`src/lib/queries.ts`, whose `WEIGHT_WINDOW_DAYS` is the one number to change.

Every add form has an explicit `+` submit button, and needs one: a form with
more than one blocking field and no submit button never implicitly submits on
Enter. That silently made Saloni's multi-field (text + calories + protein) food
log impossible to add to, while Ishaan's one-field version worked fine. Don't
remove those buttons.

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

`tasks.sort_order` and `food.protein_g` are the exceptions: both were added
after the app was deployed, so `src/lib/queries.ts` runs the same idempotent
`alter table` statements (and, for `sort_order`, a backfill) once per server
process, before the first read. That is there so a push goes live on its own; it
isn't a migration system, and the next column shouldn't grow one without a
reason.

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
- Any judgement about *when* you added a task. A task added at 4pm that you
  finish by midnight is just a task.
- An activity feed / history page. The data is all there per-day, and body
  weight is the one thing with any past on screen — a chart on the row itself,
  not a page.
- Offline support. Logging with no signal fails rather than queuing.
