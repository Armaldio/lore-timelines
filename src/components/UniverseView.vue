<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Universe } from '../domain'
import { validateUniverse } from '../domain'
import type { Route, View } from '../router'
import { isHidden, loadSpoilerLevel, saveSpoilerLevel, searchOccurrences, spoilerLevels, visibleOccurrences, type SpoilerLevel } from '../spoilers'
import EventDetail from './EventDetail.vue'
import GraphView from './GraphView.vue'
import TimelineChart from './TimelineChart.vue'

const props = defineProps<{ universe: Universe; universes: Universe[]; route: Route }>()
const emit = defineEmits<{ navigate: [route: Route] }>()

const level = ref<SpoilerLevel>(loadSpoilerLevel(props.universe.id))
watch(() => props.universe.id, (id) => { level.value = loadSpoilerLevel(id); query.value = '' })
watch(level, (value) => saveSpoilerLevel(props.universe.id, value))

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
const select = (id: string) => { query.value = ''; go({ occurrenceId: id }) }
const problems = computed(() => validateUniverse(props.universe))
const hiddenCount = computed(() => props.universe.occurrences.filter((o) => isHidden(level.value, o.spoiler)).length)
</script>

<template>
  <section class="universe-page">
    <nav class="universe-picker" aria-label="Choose a universe"><a v-for="u in universes" :key="u.id" :href="`#/u/${u.id}`" :class="['universe-tab', { active: u.id === universe.id }]" :aria-current="u.id === universe.id ? 'page' : undefined">{{ u.title }}</a></nav>
    <div class="intro">
      <div class="intro-title"><div class="orbit" aria-hidden="true"><span></span></div><div><h1>{{ universe.title }}</h1><p class="subtitle">{{ universe.subtitle }}</p></div></div>
      <p class="intro-description">{{ universe.description }}</p>
    </div>

    <div class="toolbar">
      <div class="search-wrap">
        <label class="search-box"><span class="sr-only">Search events</span><span aria-hidden="true">⌕</span><input v-model="query" type="search" autocomplete="off" :placeholder="`Search the ${universe.title} universe…`" aria-controls="search-results" /></label>
        <ul v-if="query.trim()" id="search-results" class="search-results" aria-label="Search results">
          <li v-for="o in results" :key="o.id"><button @click="select(o.id)">{{ eventTitle(o.eventId) }}<small>{{ o.placement.label }} · {{ worldName(o.worldId) }}</small></button></li>
          <li v-if="!results.length" class="muted no-results">No visible events match.{{ hiddenCount ? ' Some content is hidden by your spoiler setting.' : '' }}</li>
        </ul>
      </div>
      <label class="spoiler-control"><span aria-hidden="true">◉</span><span class="sr-only">Spoiler level</span><select v-model="level" aria-label="Spoiler level"><option v-for="s in spoilerLevels" :key="s.value" :value="s.value">{{ s.value === 'all' ? 'Spoilers: all content' : s.label }}</option></select></label>
    </div>

    <div role="tablist" class="view-tabs" aria-label="View">
      <button role="tab" :aria-selected="view === 'timeline'" :class="{ active: view === 'timeline' }" @click="go({ view: 'timeline' })">Timeline</button>
      <button role="tab" :aria-selected="view === 'graph'" :class="{ active: view === 'graph' }" @click="go({ view: 'graph' })">Relationships</button>
      <span v-if="hiddenCount" class="hidden-note" role="status">{{ hiddenCount }} {{ hiddenCount === 1 ? 'event' : 'events' }} hidden by spoiler setting</span>
    </div>

    <div v-if="problems.length" class="validation-banner" role="alert">Timeline data needs attention: {{ problems.join(' ') }}</div>
    <div class="workspace">
      <div class="main-column">
        <TimelineChart v-if="view === 'timeline'" :universe="universe" :level="level" :selected-id="selected?.id ?? ''" :query="query" @select="select" />
        <GraphView v-else :universe="universe" :level="level" :selected-id="selected?.id ?? ''" @select="select" />
      </div>
      <EventDetail v-if="selected" :universe="universe" :occurrence="selected" :level="level" :view="view" @select="select" @switch-view="go({ view: $event })" />
      <aside v-else class="detail-panel"><div class="detail-content"><p class="muted">Every event is hidden by the current spoiler setting.</p></div></aside>
    </div>
  </section>
</template>
