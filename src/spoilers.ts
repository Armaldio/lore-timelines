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

const key = (universeId: string) => `lore-timelines:spoilers:${universeId}`
type Store = Pick<Storage, 'getItem' | 'setItem'>
const sessionStore = (): Store | undefined => { try { return globalThis.sessionStorage } catch { return undefined } }

export function loadSpoilerLevel(universeId: string, store: Store | undefined = sessionStore()): SpoilerLevel {
  const value = store?.getItem(key(universeId))
  return value === 'all' || value === 'mild' || value === 'none' ? value : defaultSpoilerLevel
}
export function saveSpoilerLevel(universeId: string, level: SpoilerLevel, store: Store | undefined = sessionStore()) {
  try { store?.setItem(key(universeId), level) } catch { /* storage unavailable: the choice just lasts for this page view */ }
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
    return [event.title, event.description, o.placement.label, world, ...people].join(' ').toLowerCase().includes(needle)
  })
}
