<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { universes } from './data/universes'
import { formatRoute, parseRoute, type Route } from './router'
import LandingView from './components/LandingView.vue'
import UniverseView from './components/UniverseView.vue'

const route = ref<Route>(parseRoute(window.location.hash))
const sync = () => { route.value = parseRoute(window.location.hash) }
onMounted(() => window.addEventListener('hashchange', sync))
onBeforeUnmount(() => window.removeEventListener('hashchange', sync))
const universe = computed(() => universes.find((u) => u.id === route.value.universeId))
function navigate(next: Route) { window.location.hash = formatRoute(next) }
</script>

<template>
  <main class="app-shell" id="top">
    <header class="topbar">
      <a class="brand" href="#/" aria-label="Lore Timelines home"><span class="brand-mark" aria-hidden="true">◉</span><span>Lore <i>Timelines</i></span></a>
    </header>
    <UniverseView v-if="universe" :universe="universe" :universes="universes" :route="route" @navigate="navigate" />
    <LandingView v-else :universes="universes" />
    <footer>LORE TIMELINES <span>·</span> A shared map for stories that do not follow one straight line</footer>
  </main>
</template>
