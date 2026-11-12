<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Occurrence, Universe } from '../domain'
import { CARD_H, CARD_W, computeLayout, edgeMidpoint, edgePath, isLoopClosure } from '../layout'
import { isHidden, type SpoilerLevel } from '../spoilers'
import { iconPath } from '../icons'

const props = defineProps<{ universe: Universe; level: SpoilerLevel; selectedId: string; query: string }>()
const emit = defineEmits<{ select: [id: string] }>()

// The layout depends only on the universe: filters, zoom and spoiler level never move a card.
const layout = computed(() => computeLayout(props.universe))
const zoom = ref(1)
const zoomIn = () => { zoom.value = Math.min(1.6, +(zoom.value + 0.2).toFixed(1)) }
const zoomOut = () => { zoom.value = Math.max(0.4, +(zoom.value - 0.2).toFixed(1)) }
const mutedLanes = ref<Set<string>>(new Set())
watch(() => props.universe.id, () => { mutedLanes.value = new Set(); zoom.value = 1 })
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
const visibleIds = computed(() => new Set(props.universe.occurrences.filter((o) => !hidden(o)).map((o) => o.id)))
const drawnEdges = computed(() => props.universe.edges
  .filter((e) => visibleIds.value.has(e.fromOccurrenceId) && visibleIds.value.has(e.toOccurrenceId))
  .map((edge) => ({ edge, d: edgePath(layout.value, edge), loop: isLoopClosure(layout.value, edge), mid: edgeMidpoint(layout.value, edge) }))
  .filter((item): item is { edge: typeof item.edge; d: string; loop: boolean; mid: { x: number; y: number } } => item.d !== undefined && item.mid !== undefined))
const countIn = (worldId: string) => props.universe.occurrences.filter((o) => o.worldId === worldId && !hidden(o)).length
const totalIn = (worldId: string) => props.universe.occurrences.filter((o) => o.worldId === worldId).length

// Keyboard: arrows move between visible occurrences by position, +/- zoom.
const scroller = ref<HTMLElement>()
async function focusOccurrence(id: string) {
  emit('select', id)
  await nextTick()
  const el = scroller.value?.querySelector<HTMLElement>(`[data-occ="${CSS.escape(id)}"]`)
  el?.focus({ preventScroll: true })
  el?.scrollIntoView({ block: 'nearest', inline: 'center' })
}
function onKey(event: KeyboardEvent, current: Occurrence) {
  if (event.key === '+' || event.key === '=') { zoomIn(); return }
  if (event.key === '-') { zoomOut(); return }
  const here = layout.value.nodes[current.id]!
  const candidates = props.universe.occurrences.filter((o) => o.id !== current.id && !hidden(o)).map((o) => ({ o, n: layout.value.nodes[o.id]! }))
  let best: Occurrence | undefined
  let bestScore = Infinity
  for (const { o, n } of candidates) {
    const dx = n.col - here.col, dy = n.laneIndex - here.laneIndex
    const ok = event.key === 'ArrowRight' ? dx > 0 : event.key === 'ArrowLeft' ? dx < 0 : event.key === 'ArrowDown' ? dy > 0 : event.key === 'ArrowUp' ? dy < 0 : false
    if (!ok) continue
    const horizontal = event.key === 'ArrowRight' || event.key === 'ArrowLeft'
    const score = horizontal ? Math.abs(dx) * 10 + Math.abs(dy) : Math.abs(dy) * 10 + Math.abs(dx)
    if (score < bestScore) { bestScore = score; best = o }
  }
  if (best) { event.preventDefault(); void focusOccurrence(best.id) }
}

// Pointer drag pans with a mouse; touch uses native scrolling.
let drag: { x: number; y: number; left: number; top: number } | undefined
function dragStart(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || (e.target as HTMLElement).closest('button')) return
  drag = { x: e.clientX, y: e.clientY, left: scroller.value!.scrollLeft, top: scroller.value!.scrollTop }
  scroller.value!.setPointerCapture(e.pointerId)
}
function dragMove(e: PointerEvent) { if (drag) { scroller.value!.scrollLeft = drag.left - (e.clientX - drag.x); scroller.value!.scrollTop = drag.top - (e.clientY - drag.y) } }
const dragEnd = () => { drag = undefined }
function wheel(e: WheelEvent) { if (e.ctrlKey) { e.preventDefault(); if (e.deltaY < 0) zoomIn(); else zoomOut() } }
// Cards are the only tab stops inside a lane: the first revealed one, or the selected one.
const tabStop = computed(() => (visibleIds.value.has(props.selectedId) ? props.selectedId : props.universe.occurrences.find((o) => !hidden(o))?.id))
</script>

<template>
  <div class="chart">
    <div class="chart-tools" role="toolbar" aria-label="Timeline controls">
      <div class="zoom"><button aria-label="Zoom out" :disabled="zoom <= 0.4" @click="zoomOut">−</button><span aria-live="polite">{{ Math.round(zoom * 100) }}%</span><button aria-label="Zoom in" :disabled="zoom >= 1.6" @click="zoomIn">+</button><button class="reset" :disabled="zoom === 1" @click="zoom = 1">Reset</button></div>
      <div class="lane-filter" role="group" aria-label="Highlight lanes"><button v-for="w in universe.worlds" :key="w.id" :class="['lane-chip', `tone-${w.tone}`, { off: mutedLanes.has(w.id) }]" :aria-pressed="!mutedLanes.has(w.id)" @click="toggleLane(w.id)">{{ w.name }}</button></div>
    </div>
    <div ref="scroller" class="history" tabindex="-1" role="group" :aria-label="`${universe.title} history lanes. Use arrow keys on an event to move, plus and minus to zoom.`" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd" @wheel="wheel">
      <div class="history-sizer" :style="{ width: `${layout.width * zoom}px`, height: `${layout.height * zoom}px` }">
        <div class="history-canvas" :style="{ width: `${layout.width}px`, height: `${layout.height}px`, transform: `scale(${zoom})` }">
          <section v-for="(world, index) in universe.worlds" :key="world.id" :class="['h-lane', `tone-${world.tone}`, { muted: mutedLanes.has(world.id) }]" :style="{ top: `${layout.lanes[index]!.y}px`, height: `${layout.lanes[index]!.height}px` }" :aria-label="`${world.name} timeline lane`">
            <span class="h-ring" aria-hidden="true"></span>
            <div class="h-head"><h2>{{ world.name }}</h2><p>{{ world.summary }}</p></div>
            <span class="h-count">{{ countIn(world.id) }} / {{ totalIn(world.id) }}</span>
          </section>
          <svg class="h-edges" :width="layout.width" :height="layout.height" aria-hidden="true">
            <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></marker></defs>
            <template v-for="item in drawnEdges" :key="item.edge.id"><path :d="item.d" :class="['h-edge', item.edge.kind, { loop: item.loop }]" marker-end="url(#arrow)"><title>{{ item.loop ? 'Loop: returns to a moment already visited' : item.edge.kind }}</title></path><text v-if="item.loop" :x="item.mid.x" :y="item.mid.y" class="h-loop-label">↺ loop</text></template>
          </svg>
          <template v-for="o in universe.occurrences" :key="o.id">
            <button v-if="!hidden(o)" :data-occ="o.id" :tabindex="o.id === tabStop ? 0 : -1" :class="['h-card', `tone-${toneOf(o.worldId)}`, { selected: o.id === selectedId, dim: dimmed(o), approx: o.placement.kind !== 'exact' }]" :style="{ left: `${layout.nodes[o.id]!.x}px`, top: `${layout.nodes[o.id]!.y}px`, width: `${CARD_W}px`, height: `${CARD_H}px` }" :aria-pressed="o.id === selectedId" :aria-label="`${eventOf(o).title}, ${o.placement.label}${markerText(o) ? ` (${markerText(o)})` : ''}`" :title="`${eventOf(o).title} · ${o.placement.label}`" @click="emit('select', o.id)" @keydown="onKey($event, o)">
              <svg class="h-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="iconPath(eventOf(o).icon)" /></svg>
              <span class="h-copy"><strong>{{ eventOf(o).title }}</strong><small><i v-if="marker(o)" class="h-mark" aria-hidden="true">{{ marker(o) }}</i>{{ o.placement.label }}</small></span>
            </button>
            <div v-else class="h-card hidden-spoiler" :style="{ left: `${layout.nodes[o.id]!.x}px`, top: `${layout.nodes[o.id]!.y}px`, width: `${CARD_W}px`, height: `${CARD_H}px` }" aria-hidden="true"><span>◌</span><small>Hidden by spoiler setting</small></div>
          </template>
        </div>
      </div>
    </div>
    <section class="connection-key" aria-label="Timeline connection legend">
      <div><svg width="34" height="10" aria-hidden="true"><path d="M1 5 H30" class="h-edge leads-to" marker-end="url(#arrow)" /></svg><span>Timeline progress</span></div>
      <div><svg width="34" height="14" aria-hidden="true"><path d="M1 12 C14 12 10 2 30 2" class="h-edge branches-to" marker-end="url(#arrow)" /></svg><span>Branch (divergence)</span></div>
      <div><svg width="34" height="10" aria-hidden="true"><path d="M1 5 H30" class="h-edge returns-to" marker-end="url(#arrow)" /></svg><span>Return (convergence)</span></div>
      <div><span class="h-loop-label static">↺ loop</span><span>Return to a moment already visited</span></div>
      <div><svg width="34" height="10" aria-hidden="true"><path d="M1 5 H30" class="h-edge related" marker-end="url(#arrow)" /></svg><span>Related</span></div>
      <div class="key-marks"><i class="h-mark">≈</i> range <i class="h-mark">→</i> relative <i class="h-mark">?</i> unknown <i class="h-mark">≠</i> disputed</div>
    </section>
    <p class="chart-note">Cards follow story order within each lane; the horizontal spacing is not a scaled calendar, and lanes never share one universal date axis.</p>
  </div>
</template>
