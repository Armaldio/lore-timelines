import test from 'node:test'
import assert from 'node:assert/strict'
import { validateUniverse } from '../src/domain.ts'
import { universes } from '../src/data/universes.ts'

test('all starter universes use valid cross references', () => {
  for (const universe of universes) assert.deepEqual(validateUniverse(universe), [], universe.title)
})

test('rejects duplicate IDs and broken event and graph references', () => {
  const universe = {
    id: 'fixture', title: 'Fixture',
    worlds: [{ id: 'world', name: 'World' }, { id: 'world', name: 'Duplicate' }],
    characters: [], sources: [],
    events: [{ id: 'event', title: 'An event', description: '', placement: { kind: 'exact', label: 'Unknown' }, worldId: 'missing', spoiler: 'none', sourceIds: ['missing-source'], characterIds: ['missing-character'] }],
    edges: [{ id: 'edge', fromEventId: 'event', toEventId: 'missing-event', kind: 'returns-to' }],
  }
  const errors = validateUniverse(universe)
  assert.ok(errors.some((error) => error.includes('Duplicate id: world')))
  assert.ok(errors.some((error) => error.includes('missing world')))
  assert.ok(errors.some((error) => error.includes('missing source')))
  assert.ok(errors.some((error) => error.includes('missing character')))
  assert.ok(errors.some((error) => error.includes('missing event')))
  assert.ok(errors.some((error) => error.includes('exact date value')))
})

test('reports malformed nested records without throwing', () => {
  const errors = validateUniverse({ worlds: [null], characters: [], sources: [], events: [null], edges: [null] })
  assert.ok(errors.some((error) => error.includes('stable, non-empty id')))
})
