import test from 'node:test'
import assert from 'node:assert/strict'
import { computeColumns, computeLayout, edgePath, CARD_W, COL_GAP } from '../src/layout.ts'
import { universes } from '../src/data/universes.ts'

test('every universe lays out with unique card slots, ordered lanes and valid edge paths', () => {
  for (const universe of universes) {
    const cols = computeColumns(universe)
    const layout = computeLayout(universe)
    const slots = Object.values(layout.nodes).map((n) => `${n.laneIndex}:${n.col}`)
    assert.equal(new Set(slots).size, slots.length, `${universe.title}: two cards share a slot`)
    for (const world of universe.worlds) {
      const lane = universe.occurrences.filter((o) => o.worldId === world.id).map((o) => cols[o.id]!)
      assert.deepEqual(lane, [...lane].sort((a, b) => a - b), `${universe.title}/${world.id}: declared order must stay left-to-right`)
    }
    const laneOf = new Map(universe.occurrences.map((o) => [o.id, o.worldId]))
    for (const edge of universe.edges) {
      const same = laneOf.get(edge.fromOccurrenceId) === laneOf.get(edge.toOccurrenceId)
      assert.ok(cols[edge.toOccurrenceId]! >= cols[edge.fromOccurrenceId]! + (same ? 1 : 0), `${universe.title} ${edge.id}`)
      assert.ok(edgePath(layout, edge), `${universe.title} ${edge.id}`)
    }
  }
})

test('layout is deterministic and uses one fixed card pitch', () => {
  const u = universes.find((item) => item.id === 'donnie-darko')!
  const a = computeLayout(u), b = computeLayout(u)
  assert.deepEqual(a, b)
  const lane = u.occurrences.filter((o) => o.worldId === u.worlds[0]!.id)
  assert.ok(lane.length >= 2)
  const [first, second] = [a.nodes[lane[0]!.id]!, a.nodes[lane[1]!.id]!]
  assert.equal((second.x - first.x) % (CARD_W + COL_GAP), 0)
})
