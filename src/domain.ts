export type DatePlacement =
  | { kind: 'exact'; label: string; value: string }
  | { kind: 'range'; label: string; start?: string; end?: string }
  | { kind: 'relative'; label: string; after?: string; before?: string }
  | { kind: 'unknown'; label: string }
  | { kind: 'disputed'; label: string; alternatives: string[] }

export interface Source { id: string; title: string; kind: 'film' | 'book' | 'episode' | 'reference'; url?: string }
export interface Character { id: string; name: string; description?: string }
export interface World { id: string; name: string; summary: string; tone: 'teal' | 'coral' | 'gold' }
export interface Event {
  id: string; title: string; description: string; placement: DatePlacement; worldId: string
  spoiler: 'none' | 'mild' | 'major'; uncertainty?: string; sourceIds: string[]; characterIds: string[]
}
export interface Edge { id: string; fromEventId: string; toEventId: string; kind: 'leads-to' | 'branches-to' | 'returns-to' | 'related' }
export interface Universe {
  id: string; title: string; subtitle: string; description: string
  worlds: World[]; characters: Character[]; sources: Source[]; events: Event[]; edges: Edge[]
}

export function validateUniverse(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['Universe must be an object.']
  const universe = value as Partial<Universe>
  const errors: string[] = []
  if (typeof universe.id !== 'string' || !universe.id.trim()) errors.push('Universe needs a stable, non-empty id.')
  if (typeof universe.title !== 'string' || !universe.title.trim()) errors.push('Universe needs a title.')
  for (const field of ['worlds', 'characters', 'sources', 'events', 'edges'] as const) {
    if (!Array.isArray(universe[field])) errors.push(`${field} must be an array.`)
  }
  if (errors.length) return errors
  const collections = [universe.worlds!, universe.characters!, universe.sources!, universe.events!, universe.edges!]
  const ids = new Set<string>()
  for (const item of collections.flat()) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) errors.push('Every record needs a stable, non-empty id.')
    else if (ids.has(item.id)) errors.push(`Duplicate id: ${item.id}.`)
    else ids.add(item.id)
  }
  const safeIds = (items: unknown[]) => new Set(items.filter((item): item is { id: string } => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')).map((item) => item.id))
  const worldIds = safeIds(universe.worlds!)
  const characterIds = safeIds(universe.characters!)
  const sourceIds = safeIds(universe.sources!)
  const eventIds = safeIds(universe.events!)
  for (const world of universe.worlds!) {
    if (!world || typeof world !== 'object') continue
    if (typeof world.name !== 'string' || !world.name.trim()) errors.push(`World ${world.id} needs a name.`)
    if (typeof world.summary !== 'string') errors.push(`World ${world.id} needs a summary.`)
    if (!['teal', 'coral', 'gold'].includes(world.tone)) errors.push(`World ${world.id} has an invalid tone.`)
  }
  for (const character of universe.characters!) {
    if (character && typeof character === 'object' && (typeof character.name !== 'string' || !character.name.trim())) errors.push(`Character ${character.id} needs a name.`)
  }
  for (const source of universe.sources!) {
    if (!source || typeof source !== 'object') continue
    if (typeof source.title !== 'string' || !source.title.trim()) errors.push(`Source ${source.id} needs a title.`)
    if (!['film', 'book', 'episode', 'reference'].includes(source.kind)) errors.push(`Source ${source.id} has an invalid kind.`)
  }
  for (const event of universe.events!) {
    if (!event || typeof event !== 'object') continue
    if (typeof event.title !== 'string' || !event.title.trim()) errors.push(`Event ${event.id} needs a title.`)
    if (typeof event.description !== 'string') errors.push(`Event ${event.id} needs a description.`)
    if (!['none', 'mild', 'major'].includes(event.spoiler)) errors.push(`Event ${event.id} has an invalid spoiler scope.`)
    if (!worldIds.has(event.worldId)) errors.push(`Event ${event.id} references missing world ${event.worldId}.`)
    if (!event.placement || typeof event.placement.label !== 'string' || !['exact', 'range', 'relative', 'unknown', 'disputed'].includes(event.placement.kind)) errors.push(`Event ${event.id} has an invalid date placement.`)
    if (event.placement?.kind === 'exact' && typeof event.placement.value !== 'string') errors.push(`Event ${event.id} needs an exact date value.`)
    if (event.placement?.kind === 'disputed' && (!Array.isArray(event.placement.alternatives) || !event.placement.alternatives.length)) errors.push(`Event ${event.id} needs disputed date alternatives.`)
    if (!Array.isArray(event.characterIds)) errors.push(`Event ${event.id} characterIds must be an array.`)
    else for (const id of event.characterIds) if (!characterIds.has(id)) errors.push(`Event ${event.id} references missing character ${id}.`)
    if (!Array.isArray(event.sourceIds)) errors.push(`Event ${event.id} sourceIds must be an array.`)
    else for (const id of event.sourceIds) if (!sourceIds.has(id)) errors.push(`Event ${event.id} references missing source ${id}.`)
  }
  for (const edge of universe.edges!) {
    if (!edge || typeof edge !== 'object') continue
    if (!eventIds.has(edge.fromEventId)) errors.push(`Edge ${edge.id} references missing event ${edge.fromEventId}.`)
    if (!eventIds.has(edge.toEventId)) errors.push(`Edge ${edge.id} references missing event ${edge.toEventId}.`)
    if (!['leads-to', 'branches-to', 'returns-to', 'related'].includes(edge.kind)) errors.push(`Edge ${edge.id} has an invalid kind.`)
    if (edge.fromEventId === edge.toEventId) errors.push(`Edge ${edge.id} cannot point an event to itself.`)
  }
  return errors
}
