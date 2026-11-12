import type { Edge, EdgeKind, Universe } from './domain.ts'
import { edgeKinds } from './domain.ts'
import { computeColumns } from './layout.ts'
import { isHidden, type SpoilerLevel } from './spoilers.ts'

export interface GraphFilters { kinds: EdgeKind[]; characterIds: string[] }
export const allKinds: GraphFilters = { kinds: [...edgeKinds], characterIds: [] }

export interface StoryGraph {
  /** Character rows, busiest first; only characters with at least one visible occurrence. */
  characters: { id: string; name: string; occurrenceIds: string[] }[]
  /** One node per visible occurrence, placed at its shared timeline column. */
  nodes: { occurrenceId: string; eventId: string; title: string; col: number; laneIndex: number; characterIds: string[] }[]
  edges: Edge[]
  columns: number
}

/**
 * Derived only from typed event participation and declared edges — nothing is inferred.
 * Spoiler-hidden occurrences are dropped before anything is built.
 */
export function buildStoryGraph(universe: Universe, level: SpoilerLevel, filters: GraphFilters = allKinds): StoryGraph {
  const cols = computeColumns(universe)
  const laneIndex = new Map(universe.worlds.map((w, i) => [w.id, i]))
  const chosen = new Set(filters.characterIds)
  const nodes: StoryGraph['nodes'] = []
  for (const o of universe.occurrences) {
    if (isHidden(level, o.spoiler)) continue
    const event = universe.events.find((e) => e.id === o.eventId)
    if (!event) continue
    const characterIds = event.characterIds.filter((id) => chosen.size === 0 || chosen.has(id))
    if (chosen.size > 0 && characterIds.length === 0) continue
    nodes.push({ occurrenceId: o.id, eventId: event.id, title: event.title, col: cols[o.id] ?? 0, laneIndex: laneIndex.get(o.worldId) ?? 0, characterIds })
  }
  const nodeIds = new Set(nodes.map((n) => n.occurrenceId))
  const characters = universe.characters
    .map((c) => ({ id: c.id, name: c.name, occurrenceIds: nodes.filter((n) => n.characterIds.includes(c.id)).map((n) => n.occurrenceId) }))
    .filter((c) => c.occurrenceIds.length > 0)
    .sort((a, b) => b.occurrenceIds.length - a.occurrenceIds.length || a.name.localeCompare(b.name))
  const kinds = new Set(filters.kinds)
  const edges = universe.edges.filter((e) => kinds.has(e.kind) && nodeIds.has(e.fromOccurrenceId) && nodeIds.has(e.toOccurrenceId))
  return { characters, nodes, edges, columns: Math.max(1, ...Object.values(cols).map((c) => c + 1)) }
}

/** Occurrences directly connected to one occurrence by a visible edge. */
export function neighbours(graph: StoryGraph, occurrenceId: string): string[] {
  return graph.edges.flatMap((e) => e.fromOccurrenceId === occurrenceId ? [e.toOccurrenceId] : e.toOccurrenceId === occurrenceId ? [e.fromOccurrenceId] : [])
}
