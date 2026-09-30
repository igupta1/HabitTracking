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
src/components/weight-chart.tsx  date vs lbs
src/components/consistency.tsx   a cell per day, filled on the days it was done
src/components/weekly.tsx        the collapsed Weekly group at a section's foot
src/app/[user]/page.tsx          the only real page: both columns
```

`rows.tsx` is shared between your column and theirs — a `readOnly` prop strips
the buttons and forms. That's the only difference between the two, so there's
one place to change when a habit kind changes.

Adding or changing a habit means editing `src/lib/habits.ts` and pushing.
`habit_key` is stored as text, so removing a habit leaves old entries intact.

Per-person differences all live in that config:

- **Task lists** — a user can have several, one per section, each a `tasks`
  habit of its own with its own title, check, count and add form. Ishaan has
  three, each titled for its own work: **SWE**, **Project** and
  **Miscellaneous**. A task
  says which list it is in by its `category`, which is the list's own name — so
  each of those three names is a list's, a section's and a row's title at once.
  SWE and Project each split in two — **In Progress** and **Blocked**, the
  `TASK_STATES` both their `subs` point at — so each is two runs of rows under a
  heading apiece, and dragging a task across the heading is what moves it
  between them. Miscellaneous doesn't subdivide: `subs: []` leaves it one run of rows
  with priority the only sort and the P the only thing to pick when adding.
  Saloni has one list, under Career, with no `categories` at all — flat, and
  with no priorities either. Give her some by adding the field.
- **Task checks** — all three of Ishaan's lists set `checks: false`, which
  takes the check off every task in them: you finish one by hitting its ✕, so
  there is no done task to draw. The `done/total` beside the list title goes
  with them — a bare total counts the rows you are already looking at — and the
  list's own check goes back to being a manual toggle, since with nothing
  written down there is nothing for the day's score to read (see
  `impliedByData`). Saloni's list omits the flag and keeps both its checks and
  its count.
- **Calories and protein** — only shown on Saloni's food log (`calories: true`,
  `protein: true`). Either flag can stand on its own; the daily total row shows
  whichever are on.
- **Food ratings** — only on Ishaan's food log (`ratings: true`). Each entry
  carries a dot you tap to cycle it unrated → green → yellow → red → unrated.
- **Weekly goals** — `weekly: true` makes a habit a week's goal instead of a
  day's. Ishaan has three sections' worth: SWE, Health and Relationships. See
  below.

Nothing is lost when the config changes under stored rows. A task filed under a
category no list claims — or under none at all — collects in the **last** list,
under a trailing "Other" heading; one whose list still exists but whose
subcategory has gone collects under an "Other" inside that list. Both appear
only when they hold something: you drag things out of them, never in. A list
that stops subdividing needs no inner "Other" at all — with nothing to be
outside of, its rows simply run together, which is what emptying `subs` does to
everything filed under a name it has dropped. The last list keeps its outer
"Other" either way: that one is for tasks belonging to no list at all.

**A subcategory — or a whole list, where there are none — is one consecutive
run of rows, sorted P1 first.** No headings and no gaps between the priorities:
the only thing saying which one a task is at is the P on its own row. Inside a
run of one priority the order is yours: drag a row by its ⠿ grip, or focus the
grip and press ↑/↓. New tasks land at the bottom, and ticking something off
leaves it exactly where you put it.

**Where you drop a task is what files it.** The subcategory comes from the
heading it lands under, in the lists that have headings, and the priority from
the row it lands on top of — drop a P1 below a P2 and it *is* a P2 — or, at the
top of a run, from the row below it. So a list can't come out of order, whatever
you do to it, and there is no such thing as an invalid place to drop. Dragging
alone can't make the first P1 in a run that has none, since there is no
neighbour to copy; the P select on the row does that. Dragging can't cross
between lists either — they are separate boxes in separate sections. Retype it,
or change its category in the database. Within SWE or Project, though, In
Progress and Blocked are two headings in one list, so a task moves between them
by drag like any other filing — and takes the priority of whatever it lands on
when it gets there.

Empty subcategories appear as drop targets for as long as a drag is in progress
— that is the only way into one nothing is in yet. The order lives in
`tasks.sort_order`, spaced by 1000 and rewritten for the whole day on every
drop; a drop only ever renumbers the list it happened in.

A task list counts as done once every **P1** in *that list* is done, even
with P2/P3 left over — clearing the must-dos is the bar. With no P1s on the list
(always the case for Saloni, who has no priorities) it falls back to needing
everything done. Each list is judged on its own rows, so clearing SWE says
nothing about Project, and the day's score counts all three. None of that
applies to a list with `checks: false`, where a finished task is a deleted one
and doneness is never recorded: those tick off only when you tap the row's own
check yourself.

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
bottom. Ishaan's carries a traffic light instead: one tap on an entry's dot
cycles it through green, yellow and red and back to unrated, so a day's log gets
colour-coded in one pass down the column. The colour shows on the partner view
too, as a dot that stays faint until it is set.

**Body weight has a chart.** The small trend button on either person's weight
row — yours or theirs — opens a line of date vs lbs for the last 90 days, drawn
as plain SVG in `src/components/weight-chart.tsx` rather than by a chart
library. Points are spaced by *date*, so a week of not weighing in reads as a
week-long gap instead of one more step along the line, and the axis is not
zero-based: pounds of empty chart under the line would flatten the only thing it
is drawn to show. Pointing at it, or focusing it and pressing ←/→, reads out a
single day. Each chart draws one person, in that person's colour, so nothing
ever has to tell the two colours apart — they don't separate under deuteranopia.

**A habit can be a week's goal rather than a day's** — `weekly: true` in
`src/lib/habits.ts`. Those rows don't sit among the day's: they collect in a
**Weekly** group as the last row of their section's card, shut on every load,
showing only how many of them are done and which week that is
("Weekly · Sep 27 – Oct 3 · 1/2"). Open it and they are ordinary habit rows,
checks and all. Ishaan has three sections' worth — **Visibility** and
**Debugging Improvements** under SWE; the two distances and the pound under
Health; parents, Saloni, friends and the album under Relationships — and
Saloni has none, which is what leaves her sections with no group at all.

The flag changes one thing about storage: the check goes on the **Sunday its
week starts on** rather than on today, so every day of that week reads and
writes the one row — tick it on Wednesday, untick it on Friday, and that is the
same row both times. `weekStart` in `src/lib/day.ts` is the whole of it, Sunday
because that is already where the consistency grid starts a column. `loadDay`
therefore asks for the week's rows in a second query, *by key*: asking by day
alone would also drag in whatever daily habits were checked that Sunday. The
result merges into the one `toggles` map, since no two habits share a key.

**Weekly goals sit out the day's score.** The `done/total` beside each name
counts daily habits only — a week's work isn't today's, and counting it would
open every Sunday nine short with no way to catch up by bedtime. The group
keeps its own count instead. They get no consistency grid either: `history`
draws a cell per day, and a week's row has six days with nothing in them.

**Some habits have a consistency grid**, behind the same button: a cell per day,
filled on the days it was done. Weeks run left to right and weekdays top to
bottom, so a column is a week and a row is every Tuesday — which is the whole
reason for the shape, since only that draws "he never does it at weekends" as
two blank rows. Above it sits the count, "27 of 39 days". No streak: those are
still deliberately not kept, and a run of cells says the same thing without
turning one missed day into a zero.

Pointing at a cell reads the day back. On Strength Workout it names the session
— "Push", "Legs" — since that is the one kind whose day has more to say than
yes: the name was typed, so it may as well be read. Every other grid says Done
or Missed, cardio included, where "run" beside a run would add nothing.

Which rows have one is a `history: true` in `src/lib/habits.ts` — currently
Ishaan's Strength Workout, Creatine, Cardio, Stretching and Wart Pad. It can go
on any habit whose day is a yes/no answerable from stored rows alone (toggle,
counter, strength, cardio); food and tasks have no single answer to draw, and
body weight has its chart instead.

`habitHistory` reads what those rows need, and it answers the same question
`isDone` does — a stored toggle row wins where there is one, and for strength
and cardio a logged workout answers where there isn't. It is written out twice
because isDone reads a whole day's `DayData` and this would have to build
ninety of them. The window starts at the earliest day anything was recorded
rather than a flat 90 days back, so a new install reads as a fortnight of habit
instead of ten weeks of failure it was never around for.

These two are the only reads in the app that look past today: `weightHistory`
and `habitHistory` in `src/lib/queries.ts`, whose `WEIGHT_WINDOW_DAYS` and
`HISTORY_WINDOW_DAYS` are the numbers to change.

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

`tasks.sort_order`, `tasks.subcategory`, `food.protein_g` and `food.rating` are
the exceptions: all four were added after the app was deployed, so `src/lib/queries.ts` runs
the same idempotent `alter table` statements once per server process, before the
first read. Two carry a backfill beside them — `sort_order` numbering the rows
that had none, and `subcategory` catching the four names that spent one deploy
as top-level categories and moving them under SWE. Both match nothing on the
second run. Two more settle rather than run out: everything in SWE
or Project not already In Progress or Blocked becomes **In Progress**, which
catches both the rows that predate the split and any stale subcategory left in
the column, and matches nothing once those are the only two names in use; and
every task still filed under `Misc` becomes **Miscellaneous**, the category
being stored per row rather than looked up, so spelling the list's name out is
a write. That
is all there so a push goes live on its own; it isn't a migration system, and
the next column shouldn't grow one without a reason.

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
- Streaks and weekly scores. The consistency grid shows the same run of days
  without letting one missed morning reset a number to zero.
- Any judgement about *when* you added a task. A task added at 4pm that you
  finish by midnight is just a task.
- An activity feed / history page. The past that is on screen is on the row it
  belongs to — a chart behind body weight, a grid behind the habits that asked
  for one — never a page of its own.
- Offline support. Logging with no signal fails rather than queuing.
