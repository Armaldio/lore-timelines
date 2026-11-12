<script setup lang="ts">
import { computed, ref } from 'vue'
import { universes } from './data/universes'
import { validateUniverse, type Event } from './domain'

const selectedUniverseId = ref('donnie-darko')
const selectedEventId = ref('school-fire')
const search = ref('')
const spoilerScope = ref<'all' | 'mild' | 'none'>('all')
const universe = computed(() => universes.find((item) => item.id === selectedUniverseId.value) ?? universes[0]!)
const visibleEvents = computed(() => universe.value.events.filter((event) => {
  const matchesSearch = `${event.title} ${event.description}`.toLowerCase().includes(search.value.toLowerCase())
  const matchesSpoiler = spoilerScope.value === 'all' || (spoilerScope.value === 'mild' && event.spoiler !== 'major') || (spoilerScope.value === 'none' && event.spoiler === 'none')
  return matchesSearch && matchesSpoiler
}))
const selectedEvent = computed(() => visibleEvents.value.find((item) => item.id === selectedEventId.value) ?? visibleEvents.value[0])
const visibleEventIds = computed(() => new Set(visibleEvents.value.map((event) => event.id)))
const visibleEdges = computed(() => universe.value.edges.filter((edge) => visibleEventIds.value.has(edge.fromEventId) && visibleEventIds.value.has(edge.toEventId)))
function eventsInWorld(worldId: string) { return visibleEvents.value.filter((event) => event.worldId === worldId) }
function edgesAt(event: Event) { return universe.value.edges.filter((edge) => edge.fromEventId === event.id) }
function sourcesFor(event: Event) { return universe.value.sources.filter((source) => event.sourceIds.includes(source.id)) }
function charactersFor(event: Event) { return universe.value.characters.filter((character) => event.characterIds.includes(character.id)) }
function setUniverse(id: string) {
  selectedUniverseId.value = id
  selectedEventId.value = universes.find((item) => item.id === id)?.events[0]?.id ?? ''
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
          <div class="lane-heading"><span class="lane-dot" aria-hidden="true"></span><div><h2>{{ world.name }}</h2><p>{{ world.summary }}</p></div><span class="lane-count">{{ eventsInWorld(world.id).length }} EVENTS</span></div>
          <div class="event-track">
            <template v-for="(event, index) in eventsInWorld(world.id)" :key="event.id">
              <button :class="['event-card', { selected: event.id === selectedEvent?.id }]" @click="selectedEventId = event.id" :aria-pressed="event.id === selectedEvent?.id" :aria-label="`${event.title}, ${event.placement.label}`">
                <span class="event-icon" aria-hidden="true">{{ event.spoiler === 'major' ? '✦' : '◇' }}</span>
                <span class="event-copy"><strong>{{ event.title }}</strong><small>{{ event.placement.label }}</small></span>
                <span v-if="event.spoiler === 'major'" class="spoiler-dot" aria-label="Major spoiler">!</span>
              </button>
              <div v-if="index < eventsInWorld(world.id).length - 1" class="track-link" aria-hidden="true"><span>⟶</span></div>
            </template>
            <p v-if="!eventsInWorld(world.id).length" class="empty-lane">No events match the current filters.</p>
          </div>
        </section>

        <section class="connection-key" aria-label="Timeline connection legend">
          <div><span class="key-arrow">⟶</span><span>Event sequence</span></div><div><span class="key-branch">⌒↘</span><span>Branch divergence</span></div><div><span class="key-return">⇢</span><span>Return / convergence</span></div>
        </section>
        <section v-if="visibleEdges.length" class="connections" aria-label="Cross-lane and event relationships">
          <h2>How events connect</h2>
          <div v-for="edge in visibleEdges" :key="edge.id" class="connection-row">
            <span class="connection-type" :class="edge.kind">{{ edge.kind === 'branches-to' ? 'Branch' : edge.kind === 'returns-to' ? 'Return' : edge.kind === 'leads-to' ? 'Leads to' : 'Related' }}</span>
            <button @click="selectedEventId = edge.fromEventId">{{ universe.events.find((item) => item.id === edge.fromEventId)?.title }}</button><span class="connection-arrow" aria-hidden="true">→</span><button @click="selectedEventId = edge.toEventId">{{ universe.events.find((item) => item.id === edge.toEventId)?.title }}</button>
          </div>
        </section>
      </div>

      <aside v-if="selectedEvent" class="detail-panel" aria-labelledby="detail-title">
        <div class="panel-top"><span class="panel-kicker">EVENT DETAILS</span><span :class="['spoiler-tag', selectedEvent.spoiler]">{{ selectedEvent.spoiler === 'major' ? 'Major spoiler' : selectedEvent.spoiler === 'mild' ? 'Mild spoiler' : 'No spoiler' }}</span></div>
        <div class="detail-art" aria-hidden="true"><span class="art-orbit">◌</span><span class="art-line"></span><span class="art-caption">{{ universe.title }}<br /><small>{{ universe.worlds.find((world) => world.id === selectedEvent.worldId)?.name }}</small></span></div>
        <div class="detail-content"><span class="detail-world">{{ universe.worlds.find((world) => world.id === selectedEvent.worldId)?.name }}</span><h2 id="detail-title">{{ selectedEvent.title }}</h2><p class="detail-date"><span aria-hidden="true">◷</span>{{ selectedEvent.placement.label }} <small>{{ selectedEvent.placement.kind }} placement</small></p><p class="detail-description">{{ selectedEvent.description }}</p>
          <p v-if="selectedEvent.uncertainty" class="uncertainty"><span aria-hidden="true">ⓘ</span>{{ selectedEvent.uncertainty }}</p>
          <section class="detail-section"><h3>Characters</h3><div class="chips"><span v-for="character in charactersFor(selectedEvent)" :key="character.id" class="chip">{{ character.name }}</span><span v-if="!charactersFor(selectedEvent).length" class="muted">No characters linked</span></div></section>
          <section class="detail-section"><h3>Sources</h3><div class="chips"><span v-for="source in sourcesFor(selectedEvent)" :key="source.id" class="chip source-chip">{{ source.title }}</span><span v-if="!sourcesFor(selectedEvent).length" class="muted">No source linked yet</span></div></section>
        </div>
      </aside>
    </section>
    <footer>LORE TIMELINES <span>·</span> A shared map for stories that do not follow one straight line</footer>
  </main>
</template>
