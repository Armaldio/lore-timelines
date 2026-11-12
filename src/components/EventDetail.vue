<script setup lang="ts">
import { computed } from 'vue'
import { edgeLabels, type Occurrence, type Universe } from '../domain'
import { isHidden, type SpoilerLevel } from '../spoilers'
import { iconPath } from '../icons'

const props = defineProps<{ universe: Universe; occurrence: Occurrence; level: SpoilerLevel; view: 'timeline' | 'graph' }>()
const emit = defineEmits<{ select: [id: string]; switchView: [view: 'timeline' | 'graph'] }>()

const event = computed(() => props.universe.events.find((e) => e.id === props.occurrence.eventId)!)
const world = computed(() => props.universe.worlds.find((w) => w.id === props.occurrence.worldId))
const characters = computed(() => props.universe.characters.filter((c) => event.value.characterIds.includes(c.id)))
const sources = computed(() => props.universe.sources.filter((s) => props.occurrence.sourceIds.includes(s.id)))
const placementKinds: Record<string, string> = { exact: 'Exact date', range: 'Date range', relative: 'Relative position', unknown: 'Date not established', disputed: 'Disputed date' }
const spoilerText: Record<string, string> = { none: 'No spoiler', mild: 'Mild spoiler', major: 'Major spoiler' }
/** Linked events, minus anything the spoiler level hides — hidden titles never appear here. */
const links = computed(() => props.universe.edges.flatMap((edge) => {
  const outgoing = edge.fromOccurrenceId === props.occurrence.id
  if (!outgoing && edge.toOccurrenceId !== props.occurrence.id) return []
  const other = props.universe.occurrences.find((o) => o.id === (outgoing ? edge.toOccurrenceId : edge.fromOccurrenceId))
  if (!other || isHidden(props.level, other.spoiler)) return []
  const title = props.universe.events.find((e) => e.id === other.eventId)?.title ?? ''
  const worldName = props.universe.worlds.find((w) => w.id === other.worldId)?.name ?? ''
  return [{ id: `${edge.id}`, occurrenceId: other.id, label: outgoing ? edgeLabels[edge.kind] : `Reached from (${edgeLabels[edge.kind].toLowerCase()})`, title, worldName }]
}))
</script>

<template>
  <aside class="detail-panel" aria-labelledby="detail-title">
    <div class="panel-top"><span class="panel-kicker">EVENT DETAILS</span><span :class="['spoiler-tag', occurrence.spoiler]">{{ spoilerText[occurrence.spoiler] }}</span></div>
    <div class="detail-art" aria-hidden="true"><span class="art-orbit">◌</span><span class="art-line"></span><span class="art-caption">{{ universe.title }}<br /><small>{{ world?.name }}</small></span></div>
    <div class="detail-content">
      <span class="detail-world">{{ world?.name }}</span>
      <h2 id="detail-title"><svg class="detail-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="iconPath(event.icon)" /></svg>{{ event.title }}</h2>
      <p class="detail-date"><span aria-hidden="true">▦</span>{{ occurrence.placement.label }} <small>{{ placementKinds[occurrence.placement.kind] }}</small></p>
      <p v-if="occurrence.placement.kind === 'disputed'" class="alternatives">Competing readings: {{ occurrence.placement.alternatives.join(' · ') }}</p>
      <p class="detail-description">{{ event.description }}</p>
      <p v-if="occurrence.uncertainty" class="uncertainty"><span aria-hidden="true">ⓘ</span>{{ occurrence.uncertainty }}</p>
      <section class="detail-section"><h3>Participants</h3><div class="chips"><span v-for="c in characters" :key="c.id" class="chip">{{ c.name }}</span><span v-if="!characters.length" class="muted">No participants recorded</span></div></section>
      <section class="detail-section"><h3>Linked events</h3>
        <ul class="link-list"><li v-for="l in links" :key="l.id"><span class="link-kind">{{ l.label }}</span> <button class="chip chip-link" @click="emit('select', l.occurrenceId)">{{ l.title }}<small> · {{ l.worldName }}</small></button></li></ul>
        <span v-if="!links.length" class="muted">No declared links</span>
      </section>
      <section class="detail-section"><h3>Sources</h3><ul class="link-list"><li v-for="s in sources" :key="s.id"><a v-if="s.url" class="chip source-chip" :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.title }}</a><span v-else class="chip source-chip">{{ s.title }}</span> <small class="muted">{{ s.kind }}</small></li></ul><span v-if="!sources.length" class="muted">No source linked yet</span></section>
      <button class="switch-view" @click="emit('switchView', view === 'timeline' ? 'graph' : 'timeline')">{{ view === 'timeline' ? 'Show in relationship view' : 'Show in timeline' }}</button>
    </div>
  </aside>
</template>
