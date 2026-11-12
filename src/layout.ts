import type { Calendar, Edge, Universe } from './domain.ts'
import { resolveTimes, STEP, type TimeBasis } from './time.ts'

/**
 * One fixed geometry shared by every universe. Horizontal position is real time (src/time.ts);
 * a lane grows extra rows only when two cards would overlap at the current scale.
 */
export const CARD_W = 200
export const CARD_H = 84
export const COMPACT_W = 176
export const COMPACT_H = 30
export const COL_GAP = 46 // story-order spacing, used by the relationship view
export const GAP_X = 12
export const GAP_Y = 14
export const PAD_X = 40
export const RULER_H = 62
export const LANE_HEAD = 70
export const LANE_PAD_B = 24
export const LANE_GAP = 18
/** Below this scale (pixels per year) cards collapse to one-line chips so lanes stay short. */
export const COMPACT_BELOW = 360
/** Browsers stop laying out elements somewhere around 33M px; stay far below it. */
export const MAX_CANVAS_W = 8_000_000

export interface Node {
  id: string; laneIndex: number; row: number; x: number; y: number; w: number; h: number
  /** Width of the duration bar for ranges (0 for instants). */
  spanW: number; undated: boolean; basis: TimeBasis; compact: boolean
}
export interface LaneBox { id: string; y: number; height: number; rows: number }
export interface Layout {
  width: number; height: number; lanes: LaneBox[]; nodes: Record<string, Node>
  tMin: number; tMax: number; px: number; compact: boolean
  /** Left edge of the "no established date" zone, when any card is undated. */
  undatedX?: number
}
export interface AxisExtent { tMin: number; tMax: number; calendar: Calendar }

/**
 * Column rule (deterministic, independent of filters):
 * - occurrences in one lane keep their declared order, one column apart at least;
 * - an edge inside a lane moves its target one column on;
 * - an edge across lanes (branch, return, related) lets the target share the source column.
 */
export function computeColumns(universe: Universe): Record<string, number> {
  const laneOf = new Map(universe.occurrences.map((o) => [o.id, o.worldId]))
  const previousInLane = new Map<string, string>()
  const lastSeen = new Map<string, string>()
  for (const o of universe.occurrences) {
    const prev = lastSeen.get(o.worldId)
    if (prev) previousInLane.set(o.id, prev)
    lastSeen.set(o.worldId, o.id)
  }
  const solve = (edges: Edge[]) => {
    const col: Record<string, number> = Object.fromEntries(universe.occurrences.map((o) => [o.id, 0]))
    for (let pass = 0; pass <= universe.occurrences.length; pass++) {
      let changed = false
      // Capped so a cyclic edge set can never push a column past the occurrence count.
      const raise = (id: string, min: number) => { const target = Math.min(min, universe.occurrences.length); if ((col[id] ?? 0) < target) { col[id] = target; changed = true } }
      for (const o of universe.occurrences) {
        const prev = previousInLane.get(o.id)
        if (prev) raise(o.id, col[prev]! + 1)
      }
      for (const e of edges) {
        if (!(e.fromOccurrenceId in col) || !(e.toOccurrenceId in col)) continue
        const sameLane = laneOf.get(e.fromOccurrenceId) === laneOf.get(e.toOccurrenceId)
        raise(e.toOccurrenceId, col[e.fromOccurrenceId]! + (sameLane ? 1 : 0))
      }
      if (!changed) break
    }
    return col
  }
  // Edges flagged `loop` return to a moment already visited (the Donnie Darko tangent collapsing back onto
  // the night it began); they must not drag their target to the right, so they carry no column constraint.
  const edges = universe.edges.filter((e) => !e.loop)
  return solve(edges)
}

/** Dated extent of the universe, padded a little so the first and last cards are not on the edge. */
export function axisExtent(universe: Universe): AxisExtent {
  const times = resolveTimes(universe)
  const dated = Object.values(times).filter((t): t is NonNullable<typeof t> => t !== undefined)
  const calendar = universe.axis?.calendar ?? 'gregorian'
  if (!dated.length) return { tMin: 0, tMax: 1, calendar }
  let lo = Math.min(...dated.map((t) => t.start)), hi = Math.max(...dated.map((t) => t.end))
  if (hi - lo < STEP * 4) { const mid = (lo + hi) / 2; lo = mid - STEP * 2; hi = mid + STEP * 2 }
  const pad = (hi - lo) * 0.02
  return { tMin: lo - pad, tMax: hi + pad, calendar }
}

/** Scale at which the whole dated range fits `viewWidth`. */
export function fitScale(universe: Universe, viewWidth: number): number {
  const { tMin, tMax } = axisExtent(universe)
  return Math.max(1e-6, (viewWidth - PAD_X * 2 - CARD_W) / (tMax - tMin))
}

/**
 * Deterministic: depends only on the universe and the scale, never on filters or the spoiler level.
 * Cards sit at their real time; within a lane a card takes the first row where it does not overlap.
 */
export function computeLayout(universe: Universe, pxPerYear: number): Layout {
  const times = resolveTimes(universe)
  const { tMin, tMax } = axisExtent(universe)
  const px = Math.min(pxPerYear, MAX_CANVAS_W / Math.max(tMax - tMin, STEP))
  const compact = px < COMPACT_BELOW
  const w = compact ? COMPACT_W : CARD_W, h = compact ? COMPACT_H : CARD_H
  const laneIndex = new Map(universe.worlds.map((world, i) => [world.id, i]))
  const rows = new Map<number, number[]>() // lane -> right edge of each row
  const nodes: Record<string, Node> = {}
  const undatedCount = new Map<number, number>()
  const order = new Map(universe.occurrences.map((o, i) => [o.id, i]))
  const dated = universe.occurrences.filter((o) => times[o.id]).sort((a, b) => times[a.id]!.start - times[b.id]!.start || order.get(a.id)! - order.get(b.id)!)
  const datedWidth = PAD_X + (tMax - tMin) * px + w
  const undatedX = datedWidth + 70
  const place = (o: (typeof universe.occurrences)[number], x: number, undated: boolean, row: number, spanW: number) => {
    const li = laneIndex.get(o.worldId) ?? 0
    nodes[o.id] = { id: o.id, laneIndex: li, row, x, y: 0, w, h, spanW, undated, basis: times[o.id]?.basis ?? 'undated', compact }
  }
  for (const o of dated) {
    const t = times[o.id]!
    const li = laneIndex.get(o.worldId) ?? 0
    const x = PAD_X + (t.start - tMin) * px
    const ends = rows.get(li) ?? []
    let row = ends.findIndex((end) => end + GAP_X <= x)
    if (row < 0) { row = ends.length; ends.push(0) }
    ends[row] = x + w
    rows.set(li, ends)
    place(o, x, false, row, Math.max(0, (t.end - t.start) * px))
  }
  for (const o of universe.occurrences) {
    if (times[o.id]) continue
    const li = laneIndex.get(o.worldId) ?? 0
    const k = undatedCount.get(li) ?? 0
    undatedCount.set(li, k + 1)
    if (!(rows.get(li)?.length)) rows.set(li, [0])
    place(o, undatedX + k * (w + GAP_X), true, 0, 0)
  }
  const lanes: LaneBox[] = []
  let y = RULER_H
  for (const [i] of universe.worlds.entries()) {
    const n = Math.max(1, rows.get(i)?.length ?? 1)
    const height = LANE_HEAD + n * h + (n - 1) * GAP_Y + LANE_PAD_B
    lanes.push({ id: universe.worlds[i]!.id, y, height, rows: n })
    y += height + LANE_GAP
  }
  for (const node of Object.values(nodes)) node.y = lanes[node.laneIndex]!.y + LANE_HEAD + node.row * (h + GAP_Y)
  const undatedWidth = Math.max(0, ...[...undatedCount.values()]) * (w + GAP_X)
  const hasUndated = undatedWidth > 0
  return {
    width: Math.ceil((hasUndated ? undatedX + undatedWidth : datedWidth) + PAD_X),
    height: y - LANE_GAP,
    lanes, nodes, tMin, tMax, px, compact, ...(hasUndated ? { undatedX } : {}),
  }
}

export const xOfTime = (layout: Pick<Layout, 'tMin' | 'px'>, t: number) => PAD_X + (t - layout.tMin) * layout.px
export const timeOfX = (layout: Pick<Layout, 'tMin' | 'px'>, x: number) => layout.tMin + (x - PAD_X) / layout.px

/**
 * Edge routing: a smooth curve from the right side of the earlier card to the left side of the later one.
 * When the target is not clearly to the right (a return, or overlapping in time) it leaves the top or
 * bottom instead, so no curve ever doubles back through its own cards.
 */
export function edgePath(layout: Layout, edge: Edge): string | undefined {
  const a = layout.nodes[edge.fromOccurrenceId]
  const b = layout.nodes[edge.toOccurrenceId]
  if (!a || !b) return undefined
  if (b.x >= a.x + a.w + 16) {
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2
    const k = Math.max(36, (x2 - x1) / 2)
    return `M ${x1} ${y1} C ${x1 + k} ${y1} ${x2 - k} ${y2} ${x2} ${y2}`
  }
  const x1 = a.x + a.w / 2, x2 = b.x + b.w / 2
  const down = b.y >= a.y
  const y1 = down ? a.y + a.h : a.y
  const y2 = down ? b.y : b.y + b.h
  const k = Math.max(30, Math.abs(y2 - y1) / 2)
  return `M ${x1} ${y1} C ${x1} ${y1 + (down ? k : -k)} ${x2} ${y2 + (down ? -k : k)} ${x2} ${y2}`
}

/** A flagged loop edge: the story returns to a moment it already visited. */
export function isLoopClosure(_layout: Layout, edge: Edge): boolean { return edge.loop === true }

export function edgeMidpoint(layout: Layout, edge: Edge): { x: number; y: number } | undefined {
  const a = layout.nodes[edge.fromOccurrenceId]
  const b = layout.nodes[edge.toOccurrenceId]
  if (!a || !b) return undefined
  if (b.x >= a.x + a.w + 16) return { x: (a.x + a.w + b.x) / 2, y: (a.y + a.h / 2 + b.y + b.h / 2) / 2 }
  return { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: (a.y + b.y + (a.h + b.h) / 2) / 2 }
}
