import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTime, pickTicks, resolveTimes, STEP } from '../src/time.ts'
import { universes } from '../src/data/universes.ts'

test('dates parse to fractional years on a gregorian or galactic calendar', () => {
  assert.equal(parseTime('1985'), 1985)
  assert.ok(Math.abs(parseTime('1985-07-02')! - 1985.5) < 0.01)
  assert.equal(parseTime('-0019', 'galactic'), -19)
  assert.equal(parseTime('0004', 'galactic'), 4)
  assert.equal(parseTime('After the Snap'), undefined)
})

test('placements resolve by stated date, inferred when, story-order derivation, or stay undated', () => {
  const all = universes.flatMap((u) => { const t = resolveTimes(u); return u.occurrences.map((o) => ({ u, o, r: t[o.id], t })) })
  const basis = (b: string) => all.filter((x) => x.r?.basis === b)
  assert.ok(basis('stated').length > 40, 'most occurrences carry a stated date')
  assert.ok(basis('inferred').length >= 1, 'some placements are inferred through `when`')
  for (const x of basis('inferred')) assert.ok(x.o.when, `${x.o.id} is inferred but has no when`)
  for (const x of basis('derived')) {
    assert.equal(x.o.placement.kind, 'relative', x.o.id)
    const p = x.o.placement as { after?: string; before?: string }
    const anchor = x.t[(p.after ?? p.before)!]!
    assert.ok(Math.abs(x.r!.start - (p.after ? anchor.end + STEP : anchor.start - STEP)) < 1e-9, x.o.id)
  }
  for (const x of all.filter((y) => !y.r)) assert.ok(!x.o.when && x.o.placement.kind !== 'exact', `${x.o.id} should not be undated`)
})

test('ticks refine as the scale grows, never crowd, and stay inside the window', () => {
  const units: string[] = []
  for (const px of [3, 60, 100, 1200, 50_000, 3_000_000]) {
    const t0 = 1988.7, t1 = t0 + 1100 / px
    const set = pickTicks(t0, t1, px, 'gregorian')
    units.push(set.unitName)
    assert.ok(set.labelled.length >= 1, `no labelled tick at ${px}`)
    for (const tick of set.labelled) assert.ok(tick.t >= t0 && tick.t <= t1)
    for (let i = 1; i < set.labelled.length; i++) assert.ok((set.labelled[i]!.t - set.labelled[i - 1]!.t) * px >= 60, `ticks crowd at ${px}: ${units.at(-1)}`)
  }
  assert.deepEqual(units.slice(0, 1), ['50 years'])
  assert.ok(units.includes('year') && units.includes('month') && units.includes('day') && units.includes('hour'), units.join())
})

test('galactic ticks read BBY / ABY and never go below one year', () => {
  const set = pickTicks(-20, 6, 300, 'galactic')
  const labels = set.labelled.map((t) => t.label)
  assert.ok(labels.some((l) => /BBY/.test(l)) && labels.some((l) => /ABY/.test(l)), labels.join())
  assert.ok(pickTicks(-2, 2, 100_000, 'galactic').unitName.includes('year'))
})

test('the ruler is never blank, even when no tick boundary is in view', () => {
  const set = pickTicks(1988.752, 1988.752 + 0.01, 1000, 'gregorian')
  assert.equal(set.labelled.length, 1)
  assert.match(set.labelled[0]!.label, /Oct 2, 1988/)
})
