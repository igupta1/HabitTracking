'use client'

import { useEffect, useRef, useState } from 'react'
import { dayIndex, formatShortDay } from '@/lib/day'
import { USERS, nameOf, type UserId } from '@/lib/habits'
import type { WeightPoint } from '@/lib/queries'

/**
 * Date vs body weight, behind the button on the weight row.
 *
 * Plain SVG rather than a chart library: one line, one axis and a crosshair is
 * less code than the wrapper around a dependency would be, and this is the only
 * chart in the app.
 *
 * One person per chart. The column it sits in already says whose weight this
 * is, so there's no legend — and the two people's colours never have to be told
 * apart inside one plot, which matters because they don't separate under
 * deuteranopia (they're only ever a page apart).
 */

const HEIGHT = 148
// Left holds the lb ticks, right the value riding the last point, bottom the
// dates. Trimming any of the three clips its labels rather than tightening the
// plot.
const PAD = { top: 14, right: 40, bottom: 20, left: 34 }

const SURFACE = '#171717' // neutral-900 — the card the chart is drawn on
const GRID = '#262626' // neutral-800
const CROSSHAIR = '#525252' // neutral-600

/** Gridline spacing: whichever multiple of 1, 2 or 5 lands closest to `raw`. */
function niceStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(raw))
  return [mag, 2 * mag, 5 * mag, 10 * mag].reduce((a, b) =>
    Math.abs(b - raw) < Math.abs(a - raw) ? b : a
  )
}

/** Weights are stored as `real`, so 172.4 can come back as 172.39999. */
function lbsText(v: number): string {
  return String(Math.round(v * 10) / 10)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function WeightChart({ user, points }: { user: UserId; points: WeightPoint[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // The point under the pointer, or stepped to with the arrow keys. Null is
  // "none": the last point is labelled either way.
  const [sel, setSel] = useState<number | null>(null)

  // Measured rather than scaled up from a viewBox, so strokes and type stay the
  // size they are written at whatever width the column happens to be.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (points.length === 0) return null

  const color = USERS[user].color
  const last = points.length - 1
  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = HEIGHT - PAD.top - PAD.bottom

  // Days rather than positions on the x axis, so a week of not weighing in
  // reads as a week-long gap instead of one more step along the line.
  const days = points.map((p) => dayIndex(p.day))
  const [d0, d1] = [days[0], days[last]]
  const lbs = points.map((p) => p.lbs)
  const [lo, hi] = [Math.min(...lbs), Math.max(...lbs)]
  // At least 3 lbs of range: a steady fortnight should read as a flat line, not
  // as a mountain range magnified out of a quarter-pound of scale noise.
  const padY = Math.max((hi - lo) * 0.18, 1.5)
  const [yLo, yHi] = [lo - padY, hi + padY]

  const x = (i: number) =>
    d1 === d0 ? PAD.left + innerW / 2 : PAD.left + ((days[i] - d0) / (d1 - d0)) * innerW
  const y = (v: number) => PAD.top + ((yHi - v) / (yHi - yLo)) * innerH

  // The axis is deliberately not zero-based: whole pounds of empty chart under
  // the line would flatten the only thing this is drawn to show.
  const step = niceStep((yHi - yLo) / 3)
  const ticks: number[] = []
  for (let k = Math.ceil(yLo / step); k * step <= yHi; k++) ticks.push(k * step)

  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.lbs).toFixed(1)}`)
    .join(' ')

  // A third date in the middle, but only where it has room to sit clear of the
  // two ends — nudging labels apart to fit them reads as noise.
  const centre = PAD.left + innerW / 2
  let mid = points.reduce((best, _, i) => (Math.abs(x(i) - centre) < Math.abs(x(best) - centre) ? i : best), 0)
  if (mid === 0 || mid === last || Math.min(x(mid) - PAD.left, PAD.left + innerW - x(mid)) < 46) mid = -1

  /** Snap to the nearest point: nobody aims at a 2px line. */
  function pick(clientX: number) {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    const px = clientX - r.left
    setSel(points.reduce((best, _, i) => (Math.abs(x(i) - px) < Math.abs(x(best) - px) ? i : best), 0))
  }

  const tick = (v: number) => (step < 1 ? v.toFixed(1) : String(Math.round(v)))

  return (
    <div className="px-4 pb-3">
      <div
        ref={box}
        role="img"
        tabIndex={0}
        aria-label={`${nameOf(user)}'s body weight: ${points.length} ${
          points.length === 1 ? 'entry' : 'entries'
        } from ${formatShortDay(points[0].day)} to ${formatShortDay(points[last].day)}, ${lbsText(
          lo
        )} to ${lbsText(hi)} lbs. Arrow keys read each day.`}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setSel(null)}
        onBlur={() => setSel(null)}
        onKeyDown={(e) => {
          const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
          if (!d) return
          e.preventDefault()
          setSel((s) => clamp((s ?? last) + d, 0, last))
        }}
        className="relative rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-neutral-600"
        style={{ height: HEIGHT }}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="block">
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={GRID}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={PAD.left - 6}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-neutral-500 text-[10px] tabular-nums"
                >
                  {tick(t)}
                </text>
              </g>
            ))}

            {sel !== null && (
              <line
                x1={x(sel)}
                x2={x(sel)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke={CROSSHAIR}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            )}

            <path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Ringed in the surface colour so a dot stays legible on the line. */}
            {sel !== null && sel !== last && (
              <circle cx={x(sel)} cy={y(points[sel].lbs)} r={3.5} fill={color} stroke={SURFACE} strokeWidth={2} />
            )}
            <circle cx={x(last)} cy={y(points[last].lbs)} r={3.5} fill={color} stroke={SURFACE} strokeWidth={2} />
            <text
              x={x(last) + 8}
              y={y(points[last].lbs)}
              dy="0.32em"
              className="fill-neutral-300 text-[11px] font-medium tabular-nums"
            >
              {lbsText(points[last].lbs)}
            </text>

            <text x={PAD.left} y={HEIGHT - 4} className="fill-neutral-500 text-[10px]">
              {formatShortDay(points[0].day)}
            </text>
            {mid > 0 && (
              <text x={x(mid)} y={HEIGHT - 4} textAnchor="middle" className="fill-neutral-500 text-[10px]">
                {formatShortDay(points[mid].day)}
              </text>
            )}
            {last > 0 && (
              <text
                x={PAD.left + innerW}
                y={HEIGHT - 4}
                textAnchor="end"
                className="fill-neutral-500 text-[10px]"
              >
                {formatShortDay(points[last].day)}
              </text>
            )}
          </svg>
        )}

        {/* The value leads and the date follows: you already know which day you
            are pointing at, and came for the number. */}
        {sel !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-neutral-800 px-2 py-1 text-xs leading-tight"
            style={{ left: clamp(x(sel), 46, Math.max(width - 46, 46)), top: y(points[sel].lbs) - 10 }}
          >
            <span className="font-medium tabular-nums">{lbsText(points[sel].lbs)} lbs</span>
            <span className="ml-1.5 text-neutral-400">{formatShortDay(points[sel].day)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
