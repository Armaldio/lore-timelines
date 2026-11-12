import test from 'node:test'
import assert from 'node:assert/strict'
import { axisExtent, computeLayout, edgePath, fitScale, xOfTime, timeOfX, PAD_X } from '../src/layout.ts'
import { resolveTimes } from '../src/time.ts'
import { universes } from '../src/data/universes.ts'

const scales = (u: (typeof universes)[number]) => { const f = fitScale(u, 1100); return [f, f * 4, f * 40, f * 400] }

test('every universe lays out without overlapping cards in a lane, at every scale', () => {
  for (const universe of universes) {
    for (const px of scales(universe)) {
      const layout = computeLayout(universe, px)
      const nodes = Object.values(layout.nodes)
      assert.equal(nodes.length, universe.occurrences.length, universe.title)
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!, b = nodes[j]!
        if (a.laneIndex !== b.laneIndex) continue
        const overlapX = a.x < b.x + b.w && b.x < a.x + a.w, overlapY = a.y < b.y + b.h && b.y < a.y + a.h
        assert.ok(!(overlapX && overlapY), `${universe.title}: ${a.id} overlaps ${b.id} at ${px.toFixed(1)} px/yr`)
      }
      for (const lane of layout.lanes) assert.ok(lane.height > 0)
      for (const edge of universe.edges) assert.ok(edgePath(layout, edge), `${universe.title} ${edge.id}`)
    }
  }
})

test('horizontal position is real time: order and spacing follow the dates', () => {
  for (const universe of universes) {
    const times = resolveTimes(universe)
    const layout = computeLayout(universe, fitScale(universe, 1100) * 3)
    const dated = universe.occurrences.filter((o) => times[o.id])
    assert.ok(dated.length >= universe.occurrences.length - 8, `${universe.title}: too many undated occurrences`)
    for (const a of dated) for (const b of dated) {
      if (times[a.id]!.start < times[b.id]!.start) assert.ok(layout.nodes[a.id]!.x < layout.nodes[b.id]!.x, `${universe.title}: ${a.id} should be left of ${b.id}`)
      assert.ok(Math.abs(layout.nodes[a.id]!.x - xOfTime(layout, times[a.id]!.start)) < 1e-6)
    }
    for (const o of universe.occurrences.filter((x) => !times[x.id])) assert.ok(layout.nodes[o.id]!.undated && layout.nodes[o.id]!.x > layout.tMax * 0 + layout.width * 0 + PAD_X, o.id)
  }
})

test('a long pause in time is a long gap on screen (Back to the Future: 1955 → 1985 → 2015)', () => {
  const u = universes.find((x) => x.id === 'back-to-the-future')!
  const layout = computeLayout(u, 500)
  const x = (id: string) => layout.nodes[id]!.x
  const gap1 = x('bttf-o-twin-pines') - x('bttf-o-arrival-1955'), gap2 = x('bttf-f-2015') - x('bttf-o-twin-pines')
  assert.ok(Math.abs(gap1 - 30 * 500) < 0.05 * 30 * 500 && Math.abs(gap2 - 30 * 500) < 0.05 * 30 * 500, `${gap1} ${gap2}`)
  assert.ok(Math.abs(timeOfX(layout, x('bttf-f-2015')) - 2015.8027) < 0.001)
})

test('zooming in separates events that overlapped, so lanes get shorter', () => {
  const u = universes.find((x) => x.id === 'dark-netflix')!
  const f = fitScale(u, 1100)
  const rows = (px: number) => computeLayout(u, px).lanes.reduce((n, l) => n + l.rows, 0)
  assert.ok(rows(f) > rows(f * 400), `${rows(f)} vs ${rows(f * 400)}`)
})

test('layout is deterministic and independent of anything but universe and scale', () => {
  const u = universes.find((x) => x.id === 'donnie-darko')!
  assert.deepEqual(computeLayout(u, 5000), computeLayout(u, 5000))
  const { tMin, tMax } = axisExtent(u)
  assert.ok(tMax - tMin > 0.05 && tMax - tMin < 0.2, 'Donnie Darko spans about a month')
})
