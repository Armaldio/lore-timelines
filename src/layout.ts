import type { Edge, Universe } from './domain'

/** One fixed geometry shared by every universe, so all timelines read the same way. */
export const CARD_W = 190
export const CARD_H = 84
export const COL_GAP = 46
export const LANE_PAD_X = 26
export const LANE_HEAD = 76
export const LANE_PAD_B = 28
export const LANE_GAP = 18
export const LANE_H = LANE_HEAD + CARD_H + LANE_PAD_B

export interface Node { id: string; laneIndex: number; col: number; x: number; y: number }
export interface LaneBox { id: string; y: number; height: number }
export interface Layout { width: number; height: number; lanes: LaneBox[]; nodes: Record<string, Node> }

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

export function computeLayout(universe: Universe): Layout {
  const col = computeColumns(universe)
  const laneIndex = new Map(universe.worlds.map((w, i) => [w.id, i]))
  const columns = Math.max(1, ...Object.values(col).map((c) => c + 1))
  const nodes: Record<string, Node> = {}
  for (const o of universe.occurrences) {
    const li = laneIndex.get(o.worldId) ?? 0
    nodes[o.id] = { id: o.id, laneIndex: li, col: col[o.id]!, x: LANE_PAD_X + col[o.id]! * (CARD_W + COL_GAP), y: li * (LANE_H + LANE_GAP) + LANE_HEAD }
  }
  const lanes = universe.worlds.map((w, i) => ({ id: w.id, y: i * (LANE_H + LANE_GAP), height: LANE_H }))
  return {
    width: LANE_PAD_X * 2 + columns * CARD_W + (columns - 1) * COL_GAP,
    height: Math.max(1, lanes.length) * LANE_H + Math.max(0, lanes.length - 1) * LANE_GAP,
    lanes, nodes,
  }
}

export function edgePath(layout: Layout, edge: Edge): string | undefined {
  const a = layout.nodes[edge.fromOccurrenceId]
  const b = layout.nodes[edge.toOccurrenceId]
  if (!a || !b) return undefined
  if (a.laneIndex === b.laneIndex && b.x <= a.x) {
    // Backward edge in one lane: arc over the cards instead of cutting through them.
    const x1 = a.x + CARD_W / 2, x2 = b.x + CARD_W / 2, y = a.y
    const lift = 34
    return `M ${x1} ${y} C ${x1} ${y - lift} ${x2} ${y - lift} ${x2} ${y - 3}`
  }
  if (a.laneIndex === b.laneIndex) {
    const y = a.y + CARD_H / 2
    return `M ${a.x + CARD_W} ${y} L ${b.x - 3} ${y}`
  }
  const down = b.y > a.y
  const x1 = a.x + CARD_W / 2, x2 = b.x + CARD_W / 2
  const y1 = down ? a.y + CARD_H : a.y
  const y2 = down ? b.y - 3 : b.y + CARD_H + 3
  const ym = (y1 + y2) / 2
  return x1 === x2 ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} C ${x1} ${ym} ${x2} ${ym} ${x2} ${y2}`
}

/** An edge explicitly flagged as a loop closure in the data. */
export function isLoopClosure(layout: Layout, edge: Edge): boolean {
  const a = layout.nodes[edge.fromOccurrenceId], b = layout.nodes[edge.toOccurrenceId]
  return edge.loop === true && !!a && !!b
}

export function edgeMidpoint(layout: Layout, edge: Edge): { x: number; y: number } | undefined {
  const a = layout.nodes[edge.fromOccurrenceId], b = layout.nodes[edge.toOccurrenceId]
  if (!a || !b) return undefined
  return { x: (a.x + b.x) / 2 + CARD_W / 2, y: a.laneIndex === b.laneIndex ? a.y - 30 : (a.y + b.y) / 2 + CARD_H / 2 }
}
