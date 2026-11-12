import test from 'node:test'
import assert from 'node:assert/strict'
import { computeColumns, computeLayout, edgePath, CARD_W, COL_GAP } from '../src/layout.ts'
import { universes } from '../src/data/universes.ts'

const byId = (id: string) => universes.find((item) => item.id === id)!

test('every universe lays out with unique card slots per lane', () => {
  for (const universe of universes) {
    const layout = computeLayout(universe)
    const slots = Object.values(layout.nodes).map((n) => `${n.laneIndex}:${n.col}`)
    assert.equal(new Set(slots).size, slots.length, universe.title)
    assert.equal(layout.lanes.length, universe.worlds.length)
    for (const edge of universe.edges) assert.ok(edgePath(layout, edge), `${universe.title} ${edge.id}`)
  }
})

test('Donnie Darko: tangent branch starts under its source, return lands at or after the collapse', () => {
  const cols = computeColumns(byId('donnie-darko'))
  assert.equal(cols['school-fire-tangent'], cols['grandma-death-primary'])
  assert.ok(cols['restored-primary']! >= cols['collapse-tangent']!)
  assert.ok(cols['engine-crash-primary']! < cols['frank-warning-primary']! && cols['frank-warning-primary']! < cols['grandma-death-primary']!)
})

test('Star Wars: a single lane advances left to right in declared order', () => {
  const cols = computeColumns(byId('star-wars'))
  assert.ok(cols['naboo-occ']! < cols['death-star-occ']! && cols['death-star-occ']! < cols['exegol-occ']!)
})

test('Dark: one event keeps one occurrence per lane at the same column', () => {
  const cols = computeColumns(byId('dark-netflix'))
  assert.equal(cols['dark-crossing-2019'], cols['dark-crossing-1986'])
})

test('layout is deterministic and uses one fixed card pitch', () => {
  const a = computeLayout(byId('donnie-darko')), b = computeLayout(byId('donnie-darko'))
  assert.deepEqual(a, b)
  assert.equal(a.nodes['frank-warning-primary']!.x - a.nodes['engine-crash-primary']!.x, CARD_W + COL_GAP)
})
