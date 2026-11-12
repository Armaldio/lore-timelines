import test from 'node:test'
import assert from 'node:assert/strict'
import { universes } from '../src/data/universes.ts'
import { buildStoryGraph, neighbours } from '../src/graph.ts'
import { formatRoute, parseRoute } from '../src/router.ts'
import { isHidden, loadSpoilerLevel, saveSpoilerLevel, searchOccurrences, visibleOccurrences } from '../src/spoilers.ts'

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

test('spoiler levels hide exactly what they promise', () => {
  assert.equal(isHidden('all', 'major'), false)
  assert.equal(isHidden('mild', 'major'), true)
  assert.equal(isHidden('mild', 'mild'), false)
  assert.equal(isHidden('none', 'mild'), true)
  assert.equal(isHidden('none', 'none'), false)
})

test('spoiler level persists per universe and defaults to hiding major spoilers', () => {
  const store = memory()
  assert.equal(loadSpoilerLevel('dark-netflix', store), 'mild')
  saveSpoilerLevel('dark-netflix', 'all', store)
  assert.equal(loadSpoilerLevel('dark-netflix', store), 'all')
  assert.equal(loadSpoilerLevel('star-wars', store), 'mild')
})

test('search never returns, and never matches text of, hidden occurrences', () => {
  for (const universe of universes) {
    for (const level of ['mild', 'none'] as const) {
      const hidden = universe.occurrences.filter((o) => isHidden(level, o.spoiler))
      for (const o of hidden) {
        const title = universe.events.find((e) => e.id === o.eventId)!.title
        const found = searchOccurrences(universe, title, level)
        assert.ok(!found.some((f) => f.id === o.id), `${universe.title}: "${title}" leaked at level ${level}`)
      }
    }
    const first = universe.occurrences.find((o) => !isHidden('all', o.spoiler))!
    const title = universe.events.find((e) => e.id === first.eventId)!.title
    assert.ok(searchOccurrences(universe, title, 'all').some((f) => f.id === first.id))
    assert.deepEqual(searchOccurrences(universe, '   ', 'all'), [])
  }
})

test('graph is derived from participation and edges, and honours spoiler level', () => {
  for (const universe of universes) {
    const all = buildStoryGraph(universe, 'all')
    assert.ok(all.characters.length > 0 && all.nodes.length === universe.occurrences.length, universe.title)
    for (const c of all.characters) for (const id of c.occurrenceIds) {
      const o = universe.occurrences.find((x) => x.id === id)!
      assert.ok(universe.events.find((e) => e.id === o.eventId)!.characterIds.includes(c.id))
    }
    const safe = buildStoryGraph(universe, 'none')
    assert.equal(safe.nodes.length, visibleOccurrences(universe, 'none').length)
    const ids = new Set(safe.nodes.map((n) => n.occurrenceId))
    assert.ok(safe.edges.every((e) => ids.has(e.fromOccurrenceId) && ids.has(e.toOccurrenceId)))
  }
})

test('graph relation and character filters narrow the result', () => {
  const dd = universes.find((u) => u.id === 'donnie-darko')!
  const everything = buildStoryGraph(dd, 'all')
  const onlyBranch = buildStoryGraph(dd, 'all', { kinds: ['branches-to'], characterIds: [] })
  assert.ok(onlyBranch.edges.length > 0 && onlyBranch.edges.every((e) => e.kind === 'branches-to'))
  assert.ok(onlyBranch.edges.length < everything.edges.length)
  const who = everything.characters[0]!
  const one = buildStoryGraph(dd, 'all', { kinds: ['leads-to'], characterIds: [who.id] })
  assert.deepEqual(one.characters.map((c) => c.id), [who.id])
  assert.ok(one.nodes.every((n) => n.characterIds.includes(who.id)))
})

test('neighbours follows only declared edges', () => {
  const dd = universes.find((u) => u.id === 'donnie-darko')!
  const g = buildStoryGraph(dd, 'all')
  const e = g.edges[0]!
  assert.ok(neighbours(g, e.fromOccurrenceId).includes(e.toOccurrenceId))
})

test('routes round-trip and unknown hashes land on the landing page', () => {
  assert.deepEqual(parseRoute(''), { universeId: undefined, view: 'timeline', occurrenceId: undefined })
  const route = { universeId: 'star-wars', view: 'graph' as const, occurrenceId: 'x y' }
  assert.deepEqual(parseRoute(formatRoute(route)), route)
  assert.equal(formatRoute({ view: 'timeline' }), '#/')
})
