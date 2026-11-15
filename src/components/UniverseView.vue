<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Universe } from '../domain'
import { validateUniverse } from '../domain'
import type { Route, View } from '../router'
import { isHidden, searchOccurrences, visibleOccurrences } from '../spoilers'
import { spoilerLevel as level, touchUi } from '../state'
import EventDetail from './EventDetail.vue'
import GraphView from './GraphView.vue'
import TimelineChart from './TimelineChart.vue'

const props = defineProps<{ universe: Universe; universes: Universe[]; route: Route }>()
const emit = defineEmits<{ navigate: [route: Route] }>()

watch(() => props.universe.id, () => { query.value = ''; detailOpen.value = !touchUi.value })

const query = ref('')
const results = computed(() => searchOccurrences(props.universe, query.value, level.value).slice(0, 8))
const eventTitle = (eventId: string) => props.universe.events.find((e) => e.id === eventId)?.title ?? ''
const worldName = (id: string) => props.universe.worlds.find((w) => w.id === id)?.name ?? ''

// A selection that is hidden (or unknown) falls back to the first revealed occurrence: a shared link can't leak a spoiler.
const selected = computed(() => {
  const visible = visibleOccurrences(props.universe, level.value)
  return visible.find((o) => o.id === props.route.occurrenceId) ?? visible[0]
})
const view = computed<View>(() => props.route.view)
const go = (patch: Partial<Route>) => emit('navigate', { universeId: props.universe.id, view: view.value, occurrenceId: selected.value?.id, ...patch })
const select = (id: string) => { query.value = ''; if (touchUi.value) detailOpen.value = true; go({ occurrenceId: id }) }
const problems = computed(() => validateUniverse(props.universe))
const detailOpen = ref(!touchUi.value)
const aboutOpen = ref(false)
const hiddenCount = computed(() => props.universe.occurrences.filter((o) => isHidden(level.value, o.spoiler)).length)
</script>

<template>
  <section class="stagepage">
    <div class="subbar glass">
      <div class="sub-title"><h1>{{ universe.title }}</h1><p class="subtitle">{{ universe.subtitle }}</p></div>
      <button class="about-btn" :aria-expanded="aboutOpen" aria-controls="about" @click="aboutOpen = !aboutOpen">About</button>
      <div class="search-wrap">
        <label class="search-box"><span class="sr-only">Search events</span><span aria-hidden="true">⌕</span><input v-model="query" type="search" autocomplete="off" :placeholder="`Search ${universe.title}…`" aria-controls="search-results" /></label>
        <ul v-if="query.trim()" id="search-results" class="search-results" aria-label="Search results">
          <li v-for="o in results" :key="o.id"><button @click="select(o.id)">{{ eventTitle(o.eventId) }}<small>{{ o.placement.label }} · {{ worldName(o.worldId) }}</small></button></li>
          <li v-if="!results.length" class="muted no-results">No visible events match.{{ hiddenCount ? ' Some content is hidden by your spoiler setting.' : '' }}</li>
        </ul>
      </div>
      <div role="tablist" class="view-tabs" aria-label="View">
        <button role="tab" :aria-selected="view === 'timeline'" :class="{ active: view === 'timeline' }" @click="go({ view: 'timeline' })">Timeline</button>
        <button role="tab" :aria-selected="view === 'graph'" :class="{ active: view === 'graph' }" @click="go({ view: 'graph' })">Relationships</button>
      </div>
      <span v-if="hiddenCount" class="hidden-note" role="status">{{ hiddenCount }} hidden</span>
    </div>
    <p v-if="aboutOpen" id="about" class="about glass">{{ universe.description }}</p>
    <div v-if="problems.length" class="validation-banner" role="alert">Timeline data needs attention: {{ problems.join(' ') }}</div>

    <TimelineChart v-if="view === 'timeline'" :universe="universe" :level="level" :selected-id="selected?.id ?? ''" :query="query" @select="select" />
    <div v-else :class="['graph-stage', { padded: detailOpen }]"><GraphView :universe="universe" :level="level" :selected-id="selected?.id ?? ''" @select="select" /></div>

    <EventDetail v-if="selected && detailOpen" class="overlay-detail" :universe="universe" :occurrence="selected" :level="level" :view="view" @select="select" @switch-view="go({ view: $event })" @close="detailOpen = false" />
    <button v-else-if="selected" class="detail-open glass" @click="detailOpen = true">Details</button>
    <aside v-else class="detail-panel overlay-detail"><div class="detail-content"><p class="muted">Every event is hidden by the current spoiler setting.</p></div></aside>
  </section>
</template>
