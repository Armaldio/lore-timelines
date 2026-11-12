<script setup lang="ts">
import { computed, ref } from 'vue'
import { universes } from './data/universes'
import { validateUniverse, type Event, type Occurrence } from './domain'
import { CARD_H, CARD_W, computeLayout, edgePath } from './layout'
import { iconPath } from './icons'

// Optional deep link: ?universe=donnie-darko&occurrence=school-fire-tangent&spoilers=none
const params = new URLSearchParams(window.location.search)
const initialUniverse = universes.find((item) => item.id === params.get('universe')) ?? universes[0]!
const selectedUniverseId = ref(initialUniverse.id)
const selectedOccurrenceId = ref(initialUniverse.occurrences.find((item) => item.id === params.get('occurrence'))?.id ?? initialUniverse.occurrences[0]?.id ?? '')
const search = ref('')
const spoilerScope = ref<'all' | 'mild' | 'none'>(['mild', 'none'].includes(params.get('spoilers') ?? '') ? (params.get('spoilers') as 'mild' | 'none') : 'all')
const universe = computed(() => universes.find((item) => item.id === selectedUniverseId.value) ?? universes[0]!)
// Layout depends only on the universe, never on filters, so every timeline keeps one stable shape.
const layout = computed(() => computeLayout(universe.value))
const eventFor = (occurrence: Occurrence) => universe.value.events.find((event) => event.id === occurrence.eventId)!
const worldName = (id: string) => universe.value.worlds.find((world) => world.id === id)?.name ?? ''
const spoilerHidden = (occurrence: Occurrence) => (spoilerScope.value === 'mild' && occurrence.spoiler === 'major') || (spoilerScope.value === 'none' && occurrence.spoiler !== 'none')
const matchesSearch = (occurrence: Occurrence) => {
  const event = eventFor(occurrence)
  return `${event.title} ${event.description}`.toLowerCase().includes(search.value.toLowerCase())
}
const revealed = computed(() => universe.value.occurrences.filter((occurrence) => !spoilerHidden(occurrence)))
const selectedOccurrence = computed(() => revealed.value.find((item) => item.id === selectedOccurrenceId.value) ?? revealed.value[0])
const selectedEvent = computed(() => selectedOccurrence.value ? eventFor(selectedOccurrence.value) : undefined)
const revealedIds = computed(() => new Set(revealed.value.map((occurrence) => occurrence.id)))
const drawnEdges = computed(() => universe.value.edges
  .filter((edge) => revealedIds.value.has(edge.fromOccurrenceId) && revealedIds.value.has(edge.toOccurrenceId))
  .map((edge) => ({ edge, d: edgePath(layout.value, edge) }))
  .filter((item): item is { edge: typeof item.edge; d: string } => item.d !== undefined))
function occurrenceById(id: string) { return universe.value.occurrences.find((occurrence) => occurrence.id === id) }
function countIn(worldId: string) { return revealed.value.filter((occurrence) => occurrence.worldId === worldId).length }
function sourcesFor(occurrence: Occurrence) { return universe.value.sources.filter((source) => occurrence.sourceIds.includes(source.id)) }
function charactersFor(event: Event) { return universe.value.characters.filter((character) => event.characterIds.includes(character.id)) }
const linkedEvents = computed(() => {
  const current = selectedOccurrence.value
  if (!current) return []
  return universe.value.edges
    .filter((edge) => edge.fromOccurrenceId === current.id || edge.toOccurrenceId === current.id)
    .map((edge) => occurrenceById(edge.fromOccurrenceId === current.id ? edge.toOccurrenceId : edge.fromOccurrenceId))
    .filter((occurrence): occurrence is Occurrence => Boolean(occurrence) && revealedIds.value.has(occurrence!.id))
})
const edgeLabel = (kind: string) => kind === 'branches-to' ? 'Branch' : kind === 'returns-to' ? 'Return' : kind === 'leads-to' ? 'Leads to' : 'Related'
function setUniverse(id: string) {
  selectedUniverseId.value = id
  selectedOccurrenceId.value = universes.find((item) => item.id === id)?.occurrences[0]?.id ?? ''
}
const problems = computed(() => validateUniverse(universe.value))
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <a class="brand" href="#top" aria-label="Lore Timelines home"><span class="brand-mark" aria-hidden="true">◉</span><span>Lore <i>Timelines</i></span></a>
      <label class="search-box"><span class="sr-only">Search events</span><span aria-hidden="true">⌕</span><input v-model="search" type="search" :placeholder="`Search the ${universe.title} universe…`" /></label>
      <label class="spoiler-control"><span aria-hidden="true">◉</span><span class="sr-only">Spoiler display</span><select v-model="spoilerScope" aria-label="Spoiler display"><option value="all">Spoilers: all content</option><option value="mild">Hide major spoilers</option><option value="none">No spoilers</option></select></label>
    </header>

    <section id="top" class="workspace">
      <div class="main-column">
        <div class="intro">
          <div class="intro-title"><div class="orbit" aria-hidden="true"><span></span></div><div><label class="eyebrow">A map through the story</label><h1>{{ universe.title }}</h1><p class="subtitle">{{ universe.subtitle }}</p></div></div>
          <p class="intro-description">{{ universe.description }}</p>
        </div>

        <div class="universe-picker" aria-label="Choose a universe">
          <button v-for="item in universes" :key="item.id" :class="['universe-tab', { active: item.id === universe.id }]" @click="setUniverse(item.id)">{{ item.title }}</button>
        </div>

        <div v-if="problems.length" class="validation-banner" role="alert">Timeline data needs attention: {{ problems.join(' ') }}</div>
        <div class="history" role="group" :aria-label="`${universe.title} history lanes`">
          <div class="history-canvas" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
            <section v-for="(world, index) in universe.worlds" :key="world.id" :class="['h-lane', `tone-${world.tone}`]" :style="{ top: `${layout.lanes[index]!.y}px`, height: `${layout.lanes[index]!.height}px` }" :aria-label="`${world.name} timeline lane`">
              <span class="h-ring" aria-hidden="true"></span>
              <div class="h-head"><h2>{{ world.name }}</h2><p>{{ world.summary }}</p></div>
              <span class="h-count">{{ countIn(world.id) }} / {{ universe.occurrences.filter((o) => o.worldId === world.id).length }}</span>
            </section>
            <svg class="h-edges" :width="layout.width" :height="layout.height" aria-hidden="true">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></marker>
              </defs>
              <path v-for="item in drawnEdges" :key="item.edge.id" :d="item.d" :class="['h-edge', item.edge.kind]" marker-end="url(#arrow)" />
            </svg>
            <template v-for="occurrence in universe.occurrences" :key="occurrence.id">
              <button v-if="!spoilerHidden(occurrence)" :class="['h-card', `tone-${universe.worlds.find((w) => w.id === occurrence.worldId)?.tone}`, { selected: occurrence.id === selectedOccurrence?.id, dim: !matchesSearch(occurrence) }]" :style="{ left: `${layout.nodes[occurrence.id]!.x}px`, top: `${layout.nodes[occurrence.id]!.y}px`, width: `${CARD_W}px`, height: `${CARD_H}px` }" :aria-pressed="occurrence.id === selectedOccurrence?.id" :aria-label="`${eventFor(occurrence).title}, ${occurrence.placement.label}`" :title="`${eventFor(occurrence).title} · ${occurrence.placement.label}`" @click="selectedOccurrenceId = occurrence.id">
                <svg class="h-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="iconPath(eventFor(occurrence).icon)" /></svg>
                <span class="h-copy"><strong>{{ eventFor(occurrence).title }}</strong><small>{{ occurrence.placement.label }}</small></span>
              </button>
              <div v-else class="h-card hidden-spoiler" :style="{ left: `${layout.nodes[occurrence.id]!.x}px`, top: `${layout.nodes[occurrence.id]!.y}px`, width: `${CARD_W}px`, height: `${CARD_H}px` }" aria-label="Hidden spoiler"><span aria-hidden="true">◌</span><small>Hidden by spoiler setting</small></div>
            </template>
          </div>
        </div>

        <section class="connection-key" aria-label="Timeline connection legend">
          <div><svg width="34" height="10" aria-hidden="true"><path d="M1 5 H30" class="h-edge leads-to" marker-end="url(#arrow)" /></svg><span>Timeline progress</span></div>
          <div><svg width="34" height="14" aria-hidden="true"><path d="M1 12 C14 12 10 2 30 2" class="h-edge branches-to" marker-end="url(#arrow)" /></svg><span>Branch (divergence)</span></div>
          <div><svg width="34" height="10" aria-hidden="true"><path d="M1 5 H30" class="h-edge returns-to" marker-end="url(#arrow)" /></svg><span>Return (convergence)</span></div>
        </section>
        <details v-if="drawnEdges.length" class="connections">
          <summary>List connections as text</summary>
          <div v-for="item in drawnEdges" :key="item.edge.id" class="connection-row">
            <span :class="['connection-type', item.edge.kind]">{{ edgeLabel(item.edge.kind) }}</span>
            <button @click="selectedOccurrenceId = item.edge.fromOccurrenceId">{{ eventFor(occurrenceById(item.edge.fromOccurrenceId)!).title }} · {{ worldName(occurrenceById(item.edge.fromOccurrenceId)!.worldId) }}</button><span aria-hidden="true">→</span><button @click="selectedOccurrenceId = item.edge.toOccurrenceId">{{ eventFor(occurrenceById(item.edge.toOccurrenceId)!).title }} · {{ worldName(occurrenceById(item.edge.toOccurrenceId)!.worldId) }}</button>
          </div>
        </details>
      </div>

      <aside v-if="selectedEvent && selectedOccurrence" class="detail-panel" aria-labelledby="detail-title">
        <div class="panel-top"><span class="panel-kicker">OCCURRENCE DETAILS</span><span :class="['spoiler-tag', selectedOccurrence.spoiler]">{{ selectedOccurrence.spoiler === 'major' ? 'Major spoiler' : selectedOccurrence.spoiler === 'mild' ? 'Mild spoiler' : 'No spoiler' }}</span></div>
        <div class="detail-art" aria-hidden="true"><span class="art-orbit">◌</span><span class="art-line"></span><span class="art-caption">{{ universe.title }}<br /><small>{{ universe.worlds.find((world) => world.id === selectedOccurrence.worldId)?.name }}</small></span></div>
        <div class="detail-content"><span class="detail-world">{{ worldName(selectedOccurrence.worldId) }}</span>
          <h2 id="detail-title"><svg class="detail-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="iconPath(selectedEvent.icon)" /></svg>{{ selectedEvent.title }}</h2>
          <p class="detail-date"><span aria-hidden="true">▦</span>{{ selectedOccurrence.placement.label }} <small>{{ selectedOccurrence.placement.kind }} placement</small></p>
          <p class="detail-description">{{ selectedEvent.description }}</p>
          <p v-if="selectedOccurrence.uncertainty" class="uncertainty"><span aria-hidden="true">ⓘ</span>{{ selectedOccurrence.uncertainty }}</p>
          <section class="detail-section"><h3>Relationships</h3><div class="chips"><span v-for="character in charactersFor(selectedEvent)" :key="character.id" class="chip">{{ character.name }}</span><span class="chip">{{ worldName(selectedOccurrence.worldId) }}</span><button v-for="linked in linkedEvents" :key="linked.id" class="chip chip-link" @click="selectedOccurrenceId = linked.id">{{ eventFor(linked).title }}</button></div></section>
          <section class="detail-section"><h3>Sources</h3><div class="chips"><span v-for="source in sourcesFor(selectedOccurrence)" :key="source.id" class="chip source-chip">{{ source.title }}</span><span v-if="!sourcesFor(selectedOccurrence).length" class="muted">No source linked yet</span></div></section>
        </div>
      </aside>
    </section>
    <footer>LORE TIMELINES <span>·</span> A shared map for stories that do not follow one straight line</footer>
  </main>
</template>
