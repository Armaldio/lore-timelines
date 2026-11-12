export type DatePlacement =
  | { kind: 'exact'; label: string; value: string }
  | { kind: 'range'; label: string; start?: string; end?: string }
  | { kind: 'relative'; label: string; after?: string; before?: string }
  | { kind: 'unknown'; label: string }
  | { kind: 'disputed'; label: string; alternatives: string[] }

export interface Source { id: string; title: string; kind: 'film' | 'book' | 'episode' | 'reference'; url?: string }
export interface Character { id: string; name: string; description?: string }
export interface Continuity { id: string; name: string; summary: string }
export interface World { id: string; continuityId: string; name: string; summary: string; tone: 'teal' | 'coral' | 'gold' }
export interface Event { id: string; title: string; description: string; characterIds: string[]; icon?: string }
export interface Occurrence {
  id: string; eventId: string; worldId: string; placement: DatePlacement
  spoiler: 'none' | 'mild' | 'major'; uncertainty?: string; sourceIds: string[]
}
export interface Edge { id: string; fromOccurrenceId: string; toOccurrenceId: string; kind: 'leads-to' | 'branches-to' | 'returns-to' | 'related' }
export interface Universe {
  id: string; title: string; subtitle: string; description: string
  continuities: Continuity[]; worlds: World[]; characters: Character[]; sources: Source[]
  events: Event[]; occurrences: Occurrence[]; edges: Edge[]
}

type RecordValue = Record<string, unknown>
function isRecord(value: unknown): value is RecordValue { return Boolean(value && typeof value === 'object' && !Array.isArray(value)) }
function isText(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 }
function idSet(items: unknown[]): Set<string> {
  return new Set(items.filter((item): item is RecordValue => isRecord(item) && isText(item.id)).map((item) => item.id as string))
}

export function validateUniverse(value: unknown): string[] {
  if (!isRecord(value)) return ['Universe must be an object.']
  const errors: string[] = []
  if (!isText(value.id)) errors.push('Universe needs a stable, non-empty id.')
  if (!isText(value.title)) errors.push('Universe needs a title.')
  if (typeof value.subtitle !== 'string' || typeof value.description !== 'string') errors.push('Universe needs a subtitle and description.')
  const fields = ['continuities', 'worlds', 'characters', 'sources', 'events', 'occurrences', 'edges'] as const
  const lists: Record<(typeof fields)[number], unknown[]> = { continuities: [], worlds: [], characters: [], sources: [], events: [], occurrences: [], edges: [] }
  for (const field of fields) {
    if (!Array.isArray(value[field])) errors.push(`${field} must be an array.`)
    else lists[field] = value[field] as unknown[]
  }
  if (errors.some((error) => error.endsWith('must be an array.'))) return errors

  const allRecords = fields.flatMap((field) => lists[field])
  const seenIds = new Set<string>()
  for (const item of allRecords) {
    if (!isRecord(item) || !isText(item.id)) errors.push('Every record needs a stable, non-empty id.')
    else if (seenIds.has(item.id)) errors.push(`Duplicate id: ${item.id}.`)
    else seenIds.add(item.id)
  }
  const records = Object.fromEntries(fields.map((field) => [field, lists[field].filter(isRecord)])) as Record<(typeof fields)[number], RecordValue[]>
  const continuityIds = idSet(lists.continuities)
  const worldIds = idSet(lists.worlds)
  const characterIds = idSet(lists.characters)
  const sourceIds = idSet(lists.sources)
  const eventIds = idSet(lists.events)
  const occurrenceIds = idSet(lists.occurrences)

  for (const continuity of records.continuities) {
    if (!isText(continuity.name) || !isText(continuity.summary)) errors.push(`Continuity ${String(continuity.id)} needs a name and summary.`)
  }
  for (const world of records.worlds) {
    if (!isText(world.name) || !isText(world.summary)) errors.push(`World ${String(world.id)} needs a name and summary.`)
    if (!continuityIds.has(String(world.continuityId))) errors.push(`World ${String(world.id)} references missing continuity ${String(world.continuityId)}.`)
    if (!['teal', 'coral', 'gold'].includes(String(world.tone))) errors.push(`World ${String(world.id)} has an invalid tone.`)
  }
  for (const character of records.characters) if (!isText(character.name)) errors.push(`Character ${String(character.id)} needs a name.`)
  for (const source of records.sources) {
    if (!isText(source.title)) errors.push(`Source ${String(source.id)} needs a title.`)
    if (!['film', 'book', 'episode', 'reference'].includes(String(source.kind))) errors.push(`Source ${String(source.id)} has an invalid kind.`)
    if (source.url !== undefined) {
      if (typeof source.url !== 'string') errors.push(`Source ${String(source.id)} has an invalid URL.`)
      else try {
        const url = new URL(source.url)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') errors.push(`Source ${String(source.id)} has an invalid URL.`)
      } catch { errors.push(`Source ${String(source.id)} has an invalid URL.`) }
    }
  }
  for (const character of records.characters) {
    if (character.description !== undefined && typeof character.description !== 'string') errors.push(`Character ${String(character.id)} has an invalid description.`)
  }
  for (const event of records.events) {
    if (!isText(event.title) || typeof event.description !== 'string') errors.push(`Event ${String(event.id)} needs a title and description.`)
    if (event.icon !== undefined && !isText(event.icon)) errors.push(`Event ${String(event.id)} has an invalid icon.`)
    if (!Array.isArray(event.characterIds)) errors.push(`Event ${String(event.id)} characterIds must be an array.`)
    else for (const id of event.characterIds) if (!isText(id) || !characterIds.has(id)) errors.push(`Event ${String(event.id)} references missing character ${String(id)}.`)
  }
  for (const occurrence of records.occurrences) {
    if (!eventIds.has(String(occurrence.eventId))) errors.push(`Occurrence ${String(occurrence.id)} references missing event ${String(occurrence.eventId)}.`)
    if (!worldIds.has(String(occurrence.worldId))) errors.push(`Occurrence ${String(occurrence.id)} references missing world ${String(occurrence.worldId)}.`)
    if (!['none', 'mild', 'major'].includes(String(occurrence.spoiler))) errors.push(`Occurrence ${String(occurrence.id)} has an invalid spoiler scope.`)
    if (occurrence.uncertainty !== undefined && typeof occurrence.uncertainty !== 'string') errors.push(`Occurrence ${String(occurrence.id)} has invalid uncertainty.`)
    if (!Array.isArray(occurrence.sourceIds)) errors.push(`Occurrence ${String(occurrence.id)} sourceIds must be an array.`)
    else for (const id of occurrence.sourceIds) if (!isText(id) || !sourceIds.has(id)) errors.push(`Occurrence ${String(occurrence.id)} references missing source ${String(id)}.`)
    validatePlacement(occurrence, occurrenceIds, errors)
  }
  for (const edge of records.edges) {
    if (!occurrenceIds.has(String(edge.fromOccurrenceId))) errors.push(`Edge ${String(edge.id)} references missing occurrence ${String(edge.fromOccurrenceId)}.`)
    if (!occurrenceIds.has(String(edge.toOccurrenceId))) errors.push(`Edge ${String(edge.id)} references missing occurrence ${String(edge.toOccurrenceId)}.`)
    if (!['leads-to', 'branches-to', 'returns-to', 'related'].includes(String(edge.kind))) errors.push(`Edge ${String(edge.id)} has an invalid kind.`)
    if (edge.fromOccurrenceId === edge.toOccurrenceId) errors.push(`Edge ${String(edge.id)} cannot point an occurrence to itself.`)
  }
  return errors
}

function validatePlacement(occurrence: RecordValue, occurrenceIds: Set<string>, errors: string[]) {
  const placement = occurrence.placement
  const prefix = `Occurrence ${String(occurrence.id)}`
  if (!isRecord(placement) || !isText(placement.label)) { errors.push(`${prefix} has an invalid date placement.`); return }
  if (placement.kind === 'exact') {
    if (!isText(placement.value)) errors.push(`${prefix} needs a non-empty exact date value.`)
  } else if (placement.kind === 'range') {
    if (placement.start !== undefined && !isText(placement.start)) errors.push(`${prefix} has an invalid range start.`)
    if (placement.end !== undefined && !isText(placement.end)) errors.push(`${prefix} has an invalid range end.`)
    if (placement.start === undefined && placement.end === undefined) errors.push(`${prefix} needs at least one range bound.`)
  } else if (placement.kind === 'relative') {
    if (placement.after === undefined && placement.before === undefined) errors.push(`${prefix} needs a relative occurrence reference.`)
    for (const key of ['after', 'before'] as const) {
      const reference = placement[key]
      if (reference !== undefined && (!isText(reference) || !occurrenceIds.has(reference))) errors.push(`${prefix} references missing occurrence ${String(reference)} in ${key}.`)
      if (reference === occurrence.id) errors.push(`${prefix} cannot be relative to itself.`)
    }
  } else if (placement.kind === 'unknown') {
    return
  } else if (placement.kind === 'disputed') {
    if (!Array.isArray(placement.alternatives) || placement.alternatives.length === 0 || placement.alternatives.some((item) => !isText(item))) errors.push(`${prefix} needs non-empty disputed date alternatives.`)
  } else errors.push(`${prefix} has an invalid date placement kind.`)
}

export type EdgeKind = Edge['kind']
export const edgeKinds: EdgeKind[] = ['leads-to', 'branches-to', 'returns-to', 'related']
export const edgeLabels: Record<EdgeKind, string> = { 'leads-to': 'Leads to', 'branches-to': 'Branches to', 'returns-to': 'Returns to', related: 'Related to' }
