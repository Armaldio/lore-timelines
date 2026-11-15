import type { Calendar, Occurrence, Universe } from './domain'

/**
 * One real time axis for every universe. Time is a plain number of years (fractional), so Star Wars
 * years (BBY negative, ABY positive) and Gregorian dates share the same maths and the same scale.
 */
export type TimeBasis = 'stated' | 'inferred' | 'derived' | 'undated'
export interface ResolvedTime { start: number; end: number; basis: TimeBasis }

/** A step for "just after / just before" an anchor: one day. */
export const STEP = 1 / 365.25

function utc(year: number, month = 0, day = 1, hour = 0): number {
  const d = new Date(0)
  d.setUTCFullYear(year, month, day)
  d.setUTCHours(hour, 0, 0, 0)
  return d.getTime()
}
const yearStart = (y: number) => utc(y)

/** "1988-10-02", "1988-10", "1945", "-0019" → years. Returns undefined when it is not a date. */
export function parseTime(text: string | undefined, calendar: Calendar = 'gregorian'): number | undefined {
  if (!text) return undefined
  const m = /^(-?\d{1,4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(text.trim())
  if (!m) return undefined
  const year = Number(m[1])
  if (calendar === 'galactic' || m[2] === undefined) return year
  const month = Number(m[2]) - 1, day = m[3] === undefined ? 1 : Number(m[3])
  if (month < 0 || month > 11 || day < 1 || day > 31) return undefined
  const ms = utc(year, month, day)
  return year + (ms - yearStart(year)) / (yearStart(year + 1) - yearStart(year))
}

/** Granularity of a stated value: "1945" covers the whole year, "1988-10" the month, "1988-10-02" the day. */
function parseSpan(text: string | undefined, calendar: Calendar): { start: number; end: number } | undefined {
  const start = parseTime(text, calendar)
  if (start === undefined || !text) return undefined
  if (calendar === 'galactic') return { start, end: start }
  const parts = text.trim().replace(/^-/, '').split('-').length
  if (parts === 1) return { start, end: start + 1 }
  if (parts === 2) { const [y, mo] = text.split('-').map(Number) as [number, number]; const next = mo === 12 ? parseTime(`${y + 1}-01`)! : parseTime(`${y}-${String(mo + 1).padStart(2, '0')}`)!; return { start, end: next } }
  return { start, end: start }
}

/**
 * Resolve every occurrence to a position on the axis:
 *  stated   – the placement itself carries a parseable date (exact/range);
 *  inferred – the dataset supplies `when` because the placement is a label, a dispute or a story-only position;
 *  derived  – a relative placement, one day after/before its anchor;
 *  undated  – nothing places it on the calendar (outside time, no date given).
 */
export function resolveTimes(universe: Universe): Record<string, ResolvedTime | undefined> {
  const calendar = universe.axis?.calendar ?? 'gregorian'
  const byId = new Map(universe.occurrences.map((o) => [o.id, o]))
  const out: Record<string, ResolvedTime | undefined> = {}
  const state = new Map<string, 'visiting' | 'done'>()
  const solve = (o: Occurrence): ResolvedTime | undefined => {
    if (state.get(o.id) === 'done') return out[o.id]
    if (state.get(o.id) === 'visiting') return undefined
    state.set(o.id, 'visiting')
    let result: ResolvedTime | undefined
    const p = o.placement
    const own = (a?: string, b?: string, basis: TimeBasis = 'stated') => {
      const s = parseSpan(a, calendar), e = parseSpan(b ?? a, calendar)
      return s && e ? { start: s.start, end: Math.max(s.start, e.end), basis } : undefined
    }
    if (o.when) result = own(o.when.start, o.when.end, 'inferred')
    else if (p.kind === 'exact') result = own(p.value)
    else if (p.kind === 'range') result = own(p.start ?? p.end, p.end ?? p.start)
    if (!result && p.kind === 'relative') {
      const after = p.after ? byId.get(p.after) : undefined
      const before = p.before ? byId.get(p.before) : undefined
      const a = after && solve(after), b = before && solve(before)
      if (a) result = { start: a.end + STEP, end: a.end + STEP, basis: 'derived' }
      else if (b) result = { start: b.start - STEP, end: b.start - STEP, basis: 'derived' }
    }
    out[o.id] = result
    state.set(o.id, 'done')
    return result
  }
  for (const o of universe.occurrences) solve(o)
  return out
}

// ---------------------------------------------------------------- ticks

export type Unit =
  | { kind: 'year'; n: number }
  | { kind: 'month'; n: number }
  | { kind: 'day'; n: number }
  | { kind: 'hour'; n: number }

/** Coarse → fine. `years` is the approximate length of one step. */
const UNITS: { unit: Unit; years: number }[] = [
  { unit: { kind: 'year', n: 1000 }, years: 1000 }, { unit: { kind: 'year', n: 500 }, years: 500 },
  { unit: { kind: 'year', n: 100 }, years: 100 }, { unit: { kind: 'year', n: 50 }, years: 50 },
  { unit: { kind: 'year', n: 10 }, years: 10 }, { unit: { kind: 'year', n: 5 }, years: 5 },
  { unit: { kind: 'year', n: 1 }, years: 1 },
  { unit: { kind: 'month', n: 3 }, years: 0.25 }, { unit: { kind: 'month', n: 1 }, years: 1 / 12 },
  { unit: { kind: 'day', n: 7 }, years: 7 / 365.25 }, { unit: { kind: 'day', n: 1 }, years: 1 / 365.25 },
  { unit: { kind: 'hour', n: 6 }, years: 0.25 / 365.25 }, { unit: { kind: 'hour', n: 1 }, years: 1 / 8766 },
]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface Tick { t: number; label: string; major: boolean }
export interface TickSet { unit: Unit; labelled: Tick[]; minor: Tick[]; context: Tick[]; unitName: string }

const MIN_LABEL_PX = 92
const MIN_MINOR_PX = 12

function unitsFor(calendar: Calendar) { return calendar === 'galactic' ? UNITS.filter((u) => u.unit.kind === 'year') : UNITS }

export function maxPxPerYear(calendar: Calendar): number { return calendar === 'galactic' ? 700 : 8766 * 90 }

function formatYear(year: number, calendar: Calendar): string {
  if (calendar === 'galactic') return year === 0 ? '0 (Yavin)' : year < 0 ? `${-year} BBY` : `${year} ABY`
  return year < 0 ? `${-year} BC` : String(year)
}

function msToT(ms: number): number {
  const y = new Date(ms).getUTCFullYear()
  return y + (ms - yearStart(y)) / (yearStart(y + 1) - yearStart(y))
}
const fmt2 = (n: number) => String(n).padStart(2, '0')

/** Ticks for every `unit` boundary inside [t0, t1]. */
function boundaries(unit: Unit, t0: number, t1: number, label: (t: number, ms: number, y: number, mo: number, d: number, h: number) => string, majorOf: (ms: number) => boolean = () => false): Tick[] {
  const out: Tick[] = []
  if (unit.kind === 'year') {
    for (let y = Math.ceil(t0 / unit.n) * unit.n; y <= t1; y += unit.n) out.push({ t: y, label: label(y, 0, y, 0, 1, 0), major: false })
    return out
  }
  const startYear = Math.floor(t0)
  if (unit.kind === 'month') {
    for (let y = startYear; y <= Math.floor(t1) + 1; y++) {
      for (let m = 0; m < 12; m += unit.n) {
        const ms = utc(y, m, 1), t = msToT(ms)
        if (t >= t0 && t <= t1) out.push({ t, label: label(t, ms, y, m, 1, 0), major: majorOf(ms) })
      }
    }
    return out
  }
  const stepMs = unit.kind === 'day' ? unit.n * 86400000 : unit.n * 3600000
  const base = utc(startYear)
  let ms = base + Math.floor((utc(startYear, 0, 1) + (t0 - startYear) * (yearStart(startYear + 1) - base) - base) / stepMs) * stepMs
  const limit = utc(Math.floor(t1) + 1) + 1
  for (; ms <= limit && out.length < 4000; ms += stepMs) {
    const t = msToT(ms)
    if (t < t0) continue
    if (t > t1) break
    const d = new Date(ms)
    out.push({ t, label: label(t, ms, d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()), major: majorOf(ms) })
  }
  return out
}

/** Pick tick density for the current scale and list the ticks inside [t0, t1]. */
export function pickTicks(t0: number, t1: number, pxPerYear: number, calendar: Calendar): TickSet {
  const list = unitsFor(calendar)
  let idx = 0
  for (let i = list.length - 1; i >= 0; i--) if (list[i]!.years * pxPerYear >= MIN_LABEL_PX) { idx = i; break }
  const chosen = list[idx]!, finer = list[idx + 1]
  const lab = (u: Unit) => (_t: number, _ms: number, y: number, mo: number, d: number, h: number) => {
    if (u.kind === 'year') return formatYear(y, calendar)
    if (u.kind === 'month') return MONTHS[mo]!
    if (u.kind === 'day') return `${MONTHS[mo]} ${d}`
    return `${fmt2(h)}:00`
  }
  const labelled = boundaries(chosen.unit, t0, t1, lab(chosen.unit))
  // Never leave the ruler blank: when no boundary falls in view, name the date at the left edge.
  if (!labelled.length) labelled.push({ t: t0, label: formatTime(t0, calendar), major: false })
  const minor = finer && finer.years * pxPerYear >= MIN_MINOR_PX ? boundaries(finer.unit, t0, t1, () => '') : []
  // Context row: the larger period the labels sit in (the year above months, the month above days, …).
  let context: Tick[] = []
  if (chosen.unit.kind === 'month') context = boundaries({ kind: 'year', n: 1 }, t0 - 1, t1, (_t, _ms, y) => formatYear(y, calendar)).map((tk) => ({ ...tk, major: true }))
  else if (chosen.unit.kind === 'day') context = boundaries({ kind: 'month', n: 1 }, t0 - 0.1, t1, (_t, _ms, y, mo) => `${MONTHS[mo]} ${y}`).map((tk) => ({ ...tk, major: true }))
  else if (chosen.unit.kind === 'hour') context = boundaries({ kind: 'day', n: 1 }, t0 - 0.01, t1, (_t, _ms, y, mo, d) => `${MONTHS[mo]} ${d}, ${y}`).map((tk) => ({ ...tk, major: true }))
  const unitName = chosen.unit.kind === 'year' ? (chosen.unit.n === 1 ? 'year' : `${chosen.unit.n} years`) : chosen.unit.kind === 'month' ? (chosen.unit.n === 1 ? 'month' : 'quarter') : chosen.unit.kind === 'day' ? (chosen.unit.n === 1 ? 'day' : 'week') : (chosen.unit.n === 1 ? 'hour' : `${chosen.unit.n} hours`)
  return { unit: chosen.unit, labelled, minor, context, unitName }
}

/** Human date for a position, used for the cursor read-out. */
export function formatTime(t: number, calendar: Calendar): string {
  if (calendar === 'galactic') return formatYear(Math.round(t), calendar)
  const y = Math.floor(t)
  const ms = yearStart(y) + (t - y) * (yearStart(y + 1) - yearStart(y))
  const d = new Date(ms)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${formatYear(d.getUTCFullYear(), calendar)}`
}
