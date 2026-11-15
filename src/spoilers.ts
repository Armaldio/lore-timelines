import type { Occurrence, Universe } from './domain'

export type SpoilerLevel = 'all' | 'mild' | 'none'
export const spoilerLevels: { value: SpoilerLevel; label: string }[] = [
  { value: 'none', label: 'No spoilers' },
  { value: 'mild', label: 'Hide major spoilers' },
  { value: 'all', label: 'Show all content' },
]
/** Deliberate default: major plot twists stay hidden until the visitor opts in. */
export const defaultSpoilerLevel: SpoilerLevel = 'mild'

export const isHidden = (level: SpoilerLevel, spoiler: Occurrence['spoiler']) =>
  (level === 'mild' && spoiler === 'major') || (level === 'none' && spoiler !== 'none')

/** One setting for the whole app, kept across reloads and shared by every universe. */
export const SPOILER_KEY = 'lore-timelines:spoiler-level'
type Store = Pick<Storage, 'getItem' | 'setItem'>
const localStore = (): Store | undefined => { try { return globalThis.localStorage } catch { return undefined } }

export function loadSpoilerLevel(store: Store | undefined = localStore()): SpoilerLevel {
  let value: string | null | undefined
  try { value = store?.getItem(SPOILER_KEY) } catch { value = undefined }
  return value === 'all' || value === 'mild' || value === 'none' ? value : defaultSpoilerLevel
}
export function saveSpoilerLevel(level: SpoilerLevel, store: Store | undefined = localStore()) {
  try { store?.setItem(SPOILER_KEY, level) } catch { /* storage unavailable: the choice lasts for this page view only */ }
}

export const visibleOccurrences = (universe: Universe, level: SpoilerLevel) => universe.occurrences.filter((o) => !isHidden(level, o.spoiler))

/** Text search over spoiler-visible occurrences only, so hidden events can never leak through results. */
export function searchOccurrences(universe: Universe, query: string, level: SpoilerLevel): Occurrence[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return visibleOccurrences(universe, level).filter((o) => {
    const event = universe.events.find((e) => e.id === o.eventId)
    if (!event) return false
    const people = universe.characters.filter((c) => event.characterIds.includes(c.id)).map((c) => c.name)
    const world = universe.worlds.find((w) => w.id === o.worldId)?.name ?? ''
    return [event.title, ...(event.aliases ?? []), event.description, o.placement.label, world, ...people].join(' ').toLowerCase().includes(needle)
  })
}
