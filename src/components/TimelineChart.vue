<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Occurrence, Universe } from '../domain'
import { axisExtent, BOTTOM_INSET, computeLayout, fitScale, isLoopClosure, planEdges, planMidpoint, planPath, MAX_PX_PER_YEAR, PAD_X, RULER_H, timeOfX, TOP_INSET, xOfTime } from '../layout'
import { isHidden, type SpoilerLevel } from '../spoilers'
import { iconPath } from '../icons'
import { formatTime, pickTicks, resolveTimes } from '../time'
import { touchUi } from '../state'

const props = defineProps<{ universe: Universe; level: SpoilerLevel; selectedId: string; query: string }>()
const emit = defineEmits<{ select: [id: string] }>()

// ---- viewport: the stage is a window onto an unbounded time axis. Nothing is scrolled natively, so zoom has no
// canvas-size limit; only what is on screen is rendered, in viewport coordinates.
const stage = ref<HTMLElement>()
const size = ref({ w: 1200, h: 800 })
const px = ref(1) // pixels per year
const vx = ref(0) // canvas x at the stage's left edge
const vy = ref(0) // canvas y at the top of the area below the bars
const autoFit = ref(true)

const calendar = computed(() => props.universe.axis?.calendar ?? 'gregorian')
const extent = computed(() => axisExtent(props.universe))
const fit = computed(() => fitScale(props.universe, size.value.w, touchUi.value))
const MIN_MUL = 0.05
// On touch screens spoiler-hidden cards take no space (they are counted in the lane header instead).
const excluded = computed(() => (touchUi.value ? new Set(props.universe.occurrences.filter((o) => isHidden(props.level, o.spoiler)).map((o) => o.id)) : undefined))
const layout = computed(() => computeLayout(props.universe, px.value, { touch: touchUi.value, exclude: excluded.value }))
const zoomMul = computed(() => px.value / fit.value)
// On touch screens a navigation strip (previous / overview / next) sits above the controls.
const bottomInset = computed(() => (touchUi.value ? BOTTOM_INSET + 56 : BOTTOM_INSET))
const innerH = computed(() => Math.max(100, size.value.h - TOP_INSET - bottomInset.value))

function clampView() {
  const l = layout.value
  const minX = -size.value.w * 0.6, maxX = Math.max(minX, l.width - size.value.w * 0.4)
  vx.value = Math.min(maxX, Math.max(minX, vx.value))
  vy.value = Math.min(Math.max(0, l.height - innerH.value), Math.max(0, vy.value))
}
function setFit() { px.value = fit.value; vx.value = 0; vy.value = 0; autoFit.value = true; clampView() }
function zoomAt(factor: number, cx = size.value.w / 2) {
  const t = timeOfX(layout.value, vx.value + cx)
  px.value = Math.min(MAX_PX_PER_YEAR, Math.max(fit.value * MIN_MUL, px.value * factor))
  vx.value = PAD_X + (t - extent.value.tMin) * px.value - cx
  autoFit.value = false
  clampView()
}
// Buttons and keys zoom toward the selected event when it is on screen, otherwise toward the middle.
function buttonAnchor() {
  const n = layout.value.nodes[props.selectedId]
  if (!n) return undefined
  const x = n.x + n.w / 2 - vx.value
  return x > 0 && x < size.value.w ? x : undefined
}
const zoomIn = () => zoomAt(1.6, buttonAnchor())
const zoomOut = () => zoomAt(1 / 1.6, buttonAnchor())

let anim = 0
function glide(toX: number, toY: number) {
  cancelAnimationFrame(anim)
  const fromX = vx.value, fromY = vy.value
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { vx.value = toX; vy.value = toY; clampView(); return }
  const start = performance.now()
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / 280), e = 1 - (1 - k) ** 3
    vx.value = fromX + (toX - fromX) * e; vy.value = fromY + (toY - fromY) * e
    clampView()
    if (k < 1) anim = requestAnimationFrame(step)
  }
  anim = requestAnimationFrame(step)
}
function reveal(id: string) {
  const n = layout.value.nodes[id]
  if (!n) return
  const left = n.x - vx.value, top = n.y - vy.value
  const insideX = left > 70 && left + n.w < size.value.w - 40
  const insideY = top > RULER_H && top + n.h < innerH.value
  if (insideX && insideY) return
  glide(insideX ? vx.value : n.x - size.value.w / 2 + n.w / 2, insideY ? vy.value : n.y - innerH.value / 2 + n.h / 2)
}
watch(() => props.selectedId, (id) => reveal(id), { flush: 'post' })
watch(() => props.universe.id, () => { mutedLanes.value = new Set(); setFit() })
watch(fit, () => { if (autoFit.value) setFit() })
watch(size, () => clampView())

// ---- ticks (live: unit follows the scale; only the visible window is generated)
const ticks = computed(() => {
  const l = layout.value
  const t0 = Math.max(l.tMin, timeOfX(l, vx.value - 120)), t1 = Math.min(l.tMax, timeOfX(l, vx.value + size.value.w + 120))
  return t1 > t0 ? pickTicks(t0, t1, l.px, calendar.value) : pickTicks(l.tMin, l.tMin + 1e-6, l.px, calendar.value)
})
const sx = (t: number) => xOfTime(layout.value, t) - vx.value
const cursorT = ref<number | undefined>()
const guideX = ref<number | undefined>()

// ---- lanes, filters, edges
const mutedLanes = ref<Set<string>>(new Set())
function toggleLane(id: string) {
  const next = new Set(mutedLanes.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  mutedLanes.value = next
}
const eventOf = (o: Occurrence) => props.universe.events.find((e) => e.id === o.eventId)!
const hidden = (o: Occurrence) => isHidden(props.level, o.spoiler)
const toneOf = (worldId: string) => props.universe.worlds.find((w) => w.id === worldId)?.tone ?? 'teal'
const matches = (o: Occurrence) => {
  const needle = props.query.trim().toLowerCase()
  return !needle || `${eventOf(o).title} ${(eventOf(o).aliases ?? []).join(' ')} ${eventOf(o).description} ${o.placement.label}`.toLowerCase().includes(needle)
}
const dimmed = (o: Occurrence) => !matches(o) || mutedLanes.value.has(o.worldId)
const marker = (o: Occurrence) => ({ exact: '', range: '≈', relative: '→', unknown: '?', disputed: '≠' })[o.placement.kind]
const markerText = (o: Occurrence) => ({ exact: '', range: 'Date range', relative: 'Relative position', unknown: 'Date not established', disputed: 'Disputed date' })[o.placement.kind]
const basisText = { stated: '', inferred: 'Position on the axis is inferred', derived: 'Position derived from story order', undated: 'No established date' } as const
const visibleIds = computed(() => new Set(props.universe.occurrences.filter((o) => !hidden(o)).map((o) => o.id)))
const focusId = ref<string>()
const emphasised = computed(() => focusId.value ?? props.selectedId)
const showConnections = ref(true)
const legendOpen = ref(false)
const edgeWord: Record<string, string> = { 'leads-to': 'leads to', 'branches-to': 'branch', 'returns-to': 'return', related: 'related' }

const onScreen = (n: { x: number; w: number; y: number; h: number }) => n.x + n.w + 160 > vx.value && n.x - 160 < vx.value + size.value.w && n.y + n.h > vy.value - 40 && n.y < vy.value + innerH.value + 40
const cards = computed(() => props.universe.occurrences.filter((o) => { const n = layout.value.nodes[o.id]; return n && onScreen(n) }))
const shift = computed(() => ({ x: vx.value, y: vy.value - TOP_INSET, w: size.value.w }))
// Attachment points are planned over every connection so none of them pile onto one spot.
const plans = computed(() => planEdges(layout.value, props.universe.edges.filter((e) => visibleIds.value.has(e.fromOccurrenceId) && visibleIds.value.has(e.toOccurrenceId))))
const drawnEdges = computed(() => {
  const l = layout.value, lo = vx.value - 200, hi = vx.value + size.value.w + 200
  const out = plans.value.flatMap((plan) => {
    const { edge } = plan
    const left = Math.min(plan.x1, plan.x2) - 220, right = Math.max(plan.x1, plan.x2) + 220
    if (right < lo || left > hi) return []
    const active = edge.fromOccurrenceId === emphasised.value || edge.toOccurrenceId === emphasised.value
    const loop = isLoopClosure(l, edge)
    if (!showConnections.value && !active && !loop) return []
    return [{ edge, d: planPath(plan, shift.value), loop, mid: planMidpoint(plan, shift.value), active }]
  })
  // The focused card's connections are drawn last, so they sit on top of everything else.
  return out.sort((p, q) => Number(p.active) - Number(q.active))
})
const countIn = (worldId: string) => props.universe.occurrences.filter((o) => o.worldId === worldId && !hidden(o)).length
const totalIn = (worldId: string) => props.universe.occurrences.filter((o) => o.worldId === worldId).length
const cardStyle = (id: string) => { const n = layout.value.nodes[id]!; return { left: `${n.x - vx.value}px`, top: `${TOP_INSET + n.y - vy.value}px`, width: `${n.w}px`, height: `${n.h}px` } }
const spanStyle = (id: string) => {
  const n = layout.value.nodes[id]!
  const left = Math.max(n.x - vx.value, -50), right = Math.min(n.x - vx.value + n.spanW, size.value.w + 50)
  return { left: `${left}px`, top: `${TOP_INSET + n.y + n.h + 3 - vy.value}px`, width: `${Math.max(0, right - left)}px` }
}
const laneTop = (i: number) => TOP_INSET + layout.value.lanes[i]!.y - vy.value
const hasSpan = (id: string) => layout.value.nodes[id]!.spanW > 6 && onScreen(layout.value.nodes[id]!)

// ---- keyboard: arrows move between visible events by real position, +/- zoom, 0 fits everything
function onKey(event: KeyboardEvent) {
  if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomIn(); return }
  if (event.key === '-') { event.preventDefault(); zoomOut(); return }
  if (event.key === '0') { event.preventDefault(); setFit(); return }
  const here = layout.value.nodes[props.selectedId]
  if (!here) return
  let best: Occurrence | undefined
  let bestScore = Infinity
  for (const o of props.universe.occurrences) {
    if (o.id === props.selectedId || hidden(o)) continue
    const n = layout.value.nodes[o.id]!
    const dx = n.x - here.x, dy = n.y - here.y, dl = n.laneIndex - here.laneIndex
    const ok = event.key === 'ArrowRight' ? dx > 0.5 : event.key === 'ArrowLeft' ? dx < -0.5 : event.key === 'ArrowDown' ? dy > 0.5 : event.key === 'ArrowUp' ? dy < -0.5 : false
    if (!ok) continue
    const horizontal = event.key === 'ArrowRight' || event.key === 'ArrowLeft'
    const score = horizontal ? Math.abs(dx) + Math.abs(dl) * 400 + Math.abs(dy) * 0.1 : Math.abs(dy) * 1000 + Math.abs(dx)
    if (score < bestScore) { bestScore = score; best = o }
  }
  if (best) { event.preventDefault(); emit('select', best.id) }
}

// ---- pointer: drag pans (cards and text included, nothing is selectable), two fingers pinch, wheel zooms
const pointers = new Map<number, { x: number; y: number }>()
let samples: { t: number; x: number; y: number }[] = []
let lastTap: { t: number; x: number; y: number } | undefined
let gesture: { moved: boolean; startX: number; startY: number; vx: number; vy: number; dist: number; px: number } | undefined
let suppressClick = false
const dragging = ref(false)
const spread = () => { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 }
function pointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if ((e.target as HTMLElement).closest('.hud, .no-pan')) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  cancelAnimationFrame(anim)
  samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }]
  gesture = { moved: false, startX: e.clientX, startY: e.clientY, vx: vx.value, vy: vy.value, dist: spread(), px: px.value }
}
function pointerMove(e: PointerEvent) {
  const el = stage.value!
  const rect = el.getBoundingClientRect()
  if (e.pointerType === 'mouse') {
    const x = vx.value + e.clientX - rect.left
    cursorT.value = e.clientX - rect.left > 0 ? timeOfX(layout.value, x) : undefined
  }
  if (!pointers.has(e.pointerId) || !gesture) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size >= 2) {
    const d = spread()
    if (gesture.dist > 0 && d > 0) {
      gesture.moved = true; dragging.value = true
      const [a, b] = [...pointers.values()]
      const mid = ((a!.x + b!.x) / 2) - rect.left
      const factor = (gesture.px * (d / gesture.dist)) / px.value
      zoomAt(factor, mid)
    }
    return
  }
  const dx = e.clientX - gesture.startX, dy = e.clientY - gesture.startY
  if (!gesture.moved && Math.hypot(dx, dy) < 5) return
  if (!gesture.moved) { gesture.moved = true; dragging.value = true; el.setPointerCapture(e.pointerId); window.getSelection()?.removeAllRanges() }
  vx.value = gesture.vx - dx; vy.value = gesture.vy - dy
  autoFit.value = false
  clampView()
  samples.push({ t: performance.now(), x: e.clientX, y: e.clientY })
  if (samples.length > 5) samples.shift()
}
// A flick keeps gliding and slows down, as native scrolling does.
function fling() {
  const a = samples[0], b = samples[samples.length - 1]
  if (!a || !b || b.t - a.t < 8 || performance.now() - b.t > 80) return
  let ux = -(b.x - a.x) / (b.t - a.t), uy = -(b.y - a.y) / (b.t - a.t) // px per ms
  if (Math.hypot(ux, uy) < 0.25 || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  let last = performance.now()
  const step = (now: number) => {
    const dt = Math.min(32, now - last); last = now
    vx.value += ux * dt; vy.value += uy * dt
    const decay = 0.0032 * dt
    ux *= Math.max(0, 1 - decay * 1.4); uy *= Math.max(0, 1 - decay * 1.4)
    clampView()
    if (Math.hypot(ux, uy) > 0.02) anim = requestAnimationFrame(step)
  }
  anim = requestAnimationFrame(step)
}
function pointerUp(e: PointerEvent) {
  const wasSingle = pointers.size === 1
  pointers.delete(e.pointerId)
  if (gesture?.moved) suppressClick = true
  if (wasSingle && e.pointerType !== 'mouse' && e.type === 'pointerup') {
    if (gesture?.moved) fling()
    else {
      const now = performance.now()
      if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 32) {
        zoomAt(2.4, e.clientX - stage.value!.getBoundingClientRect().left); lastTap = undefined
      } else lastTap = { t: now, x: e.clientX, y: e.clientY }
    }
  }
  if (!pointers.size) { gesture = undefined; dragging.value = false } else if (gesture) { gesture.dist = spread(); gesture.px = px.value }
}
function clickCapture(e: MouseEvent) { if (suppressClick) { e.stopPropagation(); e.preventDefault() } suppressClick = false }
function leave() { cursorT.value = undefined; if (!focusId.value) guideX.value = undefined }
function wheel(e: WheelEvent) {
  if ((e.target as HTMLElement).closest('.no-pan')) return
  e.preventDefault()
  const rect = stage.value!.getBoundingClientRect()
  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { vx.value += e.deltaX || e.deltaY; autoFit.value = false; clampView(); return }
  zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), e.clientX - rect.left)
}

let observer: ResizeObserver | undefined
onMounted(() => {
  const el = stage.value!
  const measure = () => { size.value = { w: el.clientWidth || 1200, h: el.clientHeight || 800 } }
  measure()
  setFit()
  observer = new ResizeObserver(measure)
  observer.observe(el)
  el.addEventListener('wheel', wheel, { passive: false })
  requestAnimationFrame(() => reveal(props.selectedId))
})
onBeforeUnmount(() => { observer?.disconnect(); cancelAnimationFrame(anim); stage.value?.removeEventListener('wheel', wheel) })

// ---- touch navigation strip: previous / next event and an overview you can drag
const timeline = computed(() => resolveTimes(props.universe))
const stepList = computed(() => props.universe.occurrences.filter((o) => !hidden(o) && layout.value.nodes[o.id]).sort((a, b) => layout.value.nodes[a.id]!.x - layout.value.nodes[b.id]!.x || layout.value.nodes[a.id]!.y - layout.value.nodes[b.id]!.y))
const stepIndex = computed(() => stepList.value.findIndex((o) => o.id === props.selectedId))
function step(by: number) {
  const list = stepList.value
  const next = list[stepIndex.value < 0 ? (by > 0 ? 0 : list.length - 1) : stepIndex.value + by]
  if (next) { emit('select', next.id); reveal(next.id) }
}
const mapSpan = computed(() => Math.max(1e-9, extent.value.tMax - extent.value.tMin))
const mapFrac = (t: number) => Math.min(1, Math.max(0, (t - extent.value.tMin) / mapSpan.value))
const mapDots = computed(() => props.universe.occurrences.filter((o) => !hidden(o) && layout.value.nodes[o.id]).map((o) => {
  const t = timeline.value[o.id]
  const lanes = Math.max(1, props.universe.worlds.length - 1)
  return { id: o.id, left: t ? mapFrac(t.start) * 100 : 100, top: 18 + (layout.value.nodes[o.id]!.laneIndex / lanes) * 64, tone: toneOf(o.worldId), selected: o.id === props.selectedId }
}))
const mapView = computed(() => {
  const l = layout.value
  const a = mapFrac(timeOfX(l, vx.value)), b = mapFrac(timeOfX(l, vx.value + size.value.w))
  return { left: a * 100, width: Math.max((b - a) * 100, 1.5) }
})
function mapSeek(e: PointerEvent) {
  const track = e.currentTarget as HTMLElement
  const rect = track.getBoundingClientRect()
  const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const t = extent.value.tMin + f * mapSpan.value
  cancelAnimationFrame(anim)
  vx.value = xOfTime(layout.value, t) - size.value.w / 2
  autoFit.value = false
  clampView()
}
function mapDown(e: PointerEvent) { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); mapSeek(e) }
function mapMove(e: PointerEvent) { if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) mapSeek(e) }

const scaleText = computed(() => `${ticks.value.unitName} ticks`)
const cursorText = computed(() => (cursorT.value === undefined ? '' : formatTime(cursorT.value, calendar.value)))
const zoomText = computed(() => { const m = zoomMul.value; return m >= 1000 ? `×${(m / 1000).toFixed(m >= 1e4 ? 0 : 1)}k` : m >= 10 ? `×${Math.round(m)}` : m >= 0.1 ? `×${m.toFixed(1)}` : `×${m.toFixed(2)}` })
const ordered = computed(() => props.universe.occurrences.filter((o) => !hidden(o)).sort((a, b) => layout.value.nodes[a.id]!.x - layout.value.nodes[b.id]!.x))
</script>

<template>
  <div ref="stage" :class="['stage', { dragging }]" tabindex="0" role="application" :aria-label="`${universe.title} timeline on a real time axis. Drag to pan, scroll or pinch to zoom without limit, arrow keys move between events, plus and minus zoom, zero fits everything.`" @keydown="onKey" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp" @pointerleave="leave" @click.capture="clickCapture">
    <section v-for="(world, index) in universe.worlds" :key="world.id" :class="['h-lane', `tone-${world.tone}`, { muted: mutedLanes.has(world.id) }]" :style="{ top: `${laneTop(index)}px`, height: `${layout.lanes[index]!.height}px` }" :aria-label="`${world.name} timeline lane`">
      <span class="h-ring" aria-hidden="true"></span>
      <div class="h-head"><h2>{{ world.name }}</h2><p>{{ world.summary }}</p></div>
      <span class="h-count">{{ countIn(world.id) }} / {{ totalIn(world.id) }}</span>
    </section>
    <div v-for="t in ticks.labelled" :key="`g${t.t}`" class="gridline" :style="{ left: `${sx(t.t)}px`, top: `${TOP_INSET + RULER_H}px` }" aria-hidden="true"></div>
    <div v-if="layout.undatedX !== undefined" class="undated-zone" :style="{ left: `${layout.undatedX - 24 - vx}px`, top: `${TOP_INSET + RULER_H}px` }" aria-hidden="true"></div>
    <div v-if="guideX !== undefined" class="guide" :style="{ left: `${guideX - vx}px`, top: `${TOP_INSET + RULER_H}px` }" aria-hidden="true"></div>
    <svg class="h-edges" :width="size.w" :height="size.h" aria-hidden="true">
      <defs><marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1.5 L11 6 L1 10.5 Z" fill="context-stroke" /></marker></defs>
      <g v-for="item in drawnEdges" :key="item.edge.id" :class="['h-edge-group', item.edge.kind, { active: item.active, quiet: !item.active && Boolean(emphasised) }]">
        <path :d="item.d" class="h-edge-halo" />
        <path :d="item.d" :class="['h-edge', item.edge.kind, { loop: item.loop }]" marker-end="url(#arrow)"><title>{{ item.loop ? 'Loop: returns to a moment already visited' : edgeWord[item.edge.kind] }}</title></path>
        <text v-if="item.loop || item.active" :x="item.mid.x" :y="item.mid.y - 8" class="h-edge-label">{{ item.loop ? '↺ loop' : edgeWord[item.edge.kind] }}</text>
      </g>
    </svg>
    <template v-for="o in cards" :key="o.id">
      <template v-if="!hidden(o)">
        <span v-if="hasSpan(o.id)" :class="['h-span', `tone-${toneOf(o.worldId)}`]" :style="spanStyle(o.id)" aria-hidden="true"></span>
        <button :data-occ="o.id" :class="['h-card', `tone-${toneOf(o.worldId)}`, `basis-${layout.nodes[o.id]!.basis}`, { selected: o.id === selectedId, dim: dimmed(o), approx: o.placement.kind !== 'exact', compact: layout.nodes[o.id]!.compact }]" :style="cardStyle(o.id)" :aria-pressed="o.id === selectedId" :aria-label="`${eventOf(o).title}, ${o.placement.label}${markerText(o) ? ` (${markerText(o)})` : ''}${basisText[layout.nodes[o.id]!.basis] ? `. ${basisText[layout.nodes[o.id]!.basis]}` : ''}`" :title="`${eventOf(o).title} · ${o.placement.label}`" @click="emit('select', o.id)" @mouseenter="focusId = o.id; guideX = layout.nodes[o.id]!.x" @mouseleave="focusId = undefined; guideX = undefined" @focus="focusId = o.id" @blur="focusId = undefined">
          <svg v-if="!layout.nodes[o.id]!.compact" class="h-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="iconPath(eventOf(o).icon)" /></svg>
          <span class="h-copy"><strong>{{ eventOf(o).title }}</strong><small v-if="!layout.nodes[o.id]!.compact"><i v-if="marker(o)" class="h-mark" aria-hidden="true">{{ marker(o) }}</i>{{ o.placement.label }}</small></span>
        </button>
      </template>
      <div v-else class="h-card hidden-spoiler" :style="cardStyle(o.id)" aria-hidden="true"><span>◌</span><small v-if="!layout.nodes[o.id]!.compact">Hidden by spoiler setting</small></div>
    </template>

    <div class="ruler" :style="{ top: `${TOP_INSET}px`, height: `${RULER_H}px` }" aria-hidden="true">
      <div v-for="(t, i) in ticks.context" :key="`c${t.t}`" class="tick-context" :style="{ left: `${i === 0 ? Math.max(sx(t.t), 0) : sx(t.t)}px`, visibility: i === 0 && ticks.context[1] && sx(ticks.context[1].t) < 190 ? 'hidden' : 'visible' }"><span>{{ t.label }}</span></div>
      <div v-for="t in ticks.minor" :key="`m${t.t}`" class="tick-minor" :style="{ left: `${sx(t.t)}px` }"></div>
      <div v-for="t in ticks.labelled" :key="`l${t.t}`" class="tick-major" :style="{ left: `${sx(t.t)}px` }"><span>{{ t.label }}</span></div>
      <div v-if="layout.undatedX !== undefined" class="tick-undated" :style="{ left: `${layout.undatedX - 24 - vx}px` }"><span>No established date</span></div>
    </div>

    <ol class="sr-only" aria-label="Events in time order"><li v-for="o in ordered" :key="o.id"><button @click="emit('select', o.id)">{{ eventOf(o).title }}, {{ o.placement.label }}</button></li></ol>

    <div v-if="touchUi" class="navstrip no-pan" role="group" aria-label="Move through the timeline">
      <button class="nav-step" aria-label="Previous event" :disabled="stepIndex <= 0" @click="step(-1)">‹</button>
      <div class="minimap" role="slider" aria-label="Overview: drag to move along the timeline" tabindex="0" :aria-valuenow="Math.round(mapView.left)" aria-valuemin="0" aria-valuemax="100" @pointerdown="mapDown" @pointermove="mapMove">
        <span v-for="d in mapDots" :key="d.id" :class="['map-dot', `tone-${d.tone}`, { selected: d.selected }]" :style="{ left: `${d.left}%`, top: `${d.top}%` }"></span>
        <span class="map-view" :style="{ left: `${mapView.left}%`, width: `${mapView.width}%` }"></span>
      </div>
      <button class="nav-step" aria-label="Next event" :disabled="stepIndex >= stepList.length - 1" @click="step(1)">›</button>
    </div>

    <div class="hud" role="toolbar" aria-label="Timeline controls">
      <div class="zoom"><button aria-label="Zoom out" @click="zoomOut">−</button><span aria-live="polite">{{ zoomText }}</span><button aria-label="Zoom in" @click="zoomIn">+</button><button class="reset" :disabled="autoFit" @click="setFit">Fit all</button></div>
      <span class="scale-hint" aria-live="polite">{{ scaleText }}<template v-if="cursorText"> · {{ cursorText }}</template></span>
      <button class="hud-chip" :aria-pressed="showConnections" @click="showConnections = !showConnections">Connections</button>
      <div class="lane-filter" role="group" aria-label="Highlight lanes"><button v-for="w in universe.worlds" :key="w.id" :class="['lane-chip', `tone-${w.tone}`, { off: mutedLanes.has(w.id) }]" :aria-pressed="!mutedLanes.has(w.id)" @click="toggleLane(w.id)">{{ w.name }}</button></div>
      <button class="hud-chip" :aria-expanded="legendOpen" @click="legendOpen = !legendOpen">Legend</button>
      <section v-if="legendOpen" class="legend no-pan" aria-label="Timeline legend">
        <div><svg width="40" height="12" aria-hidden="true"><path d="M2 6 H36" class="h-edge leads-to" marker-end="url(#arrow)" /></svg><span>Leads to</span></div>
        <div><svg width="40" height="12" aria-hidden="true"><path d="M2 6 H36" class="h-edge branches-to" marker-end="url(#arrow)" /></svg><span>Branch</span></div>
        <div><svg width="40" height="12" aria-hidden="true"><path d="M2 6 H36" class="h-edge returns-to" marker-end="url(#arrow)" /></svg><span>Return</span></div>
        <div><span class="h-loop-label static">↺ loop</span><span>Return to a moment already visited</span></div>
        <div><svg width="40" height="12" aria-hidden="true"><path d="M2 6 H36" class="h-edge related" marker-end="url(#arrow)" /></svg><span>Related</span></div>
        <div><i class="h-mark">≈</i> range <i class="h-mark">→</i> relative <i class="h-mark">?</i> unknown <i class="h-mark">≠</i> disputed</div>
        <div>Dashed card: position inferred. Bar under a card: duration. Hatched zone: no established date.</div>
        <div>Drag to pan · scroll or pinch to zoom · arrows move between events</div>
        <div class="legend-lanes lane-filter" role="group" aria-label="Highlight lanes"><button v-for="w in universe.worlds" :key="w.id" :class="['lane-chip', `tone-${w.tone}`, { off: mutedLanes.has(w.id) }]" :aria-pressed="!mutedLanes.has(w.id)" @click="toggleLane(w.id)">{{ w.name }}</button></div>
      </section>
    </div>
  </div>
</template>
