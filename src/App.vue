<script setup lang="ts">
import { computed, ref } from 'vue'
import { universes } from './data/universes'
import { validateUniverse, type Event, type Occurrence } from './domain'

const selectedUniverseId = ref('dark-netflix')
const selectedOccurrenceId = ref('dark-crossing-2019')
const search = ref('')
const spoilerScope = ref<'all' | 'mild' | 'none'>('all')
const universe = computed(() => universes.find((item) => item.id === selectedUniverseId.value) ?? universes[0]!)
const eventFor = (occurrence: Occurrence) => universe.value.events.find((event) => event.id === occurrence.eventId)!
const visibleOccurrences = computed(() => universe.value.occurrences.filter((occurrence) => {
  const event = eventFor(occurrence)
  const matchesSearch = `${event.title} ${event.description}`.toLowerCase().includes(search.value.toLowerCase())
  const matchesSpoiler = spoilerScope.value === 'all' || (spoilerScope.value === 'mild' && occurrence.spoiler !== 'major') || (spoilerScope.value === 'none' && occurrence.spoiler === 'none')
  return matchesSearch && matchesSpoiler
}))
const selectedOccurrence = computed(() => visibleOccurrences.value.find((item) => item.id === selectedOccurrenceId.value) ?? visibleOccurrences.value[0])
const selectedEvent = computed(() => selectedOccurrence.value ? eventFor(selectedOccurrence.value) : undefined)
const visibleOccurrenceIds = computed(() => new Set(visibleOccurrences.value.map((occurrence) => occurrence.id)))
const visibleEdges = computed(() => universe.value.edges.filter((edge) => visibleOccurrenceIds.value.has(edge.fromOccurrenceId) && visibleOccurrenceIds.value.has(edge.toOccurrenceId)))
function occurrencesInWorld(worldId: string) { return visibleOccurrences.value.filter((occurrence) => occurrence.worldId === worldId) }
function occurrenceById(id: string) { return universe.value.occurrences.find((occurrence) => occurrence.id === id) }
function sourcesFor(occurrence: Occurrence) { return universe.value.sources.filter((source) => occurrence.sourceIds.includes(source.id)) }
function charactersFor(event: Event) { return universe.value.characters.filter((character) => event.characterIds.includes(character.id)) }
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
      <label class="search-box"><span class="sr-only">Search events</span><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Search this universe…" /></label>
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
        <section v-for="world in universe.worlds" :key="world.id" :class="['lane', `tone-${world.tone}`]" :aria-label="`${world.name} timeline lane`">
          <div class="lane-heading"><span class="lane-dot" aria-hidden="true"></span><div><h2>{{ world.name }}</h2><p>{{ world.summary }}</p></div><span class="lane-count">{{ occurrencesInWorld(world.id).length }} OCCURRENCES</span></div>
          <div class="event-track">
            <template v-for="occurrence in occurrencesInWorld(world.id)" :key="occurrence.id">
              <button :class="['event-card', { selected: occurrence.id === selectedOccurrence?.id }]" @click="selectedOccurrenceId = occurrence.id" :aria-pressed="occurrence.id === selectedOccurrence?.id" :aria-label="`${eventFor(occurrence).title}, ${occurrence.placement.label}`">
                <span class="event-icon" aria-hidden="true">{{ occurrence.spoiler === 'major' ? '✦' : '◇' }}</span>
                <span class="event-copy"><strong>{{ eventFor(occurrence).title }}</strong><small>{{ occurrence.placement.label }}</small></span>
                <span v-if="occurrence.spoiler === 'major'" class="spoiler-dot" aria-label="Major spoiler">!</span>
              </button>
            </template>
            <p v-if="!occurrencesInWorld(world.id).length" class="empty-lane">No occurrences match the current filters.</p>
          </div>
        </section>

        <section class="connection-key" aria-label="Timeline connection legend">
          <div><span class="key-arrow">⟶</span><span>Explicit relationship</span></div><div><span class="key-branch">⌒↘</span><span>Branch divergence</span></div><div><span class="key-return">⇢</span><span>Return / convergence</span></div>
        </section>
        <section v-if="visibleEdges.length" class="connections" aria-label="Cross-lane and event relationships">
          <h2>How events connect</h2>
          <div v-for="edge in visibleEdges" :key="edge.id" class="connection-row">
            <span class="connection-type" :class="edge.kind">{{ edge.kind === 'branches-to' ? 'Branch' : edge.kind === 'returns-to' ? 'Return' : edge.kind === 'leads-to' ? 'Leads to' : 'Related' }}</span>
            <button @click="selectedOccurrenceId = edge.fromOccurrenceId">{{ eventFor(occurrenceById(edge.fromOccurrenceId)!).title }} · {{ universe.worlds.find((item) => item.id === occurrenceById(edge.fromOccurrenceId)?.worldId)?.name }}</button><span class="connection-arrow" aria-hidden="true">→</span><button @click="selectedOccurrenceId = edge.toOccurrenceId">{{ eventFor(occurrenceById(edge.toOccurrenceId)!).title }} · {{ universe.worlds.find((item) => item.id === occurrenceById(edge.toOccurrenceId)?.worldId)?.name }}</button>
          </div>
        </section>
      </div>

      <aside v-if="selectedEvent && selectedOccurrence" class="detail-panel" aria-labelledby="detail-title">
        <div class="panel-top"><span class="panel-kicker">OCCURRENCE DETAILS</span><span :class="['spoiler-tag', selectedOccurrence.spoiler]">{{ selectedOccurrence.spoiler === 'major' ? 'Major spoiler' : selectedOccurrence.spoiler === 'mild' ? 'Mild spoiler' : 'No spoiler' }}</span></div>
        <div class="detail-art" aria-hidden="true"><span class="art-orbit">◌</span><span class="art-line"></span><span class="art-caption">{{ universe.title }}<br /><small>{{ universe.worlds.find((world) => world.id === selectedOccurrence.worldId)?.name }}</small></span></div>
        <div class="detail-content"><span class="detail-world">{{ universe.worlds.find((world) => world.id === selectedOccurrence.worldId)?.name }}</span><h2 id="detail-title">{{ selectedEvent.title }}</h2><p class="detail-date"><span aria-hidden="true">◷</span>{{ selectedOccurrence.placement.label }} <small>{{ selectedOccurrence.placement.kind }} placement</small></p><p class="detail-description">{{ selectedEvent.description }}</p>
          <p v-if="selectedOccurrence.uncertainty" class="uncertainty"><span aria-hidden="true">ⓘ</span>{{ selectedOccurrence.uncertainty }}</p>
          <section class="detail-section"><h3>Characters</h3><div class="chips"><span v-for="character in charactersFor(selectedEvent)" :key="character.id" class="chip">{{ character.name }}</span><span v-if="!charactersFor(selectedEvent).length" class="muted">No characters linked</span></div></section>
          <section class="detail-section"><h3>Sources</h3><div class="chips"><span v-for="source in sourcesFor(selectedOccurrence)" :key="source.id" class="chip source-chip">{{ source.title }}</span><span v-if="!sourcesFor(selectedOccurrence).length" class="muted">No source linked yet</span></div></section>
        </div>
      </aside>
    </section>
    <footer>LORE TIMELINES <span>·</span> A shared map for stories that do not follow one straight line</footer>
  </main>
</template>
