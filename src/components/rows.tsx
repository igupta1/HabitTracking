'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  toggleCheck,
  setCounter,
  addTask,
  setTaskPriority,
  renameTask,
  reorderTasks,
  toggleTask,
  addFood,
  updateFood,
  setWeight,
  logStrength,
  logCardio,
  deleteRow,
} from '@/actions'
import type { DayData, TaskRow, FoodRow, WorkoutRow } from '@/lib/queries'
import type { Habit, UserId } from '@/lib/habits'

/**
 * One component per habit kind, shared between your own Today page and the
 * read-only partner view. `readOnly` strips the buttons and forms — that's the
 * only difference between the two, so the markup lives in one place.
 */
type P = { user: UserId; habit: Habit; readOnly?: boolean }

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${
        on ? 'border-accent bg-accent text-black' : 'border-neutral-600 text-transparent'
      }`}
    >
      ✓
    </span>
  )
}

/** Every habit's check is tappable; see toggleCheck for what a tap stores. */
function CheckButton({ user, habit, done, readOnly }: P & { done: boolean }) {
  const [pending, start] = useTransition()
  if (readOnly) return <Check on={done} />
  return (
    <button
      onClick={() => start(() => toggleCheck(user, habit.key, done))}
      className={`tap shrink-0 ${pending ? 'opacity-50' : ''}`}
      aria-label={`Mark ${habit.title} ${done ? 'not done' : 'done'}`}
    >
      <Check on={done} />
    </button>
  )
}

/** Habit titles never cross off — the check alone says it's done. */
function Title({ children }: { children: React.ReactNode }) {
  return <span className="flex-1">{children}</span>
}

/**
 * Explicit submit button. Not just an affordance: a form with more than one
 * blocking field and no submit button never implicitly submits on Enter, which
 * is what made Saloni's two-field food log impossible to add to.
 */
function Add({ disabled }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="tap grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-xl font-medium leading-none text-black disabled:opacity-40"
      aria-label="Add"
    >
      +
    </button>
  )
}

function X({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="tap text-neutral-600" aria-label="Delete">
      ✕
    </button>
  )
}

// ---------------------------------------------------------------- toggle

function ToggleRow({ user, habit, readOnly, done }: P & { done: boolean }) {
  const [pending, start] = useTransition()
  const Tag = readOnly ? 'div' : 'button'
  return (
    <Tag
      onClick={readOnly ? undefined : () => start(() => toggleCheck(user, habit.key, done))}
      className={`tap flex w-full items-center gap-3 px-4 py-3 text-left ${pending ? 'opacity-50' : ''}`}
    >
      <Check on={done} />
      <Title>{habit.title}</Title>
    </Tag>
  )
}

// ---------------------------------------------------------------- counter

function CounterRow({
  user,
  habit,
  readOnly,
  count,
  done,
}: P & { count: number; done: boolean }) {
  const [pending, start] = useTransition()
  const target = habit.target ?? 1

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${pending ? 'opacity-50' : ''}`}>
      <CheckButton user={user} habit={habit} done={done} readOnly={readOnly} />
      <Title>{habit.title}</Title>
      <span className="tabular-nums text-sm text-neutral-400">
        {count}/{target}
      </span>
      {!readOnly &&
        ([-1, 1] as const).map((d) => (
          <button
            key={d}
            onClick={() => start(() => setCounter(user, habit.key, d))}
            className="tap h-8 w-8 rounded-full bg-neutral-800 text-lg leading-none"
            aria-label={`${d > 0 ? 'Add' : 'Remove'} one ${habit.title}`}
          >
            {d > 0 ? '+' : '−'}
          </button>
        ))}
    </div>
  )
}

// ---------------------------------------------------------------- tasks

function Priority({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded bg-neutral-800 px-1 py-0.5 text-xs tabular-nums text-neutral-300 outline-none"
      aria-label="Priority"
    >
      {[1, 2, 3].map((n) => (
        <option key={n} value={n}>
          P{n}
        </option>
      ))}
    </select>
  )
}

/** Crossed off wins over the P1 red — it's finished, not urgent. */
function taskTone(t: TaskRow) {
  if (t.done) return 'text-neutral-500 line-through'
  return t.priority === 1 ? 'text-red-400' : ''
}

/**
 * Always-editable title, saving on blur, like FoodEntry. Because the text is an
 * input, the check is what you tap to complete a task — not the whole line.
 */
function TaskTitle({ user, task }: { user: UserId; task: TaskRow }) {
  const [text, setText] = useState(task.title)
  const [pending, start] = useTransition()

  function save() {
    const t = text.trim()
    // Blank reverts rather than deletes — the ✕ is how you get rid of a task.
    if (!t) return setText(task.title)
    if (t !== task.title) start(() => renameTask(user, task.id, t))
  }

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      aria-label={`Rename ${task.title}`}
      className={`-mr-1 min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 outline-none focus:bg-neutral-800 ${taskTone(
        task
      )} ${pending ? 'opacity-50' : ''}`}
    />
  )
}

/**
 * The list as it is drawn: one flat group for Saloni, one per category plus a
 * trailing "Other" (anything predating categories) for Ishaan. Empty groups are
 * hidden until a drag is in progress, when each one becomes a drop target — that
 * is the only way to move a task into a category nothing is in yet.
 */
type Group = { label: string; category: string | null; items: TaskRow[] }

function groupTasks(tasks: TaskRow[], cats: string[] | undefined, keepEmpty = false): Group[] {
  if (!cats) return [{ label: '', category: null, items: tasks }]
  const groups: Group[] = [
    ...cats.map((c) => ({ label: c, category: c, items: tasks.filter((t) => t.category === c) })),
    {
      label: 'Other',
      category: null,
      items: tasks.filter((t) => !t.category || !cats.includes(t.category)),
    },
  ]
  return keepEmpty ? groups : groups.filter((g) => g.items.length > 0)
}

/** Order and grouping together, which is what a drop has to be compared against. */
function shape(tasks: TaskRow[]): string {
  return tasks.map((t) => `${t.id}:${t.category ?? ''}`).join('|')
}

/**
 * The drag handle. Pointer events rather than HTML5 drag-and-drop, which never
 * fires on touch; `touch-none` stops the browser scrolling the page instead of
 * giving us the move. Arrow keys do the same job from the keyboard.
 */
function Grip(props: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label="Reorder task"
      className="w-5 shrink-0 cursor-grab touch-none select-none text-left text-lg leading-none text-neutral-600 active:cursor-grabbing"
      {...props}
    >
      ⠿
    </button>
  )
}

function TasksRow({ user, habit, readOnly, tasks, done }: P & { tasks: TaskRow[]; done: boolean }) {
  const cats = habit.categories
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(cats?.[0] ?? '')
  const [priority, setPriority] = useState(2)
  const [pending, start] = useTransition()

  // The list is held locally while you drag so it reorders under your finger
  // instead of after a round trip, then re-synced whenever the server's copy
  // differs. Storing it already grouped keeps a flat index unambiguous: it is
  // both a position and, via the group it falls in, a category.
  const flatten = (ts: TaskRow[]) => groupTasks(ts, cats).flatMap((g) => g.items)
  const [items, setItems] = useState(() => flatten(tasks))
  const fromServer = shape(flatten(tasks))
  useEffect(() => setItems(flatten(tasks)), [fromServer]) // eslint-disable-line react-hooks/exhaustive-deps

  const [dragId, setDragId] = useState<string | null>(null)
  const rows = useRef(new Map<string, HTMLElement>())
  const heads = useRef(new Map<string, HTMLElement>())
  // What to save on drop, read from a ref so it can't be a render behind.
  const latest = useRef(items)
  latest.current = items

  const groups = groupTasks(items, cats, dragId !== null)
  const doneCount = items.filter((t) => t.done).length

  /**
   * Put `id` where the finger is. Position and category are read off the same
   * y independently — how many rows it has passed, and which group heading it
   * is below — which agree because both only ever grow as you drag downwards.
   */
  function dragTo(id: string, y: number) {
    const rest = items.filter((t) => t.id !== id)
    const to = rest.filter((t) => {
      const r = rows.current.get(t.id)?.getBoundingClientRect()
      return !!r && y > r.top + r.height / 2
    }).length

    let category = groups[0]?.category ?? null
    for (const g of groups) {
      const r = heads.current.get(g.label)?.getBoundingClientRect()
      if (r && y > r.top) category = g.category
    }

    setItems((prev) => {
      const moved = prev.find((t) => t.id === id)
      if (!moved) return prev
      const others = prev.filter((t) => t.id !== id)
      const next = [...others.slice(0, to), { ...moved, category }, ...others.slice(to)]
      return shape(next) === shape(prev) ? prev : next
    })
  }

  /** Only writes when the drag actually changed something. */
  function commit(list: TaskRow[]) {
    if (shape(list) === fromServer) return
    start(() => reorderTasks(user, list.map((t) => t.id), list.map((t) => t.category)))
  }

  function nudge(id: string, delta: number) {
    const from = items.findIndex((t) => t.id === id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= items.length) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, { ...moved, category: items[to].category })
    setItems(next)
    commit(next)
  }

  return (
    <div className={pending ? 'opacity-50' : ''}>
      <div className="flex items-center gap-3 px-4 pt-3">
        <CheckButton user={user} habit={habit} done={done} readOnly={readOnly} />
        <span className="flex-1 font-medium">{habit.title}</span>
        <span className="tabular-nums text-sm text-neutral-400">
          {doneCount}/{items.length}
        </span>
      </div>

      {readOnly && tasks.length === 0 && (
        <p className="px-4 pb-3 pl-12 text-sm text-neutral-500">Nothing planned yet today.</p>
      )}

      {/*
        Headings and rows are siblings in one list rather than a div per group,
        so a row dragged into another category is *moved* by React. Nested in
        per-group elements it would be unmounted and remounted instead, which
        drops the pointer capture and kills the drag halfway through.
      */}
      <div className="mt-1">
        {groups.flatMap((g) => [
          ...(g.label
            ? [
                <p
                  key={`head:${g.label}`}
                  ref={(el) => {
                    if (el) heads.current.set(g.label, el)
                    else heads.current.delete(g.label)
                  }}
                  className="pl-12 pr-4 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600"
                >
                  {g.label}
                </p>,
              ]
            : []),
          ...g.items.map((t) => (
            <div
              key={t.id}
              ref={(el) => {
                if (el) rows.current.set(t.id, el)
                else rows.current.delete(t.id)
              }}
              className={`flex items-center gap-2 py-1.5 pr-4 ${
                readOnly ? 'pl-12' : 'pl-5'
              } ${dragId === t.id ? 'rounded-lg bg-neutral-800' : ''}`}
            >
              {readOnly ? (
                <div className="flex flex-1 items-center gap-3">
                  <Check on={t.done} />
                  <span className={taskTone(t)}>{t.title}</span>
                </div>
              ) : (
                <>
                  <Grip
                    onPointerDown={(e) => {
                      e.preventDefault() // or the browser starts a text selection
                      e.currentTarget.setPointerCapture(e.pointerId)
                      setDragId(t.id)
                    }}
                    onPointerMove={(e) => dragId === t.id && dragTo(t.id, e.clientY)}
                    onPointerUp={() => {
                      setDragId(null)
                      commit(latest.current)
                    }}
                    onPointerCancel={() => {
                      setDragId(null)
                      setItems(flatten(tasks))
                    }}
                    onKeyDown={(e) => {
                      const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
                      if (!d) return
                      e.preventDefault()
                      nudge(t.id, d)
                    }}
                  />
                  <button
                    onClick={() => start(() => toggleTask(user, t.id))}
                    className="tap shrink-0"
                    aria-label={`Mark ${t.title} ${t.done ? 'not done' : 'done'}`}
                  >
                    <Check on={t.done} />
                  </button>
                  <TaskTitle key={t.title} user={user} task={t} />
                </>
              )}
              {cats &&
                (readOnly ? (
                  t.priority && (
                    <span
                      className={`text-xs tabular-nums ${
                        t.priority === 1 ? 'text-red-400' : 'text-neutral-500'
                      }`}
                    >
                      P{t.priority}
                    </span>
                  )
                ) : (
                  <Priority
                    value={t.priority ?? 2}
                    onChange={(v) => start(() => setTaskPriority(user, t.id, v))}
                  />
                ))}
              {!readOnly && <X onClick={() => start(() => deleteRow(user, 'tasks', t.id))} />}
            </div>
          )),
        ])}
      </div>

      {!readOnly && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const v = title.trim()
            if (!v) return
            setTitle('')
            start(() => addTask(user, v, cats ? category : null, cats ? priority : null))
          }}
          className="px-4 pb-3 pl-12 pt-1"
        >
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tasks.length ? 'Add another…' : 'What are you doing today?'}
              className="input min-w-0 flex-1"
            />
            <Add disabled={!title.trim()} />
          </div>
          {cats && (
            <div className="mt-1.5 flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg bg-neutral-800 px-2 py-1.5 text-sm outline-none"
                aria-label="Category"
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Priority value={priority} onChange={setPriority} />
            </div>
          )}
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- food

/** Always-editable, saving on blur — no separate edit mode. */
function FoodEntry({
  user,
  entry,
  showCalories,
}: {
  user: UserId
  entry: FoodRow
  showCalories?: boolean
}) {
  const [text, setText] = useState(entry.text)
  const [cal, setCal] = useState(entry.calories != null ? String(entry.calories) : '')
  const [pending, start] = useTransition()

  function save() {
    const t = text.trim()
    const c = cal ? Number(cal) : null
    if (t === entry.text && c === entry.calories) return
    start(() => updateFood(user, entry.id, t, c))
  }

  return (
    <div className={`flex items-center gap-2 py-1 pl-12 pr-4 ${pending ? 'opacity-50' : ''}`}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="input min-w-0 flex-1 py-1 text-sm"
      />
      {showCalories && (
        <input
          value={cal}
          onChange={(e) => setCal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          inputMode="numeric"
          placeholder="cal"
          className="input-sm py-1 text-sm"
        />
      )}
      <X onClick={() => start(() => deleteRow(user, 'food', entry.id))} />
    </div>
  )
}

function FoodRowGroup({
  user,
  habit,
  readOnly,
  entries,
  done,
}: P & { entries: FoodRow[]; done: boolean }) {
  const [text, setText] = useState('')
  const [cal, setCal] = useState('')
  const [pending, start] = useTransition()

  return (
    <div className={pending ? 'opacity-50' : ''}>
      <div className="flex items-center gap-3 px-4 pt-3">
        <CheckButton user={user} habit={habit} done={done} readOnly={readOnly} />
        <span className="flex-1 font-medium">{habit.title}</span>
      </div>

      <div className="mt-1">
        {entries.map((e) =>
          readOnly ? (
            <div key={e.id} className="py-1.5 pl-12 pr-4 text-sm">
              {e.text}
              {e.calories != null && <span className="ml-2 text-neutral-500">{e.calories} cal</span>}
            </div>
          ) : (
            <FoodEntry key={e.id} user={user} entry={e} showCalories={habit.calories} />
          )
        )}
      </div>

      {habit.calories && entries.length > 0 && (
        <div className="mt-1 flex items-center border-t border-neutral-800 py-2 pl-12 pr-4 text-sm">
          <span className="flex-1 text-neutral-400">Total</span>
          <span className="tabular-nums font-medium">
            {entries.reduce((s, e) => s + (e.calories ?? 0), 0)} cal
          </span>
        </div>
      )}

      {!readOnly && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const v = text.trim()
            if (!v) return
            const c = cal ? Number(cal) : null
            setText('')
            setCal('')
            start(() => addFood(user, v, c))
          }}
          className="flex gap-2 px-4 pb-3 pl-12 pt-1"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you eat?"
            className="input min-w-0 flex-1"
          />
          {habit.calories && (
            <input
              value={cal}
              onChange={(e) => setCal(e.target.value)}
              inputMode="numeric"
              placeholder="cal"
              className="input-sm"
            />
          )}
          <Add disabled={!text.trim()} />
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- weight

function WeightRow({
  user,
  habit,
  readOnly,
  lbs,
  done,
}: P & { lbs: number | null; done: boolean }) {
  const [value, setValue] = useState(lbs != null ? String(lbs) : '')
  const [pending, start] = useTransition()

  function save() {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0 && n !== lbs) start(() => setWeight(user, n))
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${pending ? 'opacity-50' : ''}`}>
      <CheckButton user={user} habit={habit} done={done} readOnly={readOnly} />
      <Title>{habit.title}</Title>
      {readOnly ? (
        <span className="tabular-nums text-sm text-neutral-400">{lbs ?? '—'}</span>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            inputMode="decimal"
            placeholder="—"
            className="input w-20 text-right"
          />
        </form>
      )}
      <span className="text-sm text-neutral-500">lbs</span>
    </div>
  )
}

// ---------------------------------------------------------------- workouts

/** One logged workout line, with a delete affordance on your own page. */
function WorkoutLine({
  user,
  workout,
  readOnly,
  detail,
}: {
  user: UserId
  workout: WorkoutRow
  readOnly?: boolean
  detail?: string
}) {
  const [pending, start] = useTransition()
  return (
    <div
      className={`flex items-center gap-2 pb-2 pl-12 pr-4 text-sm ${pending ? 'opacity-50' : ''}`}
    >
      <span className="flex-1">
        {workout.name}
        {detail && <span className="text-neutral-500"> · {detail}</span>}
      </span>
      {!readOnly && <X onClick={() => start(() => deleteRow(user, 'workouts', workout.id))} />}
    </div>
  )
}

/**
 * Strength is just the name of the session, typed. Sets live in RepCount —
 * this only needs to say "he trained, and it was Push day".
 */
function StrengthRow({
  user,
  habit,
  readOnly,
  workouts,
  names = [],
  done,
}: P & { workouts: WorkoutRow[]; names?: string[]; done: boolean }) {
  const [value, setValue] = useState('')
  const [pending, start] = useTransition()
  const mine = workouts.filter((w) => w.mode === 'strength')

  return (
    <div className={pending ? 'opacity-50' : ''}>
      <div className="flex items-center gap-3 px-4 py-3">
        <CheckButton user={user} habit={habit} done={done} readOnly={readOnly} />
        <span className="flex-1 font-medium">{habit.title}</span>
      </div>

      {mine.map((w) => (
        <WorkoutLine key={w.id} user={user} workout={w} readOnly={readOnly} />
      ))}

      {/* One strength workout per day — delete the logged one to change it. */}
      {!readOnly && mine.length === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const v = value.trim()
            if (!v) return
            setValue('')
            start(() => logStrength(user, v))
          }}
          className="px-4 pb-3 pl-12"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            list={`workout-names-${user}`}
            placeholder="Push, Pull, Legs, Rest…"
            className="input w-full"
          />
          <datalist id={`workout-names-${user}`}>
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </form>
      )}
    </div>
  )
}

function CardioRow({
  user,
  habit,
  readOnly,
  workouts,
  done,
}: P & { workouts: WorkoutRow[]; done: boolean }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('run')
  const [miles, setMiles] = useState('')
  const [mins, setMins] = useState('')
  const [pending, start] = useTransition()

  const mine = workouts.filter((w) => w.mode === 'cardio')

  return (
    <div className={pending ? 'opacity-50' : ''}>
      <div
        onClick={readOnly ? undefined : () => setOpen((o) => !o)}
        className="tap flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <CheckButton user={user} habit={habit} done={done} readOnly={readOnly} />
        <span className="flex-1 font-medium">{habit.title}</span>
        {!readOnly && <span className="text-neutral-500">{open ? '−' : '+'}</span>}
      </div>

      {mine.map((w) => (
        <WorkoutLine
          key={w.id}
          user={user}
          workout={w}
          readOnly={readOnly}
          detail={
            [
              w.distance_miles != null ? `${w.distance_miles} mi` : null,
              w.duration_minutes != null ? `${Math.round(w.duration_minutes)} min` : null,
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
        />
      ))}

      {!readOnly && open && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setOpen(false)
            const d = miles ? Number(miles) : null
            const m = mins ? Number(mins) : null
            setMiles('')
            setMins('')
            start(() => logCardio(user, name, d, m))
          }}
          className="flex flex-wrap gap-2 px-4 pb-3 pl-12"
        >
          <select
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg bg-neutral-800 px-2 py-2 outline-none"
          >
            {['run', 'bike', 'sport', 'rest'].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          {name !== 'rest' && (
            <>
              <input
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                inputMode="decimal"
                placeholder="mi"
                className="input-sm"
              />
              <input
                value={mins}
                onChange={(e) => setMins(e.target.value)}
                inputMode="numeric"
                placeholder="min"
                className="input-sm"
              />
            </>
          )}
          <button type="submit" className="tap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-black">
            Log
          </button>
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- dispatcher

export function HabitRow({
  user,
  habit,
  day,
  readOnly,
  names,
  done,
}: P & { day: DayData; names?: string[]; done: boolean }) {
  const p = { user, habit, readOnly, done }
  switch (habit.kind) {
    case 'toggle':
      return <ToggleRow {...p} />
    case 'counter':
      return <CounterRow {...p} count={day.toggles[habit.key]?.count ?? 0} />
    case 'tasks':
      return <TasksRow {...p} tasks={day.tasks} />
    case 'food':
      return <FoodRowGroup {...p} entries={day.food} />
    case 'weight':
      return <WeightRow {...p} lbs={day.weight} />
    case 'strength':
      return <StrengthRow {...p} workouts={day.workouts} names={names} />
    case 'cardio':
      return <CardioRow {...p} workouts={day.workouts} />
  }
}
