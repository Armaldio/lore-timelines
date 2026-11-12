import test from 'node:test'
import assert from 'node:assert/strict'
import { validateUniverse, type Universe } from '../src/domain.ts'
import { universes } from '../src/data/universes.ts'

test('all starter universes have valid entity and occurrence references', () => {
  for (const universe of universes) assert.deepEqual(validateUniverse(universe), [], universe.title)
})

test('Dark models one event with occurrences in multiple worlds', () => {
  const dark = universes.find((item) => item.id === 'dark-netflix')!
  const occurrences = dark.occurrences.filter((item) => item.eventId === 'dark-crossing')
  assert.equal(occurrences.length, 2)
  assert.deepEqual(new Set(occurrences.map((item) => item.worldId)), new Set(['dark-2019', 'dark-1986']))
  assert.ok(dark.edges.some((edge) => edge.kind === 'branches-to' && edge.fromOccurrenceId === occurrences[0]!.id && edge.toOccurrenceId === occurrences[1]!.id))
})

test('rejects broken occurrence, source, character, continuity, and graph references', () => {
  const universe = structuredClone(universes.find((item) => item.id === 'dark-netflix')!) as Universe
  universe.worlds[0]!.continuityId = 'missing-continuity'
  universe.events[0]!.characterIds.push('missing-character')
  universe.occurrences[0]!.eventId = 'missing-event'
  universe.occurrences[0]!.worldId = 'missing-world'
  universe.occurrences[0]!.sourceIds.push('missing-source')
  universe.edges[0]!.fromOccurrenceId = 'missing-occurrence'
  const errors = validateUniverse(universe)
  for (const expected of ['missing continuity', 'missing character', 'missing event', 'missing world', 'missing source', 'missing occurrence']) {
    assert.ok(errors.some((error) => error.includes(expected)), expected)
  }
})

test('rejects missing relative occurrence targets', () => {
  const universe = structuredClone(universes.find((item) => item.id === 'donnie-darko')!) as Universe
  universe.occurrences[0]!.placement = { kind: 'relative', label: 'After an event', after: 'does-not-exist' }
  const errors = validateUniverse(universe)
  assert.ok(errors.some((error) => error.includes('references missing occurrence does-not-exist in after')))
})

test('rejects malformed range bounds and disputed alternatives', () => {
  const universe = structuredClone(universes.find((item) => item.id === 'donnie-darko')!) as Universe
  universe.occurrences[0]!.placement = { kind: 'range', label: 'Bad range', start: 42 as unknown as string }
  universe.occurrences[1]!.placement = { kind: 'disputed', label: 'Bad alternatives', alternatives: [null, 42] as unknown as string[] }
  const errors = validateUniverse(universe)
  assert.ok(errors.some((error) => error.includes('invalid range start')))
  assert.ok(errors.some((error) => error.includes('non-empty disputed date alternatives')))
})

test('rejects duplicate IDs and malformed nested records without throwing', () => {
  const duplicate = structuredClone(universes.find((item) => item.id === 'dark-netflix')!) as Universe
  duplicate.events[1]!.id = duplicate.events[0]!.id
  assert.ok(validateUniverse(duplicate).some((error) => error.includes('Duplicate id')))
  const malformed = { ...duplicate, events: [null] } as unknown
  assert.ok(validateUniverse(malformed).some((error) => error.includes('stable, non-empty id')))
})

test('rejects a malformed event icon', () => {
  const universe = structuredClone(universes.find((item) => item.id === 'donnie-darko')!) as Universe
  universe.events[0]!.icon = 42 as unknown as string
  assert.ok(validateUniverse(universe).some((error) => error.includes('invalid icon')))
})
