'use client'

import { useState, useTransition } from 'react'
import {
  toggleHabit,
  setCounter,
  addTask,
  setTaskPriority,
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

function Title({ children, done }: { children: React.ReactNode; done?: boolean }) {
  return <span className={`flex-1 ${done ? 'text-neutral-400 line-through' : ''}`}>{children}</span>
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
      onClick={readOnly ? undefined : () => start(() => toggleHabit(user, habit.key))}
      className={`tap flex w-full items-center gap-3 px-4 py-3 text-left ${pending ? 'opacity-50' : ''}`}
    >
      <Check on={done} />
      <Title done={done}>{habit.title}</Title>
    </Tag>
  )
}

// ---------------------------------------------------------------- counter

function CounterRow({ user, habit, readOnly, count }: P & { count: number }) {
  const [pending, start] = useTransition()
  const target = habit.target ?? 1

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${pending ? 'opacity-50' : ''}`}>
      <Check on={count >= target} />
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

function TasksRow({ user, habit, readOnly, tasks }: P & { tasks: TaskRow[] }) {
  const cats = habit.categories
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(cats?.[0] ?? '')
  const [priority, setPriority] = useState(2)
  const [pending, start] = useTransition()
  const doneCount = tasks.filter((t) => t.done).length

  // Tasks arrive sorted by priority then created_at, so grouping preserves that.
  // The trailing "Other" group catches anything predating categories.
  const groups = cats
    ? [
        ...cats.map((c) => ({ label: c, items: tasks.filter((t) => t.category === c) })),
        {
          label: 'Other',
          items: tasks.filter((t) => !t.category || !cats.includes(t.category)),
        },
      ].filter((g) => g.items.length > 0)
    : [{ label: '', items: tasks }]

  return (
    <div className={pending ? 'opacity-50' : ''}>
      <div className="flex items-center gap-3 px-4 pt-3">
        <Check on={tasks.length > 0 && doneCount === tasks.length} />
        <span className="flex-1 font-medium">{habit.title}</span>
        <span className="tabular-nums text-sm text-neutral-400">
          {doneCount}/{tasks.length}
        </span>
      </div>

      {readOnly && tasks.length === 0 && (
        <p className="px-4 pb-3 pl-12 text-sm text-neutral-500">Nothing planned yet today.</p>
      )}

      <div className="mt-1">
        {groups.map((g) => (
          <div key={g.label}>
            {g.label && (
              <p className="pl-12 pr-4 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
                {g.label}
              </p>
            )}
            {g.items.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 pl-12 pr-4">
                <div
                  onClick={readOnly ? undefined : () => start(() => toggleTask(user, t.id))}
                  className="tap flex flex-1 items-center gap-3 text-left"
                >
                  <Check on={t.done} />
                  <span className={t.done ? 'text-neutral-500 line-through' : ''}>{t.title}</span>
                </div>
                {cats &&
                  (readOnly ? (
                    t.priority && (
                      <span className="text-xs tabular-nums text-neutral-500">P{t.priority}</span>
                    )
                  ) : (
                    <Priority
                      value={t.priority ?? 2}
                      onChange={(v) => start(() => setTaskPriority(user, t.id, v))}
                    />
                  ))}
                {!readOnly && <X onClick={() => start(() => deleteRow(user, 'tasks', t.id))} />}
              </div>
            ))}
          </div>
        ))}
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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tasks.length ? 'Add another…' : 'What are you doing today?'}
            className="input w-full"
          />
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

function FoodRowGroup({ user, habit, readOnly, entries }: P & { entries: FoodRow[] }) {
  const [text, setText] = useState('')
  const [cal, setCal] = useState('')
  const [pending, start] = useTransition()

  return (
    <div className={pending ? 'opacity-50' : ''}>
      <div className="flex items-center gap-3 px-4 pt-3">
        <Check on={entries.length > 0} />
        <span className="flex-1 font-medium">{habit.title}</span>
        {habit.calories && entries.some((e) => e.calories) && (
          <span className="tabular-nums text-sm text-neutral-400">
            {entries.reduce((s, e) => s + (e.calories ?? 0), 0)} cal
          </span>
        )}
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
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- weight

function WeightRow({ user, habit, readOnly, lbs }: P & { lbs: number | null }) {
  const [value, setValue] = useState(lbs != null ? String(lbs) : '')
  const [pending, start] = useTransition()

  function save() {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0 && n !== lbs) start(() => setWeight(user, n))
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${pending ? 'opacity-50' : ''}`}>
      <Check on={lbs != null} />
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
}: P & { workouts: WorkoutRow[]; names?: string[] }) {
  const [value, setValue] = useState('')
  const [pending, start] = useTransition()
  const mine = workouts.filter((w) => w.mode === 'strength')

  return (
    <div className={pending ? 'opacity-50' : ''}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Check on={mine.length > 0} />
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

function CardioRow({ user, habit, readOnly, workouts }: P & { workouts: WorkoutRow[] }) {
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
        <Check on={mine.length > 0} />
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
}: P & { day: DayData; names?: string[] }) {
  const p = { user, habit, readOnly }
  switch (habit.kind) {
    case 'toggle':
      return <ToggleRow {...p} done={day.toggles[habit.key]?.done ?? false} />
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
