import test from 'node:test'
import assert from 'node:assert/strict'
import { validateUniverse } from '../src/domain.ts'
import { universes } from '../src/data/universes.ts'
import { computeLayout, isLoopClosure } from '../src/layout.ts'

const byId = (id: string) => universes.find((u) => u.id === id)!
const kindsOf = (id: string) => new Set(byId(id).edges.map((e) => e.kind))

test('the five required universes are present', () => {
  assert.deepEqual(universes.map((u) => u.id), ['dark-netflix', 'star-wars', 'donnie-darko', 'back-to-the-future', 'marvel-cinematic-universe'])
})

for (const universe of universes) {
  test(`${universe.title}: curated dataset is valid, sourced, honest and connected`, () => {
    assert.deepEqual(validateUniverse(universe), [])
    assert.ok(universe.events.length >= 15 && universe.events.length <= 25, `${universe.events.length} events`)
    for (const o of universe.occurrences) {
      assert.ok(o.sourceIds.length > 0, `${o.id} has no source`)
      if (o.placement.kind !== 'exact') assert.ok(o.uncertainty && o.uncertainty.trim().length > 0, `${o.id} is ${o.placement.kind} but explains no uncertainty`)
    }
    const used = new Set(universe.edges.flatMap((e) => [e.fromOccurrenceId, e.toOccurrenceId]))
    for (const o of universe.occurrences) assert.ok(used.has(o.id), `${o.id} is not connected by any edge`)
    for (const e of universe.events) assert.ok(universe.occurrences.some((o) => o.eventId === e.id), `${e.id} has no occurrence`)
    const named = universe.events.filter((e) => e.characterIds.length > 0).length
    assert.ok(named >= universe.events.length - 1, 'at most one event may lack named participants')
  })
}

test('Dark: an event recurs across worlds and worlds are linked explicitly', () => {
  const dark = byId('dark-netflix')
  const recurring = dark.events.filter((e) => new Set(dark.occurrences.filter((o) => o.eventId === e.id).map((o) => o.worldId)).size > 1)
  assert.ok(recurring.length >= 1)
  assert.ok(dark.worlds.length >= 3)
  assert.ok(kindsOf('dark-netflix').has('branches-to') || kindsOf('dark-netflix').has('related'))
})

test('Star Wars: one lane per era with BBY/ABY labels on exact dates', () => {
  const sw = byId('star-wars')
  assert.ok(sw.worlds.length >= 3)
  for (const o of sw.occurrences.filter((x) => x.placement.kind === 'exact')) assert.match(o.placement.label, /BBY|ABY/, o.id)
})

test('Donnie Darko: Primary and Tangent universes are linked by a branch and a return', () => {
  const ids = byId('donnie-darko').worlds.map((w) => w.id)
  assert.ok(ids.includes('primary') && ids.includes('tangent'))
  assert.ok(kindsOf('donnie-darko').has('branches-to') && kindsOf('donnie-darko').has('returns-to'))
})

test('Donnie Darko: the loop is explicit — the collapse returns to the night the tangent began', () => {
  const dd = byId('donnie-darko')
  const layout = computeLayout(dd)
  const closing = dd.edges.filter((e) => isLoopClosure(layout, e))
  assert.equal(closing.length, 1)
  const [edge] = closing
  assert.equal(edge!.toOccurrenceId, 'donnie-death-primary')
  const start = layout.nodes['frank-wakes-donnie-primary']!, death = layout.nodes['donnie-death-primary']!, collapse = layout.nodes[edge!.fromOccurrenceId]!
  assert.ok(death.col <= start.col + 1 && death.col < collapse.col)
})

test('Back to the Future: key years appear and histories branch and converge', () => {
  const bttf = byId('back-to-the-future')
  const labels = bttf.occurrences.map((o) => o.placement.label).join(' ')
  for (const year of ['1885', '1955', '1985', '2015']) assert.ok(labels.includes(year), year)
  assert.ok(bttf.worlds.length >= 4)
  assert.ok(kindsOf('back-to-the-future').has('branches-to') && kindsOf('back-to-the-future').has('returns-to'))
})

test('MCU: debated dates stay disputed and variants are separate lanes', () => {
  const mcu = byId('marvel-cinematic-universe')
  assert.ok(mcu.occurrences.some((o) => o.placement.kind === 'disputed'))
  assert.ok(mcu.occurrences.some((o) => o.placement.kind === 'unknown'))
  assert.ok(mcu.worlds.length >= 3)
  assert.ok(kindsOf('marvel-cinematic-universe').has('related') || kindsOf('marvel-cinematic-universe').has('branches-to'))
})
