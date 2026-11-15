<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { universes } from './data/universes'
import { formatRoute, parseRoute, type Route } from './router'
import LandingView from './components/LandingView.vue'
import UniverseView from './components/UniverseView.vue'
import { spoilerLevels } from './spoilers'
import { spoilerLevel } from './state'

const route = ref<Route>(parseRoute(window.location.hash))
const sync = () => { route.value = parseRoute(window.location.hash) }
onMounted(() => window.addEventListener('hashchange', sync))
onBeforeUnmount(() => window.removeEventListener('hashchange', sync))
const universe = computed(() => universes.find((u) => u.id === route.value.universeId))
function navigate(next: Route) { window.location.hash = formatRoute(next) }
</script>

<template>
  <div :class="['app', universe ? 'app-stage' : 'app-page']" id="top">
    <header class="topbar glass">
      <a class="brand" href="#/" aria-label="Lore Timelines home"><span class="brand-mark" aria-hidden="true">◉</span><span>Lore <i>Timelines</i></span></a>
      <nav class="universe-picker" aria-label="Choose a universe"><a v-for="u in universes" :key="u.id" :href="`#/u/${u.id}`" :class="['universe-tab', { active: u.id === universe?.id }]" :aria-current="u.id === universe?.id ? 'page' : undefined">{{ u.title }}</a></nav>
      <label class="spoiler-control"><span aria-hidden="true">◉</span><span class="sr-only">Spoiler level, applies to every universe</span><select v-model="spoilerLevel" aria-label="Spoiler level, applies to every universe"><option v-for="l in spoilerLevels" :key="l.value" :value="l.value">{{ l.value === 'all' ? 'Spoilers: all content' : l.value === 'mild' ? 'Spoilers: hide major' : 'Spoilers: none' }}</option></select></label>
    </header>
    <UniverseView v-if="universe" :universe="universe" :universes="universes" :route="route" @navigate="navigate" />
    <template v-else>
      <LandingView :universes="universes" />
      <footer>LORE TIMELINES <span>·</span> A shared map for stories that do not follow one straight line</footer>
    </template>
  </div>
</template>
