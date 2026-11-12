<script setup lang="ts">
import { computed, ref } from 'vue'
import { edgeKinds, edgeLabels, type EdgeKind, type Universe } from '../domain'
import { buildStoryGraph, neighbours } from '../graph'
import type { SpoilerLevel } from '../spoilers'

const props = defineProps<{ universe: Universe; level: SpoilerLevel; selectedId: string }>()
const emit = defineEmits<{ select: [id: string] }>()

const kinds = ref<EdgeKind[]>([...edgeKinds])
const chosen = ref<string[]>([])
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
const graph = computed(() => buildStoryGraph(props.universe, props.level, { kinds: kinds.value, characterIds: chosen.value }))
// Character list for the filter ignores the character filter itself, so chips never vanish while selected.
const everyone = computed(() => buildStoryGraph(props.universe, props.level).characters)

const COL = 70, ROW = 40, HEAD = 250, LEFT = 200, LANE_NUDGE = 12
const width = computed(() => LEFT + graph.value.columns * COL + 40)
const height = computed(() => HEAD + graph.value.characters.length * ROW + 24)
const rowY = (i: number) => HEAD + i * ROW + ROW / 2
const nodeX = (n: { col: number; laneIndex: number }) => LEFT + n.col * COL + n.laneIndex * LANE_NUDGE
const nodeById = computed(() => new Map(graph.value.nodes.map((n) => [n.occurrenceId, n])))
const related = computed(() => new Set([props.selectedId, ...neighbours(graph.value, props.selectedId)]))
const selectedNode = computed(() => nodeById.value.get(props.selectedId))
const arc = (from: string, to: string) => {
  const a = nodeById.value.get(from)!, b = nodeById.value.get(to)!
  const x1 = nodeX(a), x2 = nodeX(b), y = HEAD - 6
  const lift = Math.min(70, 16 + Math.abs(x2 - x1) / 4)
  return `M ${x1} ${y} C ${x1} ${y - lift} ${x2} ${y - lift} ${x2} ${y}`
}
const rowIndex = computed(() => new Map(graph.value.characters.map((c, i) => [c.id, i])))
const stem = (n: (typeof graph.value.nodes)[number]) => {
  const rows = n.characterIds.map((id) => rowIndex.value.get(id)).filter((r): r is number => r !== undefined)
  return rows.length ? { top: HEAD, bottom: rowY(Math.max(...rows)) } : undefined
}
const titleOf = (id: string) => nodeById.value.get(id)?.title ?? ''
</script>

<template>
  <div class="graph">
    <div class="graph-tools">
      <div role="group" aria-label="Relationship types"><span class="tool-label">Relationships</span>
        <button v-for="k in edgeKinds" :key="k" :class="['lane-chip', `kind-${k}`, { off: !kinds.includes(k) }]" :aria-pressed="kinds.includes(k)" @click="kinds = toggle(kinds, k)">{{ edgeLabels[k] }}</button>
      </div>
      <div role="group" aria-label="Characters"><span class="tool-label">Characters</span>
        <button v-for="c in everyone" :key="c.id" :class="['lane-chip', { off: chosen.length > 0 && !chosen.includes(c.id) }]" :aria-pressed="chosen.includes(c.id)" @click="chosen = toggle(chosen, c.id)">{{ c.name }}</button>
        <button v-if="chosen.length" class="lane-chip reset" @click="chosen = []">Clear</button>
      </div>
    </div>

    <div class="graph-scroll" role="group" aria-label="Character and event relationship graph. A text version follows below.">
      <svg v-if="graph.nodes.length" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="graph-svg">
        <g v-for="(c, i) in graph.characters" :key="c.id">
          <line :x1="LEFT - 10" :x2="width - 20" :y1="rowY(i)" :y2="rowY(i)" class="g-row" />
          <text :x="LEFT - 18" :y="rowY(i) + 4" text-anchor="end" class="g-char">{{ c.name }}</text>
        </g>
        <path v-for="e in graph.edges" :key="e.id" :d="arc(e.fromOccurrenceId, e.toOccurrenceId)" :class="['g-edge', e.kind, { hot: related.has(e.fromOccurrenceId) && related.has(e.toOccurrenceId) && (e.fromOccurrenceId === selectedId || e.toOccurrenceId === selectedId) }]"><title>{{ titleOf(e.fromOccurrenceId) }} — {{ edgeLabels[e.kind].toLowerCase() }} — {{ titleOf(e.toOccurrenceId) }}</title></path>
        <g v-for="n in graph.nodes" :key="n.occurrenceId" :class="['g-node', { sel: n.occurrenceId === selectedId, dim: selectedNode && !related.has(n.occurrenceId) }]">
          <line v-if="stem(n)" :x1="nodeX(n)" :x2="nodeX(n)" :y1="stem(n)!.top" :y2="stem(n)!.bottom" class="g-stem" />
          <g role="button" tabindex="0" :aria-label="`${n.title}. ${n.characterIds.length} participants. Select to open details.`" :aria-pressed="n.occurrenceId === selectedId" @click="emit('select', n.occurrenceId)" @keydown.enter.prevent="emit('select', n.occurrenceId)" @keydown.space.prevent="emit('select', n.occurrenceId)">
            <rect :x="nodeX(n) - 7" :y="HEAD - 7" width="14" height="14" rx="3" class="g-event" />
            <text :x="nodeX(n) + 4" :y="HEAD - 16" class="g-title" :transform="`rotate(-58 ${nodeX(n) + 4} ${HEAD - 16})`">{{ n.title.length > 40 ? `${n.title.slice(0, 39)}…` : n.title }}</text>
          </g>
          <circle v-for="id in n.characterIds" :key="id" :cx="nodeX(n)" :cy="rowY(rowIndex.get(id) ?? 0)" r="5" class="g-dot" />
        </g>
      </svg>
      <p v-else class="muted graph-empty">No events match the current filters and spoiler setting.</p>
    </div>

    <details class="graph-text" open>
      <summary>Text version: who takes part in what</summary>
      <ul><li v-for="c in graph.characters" :key="c.id"><strong>{{ c.name }}</strong>: <template v-for="(id, i) in c.occurrenceIds" :key="id"><button class="text-link" @click="emit('select', id)">{{ titleOf(id) }}</button><span v-if="i < c.occurrenceIds.length - 1">, </span></template></li></ul>
      <p v-if="graph.edges.length" class="tool-label">Declared relationships</p>
      <ul><li v-for="e in graph.edges" :key="e.id"><button class="text-link" @click="emit('select', e.fromOccurrenceId)">{{ titleOf(e.fromOccurrenceId) }}</button> {{ edgeLabels[e.kind].toLowerCase() }} <button class="text-link" @click="emit('select', e.toOccurrenceId)">{{ titleOf(e.toOccurrenceId) }}</button></li></ul>
    </details>
  </div>
</template>
