<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Occurrence, Universe } from '../domain'
import { axisExtent, computeLayout, edgeMidpoint, edgePath, fitScale, isLoopClosure, MAX_CANVAS_W, PAD_X, RULER_H, timeOfX, xOfTime } from '../layout'
import { isHidden, type SpoilerLevel } from '../spoilers'
import { iconPath } from '../icons'
import { formatTime, maxPxPerYear, pickTicks, resolveTimes } from '../time'

const props = defineProps<{ universe: Universe; level: SpoilerLevel; selectedId: string; query: string }>()
const emit = defineEmits<{ select: [id: string] }>()

const scroller = ref<HTMLElement>()
const viewW = ref(1000)
const scrollLeft = ref(0)
const zoomMul = ref(1)
const STEP_MUL = 1.6

const calendar = computed(() => props.universe.axis?.calendar ?? 'gregorian')
const times = computed(() => resolveTimes(props.universe))
const extent = computed(() => axisExtent(props.universe))
const fit = computed(() => fitScale(props.universe, viewW.value))
const maxPx = computed(() => Math.min(maxPxPerYear(calendar.value), MAX_CANVAS_W / (extent.value.tMax - extent.value.tMin)))
const maxMul = computed(() => Math.max(1, maxPx.value / fit.value))
// The layout depends on the universe and the scale only: filters, search and spoiler level never move a card.
const layout = computed(() => computeLayout(props.universe, fit.value * Math.min(zoomMul.value, maxMul.value)))

async function setZoom(next: number, anchorX = viewW.value / 2) {
  const clamped = Math.min(maxMul.value, Math.max(1, next))
  if (clamped === zoomMul.value) return
  const t = timeOfX(layout.value, scrollLeft.value + anchorX)
  zoomMul.value = clamped
  await nextTick()
  if (scroller.value) scroller.value.scrollLeft = Math.max(0, xOfTime(layout.value, t) - anchorX)
}
// Buttons and keys zoom toward the selected event when it is on screen, otherwise toward the middle.
function buttonAnchor() {
  const n = layout.value.nodes[props.selectedId]
  if (!n) return undefined
  const x = n.x + n.w / 2 - scrollLeft.value
  return x > 0 && x < viewW.value ? x : undefined
}
const zoomIn = () => setZoom(zoomMul.value * STEP_MUL, buttonAnchor())
const zoomOut = () => setZoom(zoomMul.value / STEP_MUL, buttonAnchor())
const resetZoom = () => { zoomMul.value = 1; if (scroller.value) scroller.value.scrollLeft = 0 }

// Live ticks: only the visible window is generated, and the unit follows the scale.
const ticks = computed(() => {
  const l = layout.value
  const t0 = Math.max(l.tMin, timeOfX(l, scrollLeft.value - 120)), t1 = Math.min(l.tMax, timeOfX(l, scrollLeft.value + viewW.value + 120))
  return pickTicks(t0, t1, l.px, calendar.value)
})
const cursorT = ref<number | undefined>()
const guideX = ref<number | undefined>()

const mutedLanes = ref<Set<string>>(new Set())
watch(() => props.universe.id, () => { mutedLanes.value = new Set(); zoomMul.value = 1; if (scroller.value) scroller.value.scrollLeft = 0 })
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
  return !needle || `${eventOf(o).title} ${eventOf(o).description} ${o.placement.label}`.toLowerCase().includes(needle)
}
const dimmed = (o: Occurrence) => !matches(o) || mutedLanes.value.has(o.worldId)
const marker = (o: Occurrence) => ({ exact: '', range: '≈', relative: '→', unknown: '?', disputed: '≠' })[o.placement.kind]
const markerText = (o: Occurrence) => ({ exact: '', range: 'Date range', relative: 'Relative position', unknown: 'Date not established', disputed: 'Disputed date' })[o.placement.kind]
const basisText = { stated: '', inferred: 'Position on the axis is inferred', derived: 'Position derived from story order', undated: 'No established date' } as const
const visibleIds = computed(() => new Set(props.universe.occurrences.filter((o) => !hidden(o)).map((o) => o.id)))
const focusId = ref<string>()
// Default is calm: connections of the card you point at or select, plus loops. "All connections" draws everything.
const showAll = ref(false)
const emphasised = computed(() => focusId.value ?? props.selectedId)
const drawnEdges = computed(() => props.universe.edges
  .filter((e) => visibleIds.value.has(e.fromOccurrenceId) && visibleIds.value.has(e.toOccurrenceId))
  .map((edge) => ({ edge, d: edgePath(layout.value, edge), loop: isLoopClosure(layout.value, edge), mid: edgeMidpoint(layout.value, edge), active: edge.fromOccurrenceId === emphasised.value || edge.toOccurrenceId === emphasised.value }))
  .filter((item): item is { edge: typeof item.edge; d: string; loop: boolean; mid: { x: number; y: number }; active: boolean } => item.d !== undefined && item.mid !== undefined)
  .filter((item) => showAll.value || item.active || item.loop))
const edgeWord: Record<string, string> = { 'leads-to': 'leads to', 'branches-to': 'branch', 'returns-to': 'return', related: 'related' }
const countIn = (worldId: string) => props.universe.occurrences.filter((o) => o.worldId === worldId && !hidden(o)).length
const totalIn = (worldId: string) => props.universe.occurrences.filter((o) => o.worldId === worldId).length

// Keyboard: arrows move between visible occurrences by real position, +/- zoom, 0 fits everything.
async function focusOccurrence(id: string) {
  emit('select', id)
  await nextTick()
  const el = scroller.value?.querySelector<HTMLElement>(`[data-occ="${CSS.escape(id)}"]`)
  el?.focus({ preventScroll: true })
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
function onKey(event: KeyboardEvent, current: Occurrence) {
  if (event.key === '+' || event.key === '=') { void zoomIn(); return }
  if (event.key === '-') { void zoomOut(); return }
  if (event.key === '0') { resetZoom(); return }
  const here = layout.value.nodes[current.id]!
  const candidates = props.universe.occurrences.filter((o) => o.id !== current.id && !hidden(o)).map((o) => ({ o, n: layout.value.nodes[o.id]! }))
  let best: Occurrence | undefined
  let bestScore = Infinity
  for (const { o, n } of candidates) {
    const dx = n.x - here.x, dy = n.y - here.y, dl = n.laneIndex - here.laneIndex
    const ok = event.key === 'ArrowRight' ? dx > 0.5 : event.key === 'ArrowLeft' ? dx < -0.5 : event.key === 'ArrowDown' ? dy > 0.5 : event.key === 'ArrowUp' ? dy < -0.5 : false
    if (!ok) continue
    const horizontal = event.key === 'ArrowRight' || event.key === 'ArrowLeft'
    const score = horizontal ? Math.abs(dx) + Math.abs(dl) * 400 + Math.abs(dy) * 0.1 : Math.abs(dy) * 1000 + Math.abs(dx)
    if (score < bestScore) { bestScore = score; best = o }
  }
  if (best) { event.preventDefault(); void focusOccurrence(best.id) }
}

// Mouse drag pans from anywhere (cards included) once it moves a few pixels, so text selection never competes
// with panning: the chart is not selectable, the detail panel is. Touch scrolls natively and pinches to zoom.
let drag: { x: number; y: number; left: number; top: number; moved: boolean } | undefined
let suppressClick = false
const dragging = ref(false)
function dragStart(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  drag = { x: e.clientX, y: e.clientY, left: scroller.value!.scrollLeft, top: scroller.value!.scrollTop, moved: false }
}
function pointerMove(e: PointerEvent) {
  const el = scroller.value!
  if (e.pointerType === 'mouse') {
    const rect = el.getBoundingClientRect()
    const x = el.scrollLeft + e.clientX - rect.left
    cursorT.value = x >= PAD_X ? timeOfX(layout.value, x) : undefined
    if (!drag) guideX.value = focusId.value ? guideX.value : x
  }
  if (!drag) return
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y
  if (!drag.moved && Math.hypot(dx, dy) < 5) return
  if (!drag.moved) { drag.moved = true; dragging.value = true; el.setPointerCapture(e.pointerId); window.getSelection()?.removeAllRanges() }
  el.scrollLeft = drag.left - dx
  el.scrollTop = drag.top - dy
}
function dragEnd() { suppressClick = Boolean(drag?.moved); drag = undefined; dragging.value = false }
function clickCapture(e: MouseEvent) { if (suppressClick) { e.stopPropagation(); e.preventDefault() } suppressClick = false }
function leave() { cursorT.value = undefined; if (!focusId.value) guideX.value = undefined }
function wheel(e: WheelEvent) {
  if (!(e.ctrlKey || e.metaKey)) return
  e.preventDefault()
  const rect = scroller.value!.getBoundingClientRect()
  void setZoom(zoomMul.value * (e.deltaY < 0 ? 1.25 : 0.8), e.clientX - rect.left)
}
let pinch: { d: number; mul: number } | undefined
const touchDist = (e: TouchEvent) => Math.hypot(e.touches[0]!.clientX - e.touches[1]!.clientX, e.touches[0]!.clientY - e.touches[1]!.clientY)
function touchStart(e: TouchEvent) { pinch = e.touches.length === 2 ? { d: touchDist(e), mul: zoomMul.value } : undefined }
function touchMove(e: TouchEvent) {
  if (!pinch || e.touches.length !== 2) return
  e.preventDefault()
  const rect = scroller.value!.getBoundingClientRect()
  void setZoom(pinch.mul * (touchDist(e) / pinch.d), (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2 - rect.left)
}
const touchEnd = () => { pinch = undefined }

let frame = 0
function onScroll() {
  if (frame) return
  frame = requestAnimationFrame(() => { frame = 0; scrollLeft.value = scroller.value?.scrollLeft ?? 0 })
}
let observer: ResizeObserver | undefined
onMounted(() => {
  const el = scroller.value!
  viewW.value = el.clientWidth || 1000
  observer = new ResizeObserver(() => { viewW.value = el.clientWidth || viewW.value })
  observer.observe(el)
  el.addEventListener('touchstart', touchStart, { passive: true })
  el.addEventListener('touchmove', touchMove, { passive: false })
  el.addEventListener('touchend', touchEnd)
})
onBeforeUnmount(() => { observer?.disconnect(); if (frame) cancelAnimationFrame(frame) })

// A selection made elsewhere (search, graph, links) scrolls into view when it is off screen.
watch(() => props.selectedId, async (id) => {
  await nextTick()
  const node = layout.value.nodes[id]
  const el = scroller.value
  if (!node || !el) return
  if (node.x < el.scrollLeft + 60 || node.x + node.w > el.scrollLeft + el.clientWidth - 20) el.scrollTo({ left: Math.max(0, node.x - el.clientWidth / 2 + node.w / 2), behavior: 'smooth' })
})
const tabStop = computed(() => (visibleIds.value.has(props.selectedId) ? props.selectedId : props.universe.occurrences.find((o) => !hidden(o))?.id))
const scaleText = computed(() => `${ticks.value.unitName} ticks`)
const cursorText = computed(() => (cursorT.value === undefined ? '' : formatTime(cursorT.value, calendar.value)))
const cardStyle = (id: string) => { const n = layout.value.nodes[id]!; return { left: `${n.x}px`, top: `${n.y}px`, width: `${n.w}px`, height: `${n.h}px` } }
</script>

<template>
  <div class="chart">
    <div class="chart-tools" role="toolbar" aria-label="Timeline controls">
      <div class="zoom"><button aria-label="Zoom out" :disabled="zoomMul <= 1" @click="zoomOut">−</button><span aria-live="polite">×{{ zoomMul < 10 ? zoomMul.toFixed(1) : Math.round(zoomMul) }}</span><button aria-label="Zoom in" :disabled="zoomMul >= maxMul" @click="zoomIn">+</button><button class="reset" :disabled="zoomMul === 1" @click="resetZoom">Fit all</button></div>
      <button :class="['lane-chip', 'conn-toggle']" :aria-pressed="showAll" @click="showAll = !showAll">All connections</button>
      <span class="scale-hint" aria-live="polite">{{ scaleText }}<template v-if="cursorText"> · {{ cursorText }}</template></span>
      <div class="lane-filter" role="group" aria-label="Highlight lanes"><button v-for="w in universe.worlds" :key="w.id" :class="['lane-chip', `tone-${w.tone}`, { off: mutedLanes.has(w.id) }]" :aria-pressed="!mutedLanes.has(w.id)" @click="toggleLane(w.id)">{{ w.name }}</button></div>
    </div>
    <div ref="scroller" :class="['history', { dragging }]" tabindex="-1" role="group" :aria-label="`${universe.title} timeline on a real time axis. Arrow keys move between events, plus and minus zoom, zero fits everything.`" @pointerdown="dragStart" @pointermove="pointerMove" @pointerup="dragEnd" @pointercancel="dragEnd" @pointerleave="leave" @click.capture="clickCapture" @scroll.passive="onScroll" @wheel="wheel">
      <div class="history-canvas" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
        <div class="ruler" :style="{ width: `${layout.width}px`, height: `${RULER_H}px` }" aria-hidden="true">
          <div v-for="t in ticks.context" :key="`c${t.t}`" class="tick-context" :style="{ left: `${xOfTime(layout, t.t)}px` }"><span>{{ t.label }}</span></div>
          <div v-for="t in ticks.minor" :key="`m${t.t}`" class="tick-minor" :style="{ left: `${xOfTime(layout, t.t)}px` }"></div>
          <div v-for="t in ticks.labelled" :key="`l${t.t}`" class="tick-major" :style="{ left: `${xOfTime(layout, t.t)}px` }"><span>{{ t.label }}</span></div>
          <div v-if="layout.undatedX !== undefined" class="tick-undated" :style="{ left: `${layout.undatedX - 24}px` }"><span>No established date</span></div>
        </div>
        <div v-for="t in ticks.labelled" :key="`g${t.t}`" class="gridline" :style="{ left: `${xOfTime(layout, t.t)}px`, top: `${RULER_H}px` }" aria-hidden="true"></div>
        <div v-if="layout.undatedX !== undefined" class="undated-zone" :style="{ left: `${layout.undatedX - 24}px`, top: `${RULER_H}px` }" aria-hidden="true"></div>
        <section v-for="(world, index) in universe.worlds" :key="world.id" :class="['h-lane', `tone-${world.tone}`, { muted: mutedLanes.has(world.id) }]" :style="{ top: `${layout.lanes[index]!.y}px`, height: `${layout.lanes[index]!.height}px` }" :aria-label="`${world.name} timeline lane`">
          <span class="h-ring" aria-hidden="true"></span>
          <div class="h-head"><h2>{{ world.name }}</h2><p>{{ world.summary }}</p></div>
          <span class="h-count">{{ countIn(world.id) }} / {{ totalIn(world.id) }}</span>
        </section>
        <div v-if="guideX !== undefined" class="guide" :style="{ left: `${guideX}px`, top: `${RULER_H}px` }" aria-hidden="true"></div>
        <svg class="h-edges" width="1" height="1" aria-hidden="true">
          <defs><marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1.5 L11 6 L1 10.5 Z" fill="context-stroke" /></marker></defs>
          <template v-for="item in drawnEdges" :key="item.edge.id">
            <g :class="['h-edge-group', item.edge.kind, { active: item.active, quiet: !item.active && Boolean(emphasised) }]">
              <path :d="item.d" class="h-edge-halo" />
              <path :d="item.d" :class="['h-edge', item.edge.kind, { loop: item.loop }]" marker-end="url(#arrow)"><title>{{ item.loop ? 'Loop: returns to a moment already visited' : edgeWord[item.edge.kind] }}</title></path>
              <text v-if="item.loop || item.active" :x="item.mid.x" :y="item.mid.y - 8" class="h-edge-label">{{ item.loop ? '↺ loop' : edgeWord[item.edge.kind] }}</text>
            </g>
          </template>
        </svg>
        <template v-for="o in universe.occurrences" :key="o.id">
          <template v-if="!hidden(o)">
            <span v-if="layout.nodes[o.id]!.spanW > 6" :class="['h-span', `tone-${toneOf(o.worldId)}`]" :style="{ left: `${layout.nodes[o.id]!.x}px`, top: `${layout.nodes[o.id]!.y + layout.nodes[o.id]!.h + 3}px`, width: `${layout.nodes[o.id]!.spanW}px` }" aria-hidden="true"></span>
            <button :data-occ="o.id" :tabindex="o.id === tabStop ? 0 : -1" :class="['h-card', `tone-${toneOf(o.worldId)}`, `basis-${layout.nodes[o.id]!.basis}`, { selected: o.id === selectedId, dim: dimmed(o), approx: o.placement.kind !== 'exact', compact: layout.nodes[o.id]!.compact }]" :style="cardStyle(o.id)" :aria-pressed="o.id === selectedId" :aria-label="`${eventOf(o).title}, ${o.placement.label}${markerText(o) ? ` (${markerText(o)})` : ''}${basisText[layout.nodes[o.id]!.basis] ? `. ${basisText[layout.nodes[o.id]!.basis]}` : ''}`" :title="`${eventOf(o).title} · ${o.placement.label}`" @click="emit('select', o.id)" @keydown="onKey($event, o)" @mouseenter="focusId = o.id; guideX = layout.nodes[o.id]!.x" @mouseleave="focusId = undefined; guideX = undefined" @focus="focusId = o.id" @blur="focusId = undefined">
              <svg v-if="!layout.nodes[o.id]!.compact" class="h-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="iconPath(eventOf(o).icon)" /></svg>
              <span class="h-copy"><strong>{{ eventOf(o).title }}</strong><small v-if="!layout.nodes[o.id]!.compact"><i v-if="marker(o)" class="h-mark" aria-hidden="true">{{ marker(o) }}</i>{{ o.placement.label }}</small></span>
            </button>
          </template>
          <div v-else class="h-card hidden-spoiler" :style="cardStyle(o.id)" aria-hidden="true"><span>◌</span><small v-if="!layout.nodes[o.id]!.compact">Hidden by spoiler setting</small></div>
        </template>
      </div>
    </div>
    <section class="connection-key" aria-label="Timeline connection legend">
      <div><svg width="40" height="12" aria-hidden="true"><path d="M2 6 H36" class="h-edge leads-to" marker-end="url(#arrow)" /></svg><span>Leads to</span></div>
      <div><svg width="40" height="12" aria-hidden="true"><path d="M2 6 H36" class="h-edge branches-to" marker-end="url(#arrow)" /></svg><span>Branch</span></div>
      <div><svg width="40" height="12" aria-hidden="true"><path d="M2 6 H36" class="h-edge returns-to" marker-end="url(#arrow)" /></svg><span>Return</span></div>
      <div><span class="h-loop-label static">↺ loop</span><span>Return to a moment already visited</span></div>
      <div><svg width="40" height="12" aria-hidden="true"><path d="M2 6 H36" class="h-edge related" marker-end="url(#arrow)" /></svg><span>Related</span></div>
      <div class="key-marks"><i class="h-mark">≈</i> range <i class="h-mark">→</i> relative <i class="h-mark">?</i> unknown <i class="h-mark">≠</i> disputed · dashed card = position inferred</div>
    </section>
    <p class="chart-note">Cards sit at their real date on a linear axis, so a long gap in the story is a long gap on screen; ticks refine as you zoom. A bar under a card is its duration. Events whose date the work never gives wait in the “No established date” zone, and dashed cards have an inferred position (see their detail panel). Connections are drawn for the card you point at or select, plus loops; switch on “All connections” to see every one.</p>
  </div>
</template>
