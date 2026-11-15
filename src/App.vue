<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { universes } from './data/universes'
import { formatRoute, parseRoute, type Route } from './router'
import LandingView from './components/LandingView.vue'
import UniverseView from './components/UniverseView.vue'
import { spoilerLevels } from './spoilers'
import { spoilerLevel } from './state'

const menuOpen = ref(false)
const route = ref<Route>(parseRoute(window.location.hash))
const sync = () => { route.value = parseRoute(window.location.hash); menuOpen.value = false }
onMounted(() => window.addEventListener('hashchange', sync))
onBeforeUnmount(() => window.removeEventListener('hashchange', sync))
const universe = computed(() => universes.find((u) => u.id === route.value.universeId))
function navigate(next: Route) { window.location.hash = formatRoute(next) }
</script>

<template>
  <div :class="['app', universe ? 'app-stage' : 'app-page']" id="top">
    <header class="topbar glass">
      <a class="brand" href="#/" aria-label="Lore Timelines home"><span class="brand-mark" aria-hidden="true">◉</span><span>Lore <i>Timelines</i></span></a>
      <button class="menu-btn" :aria-expanded="menuOpen" aria-controls="app-menu" @click="menuOpen = !menuOpen"><span class="menu-title">{{ universe?.title ?? 'Universes' }} <span aria-hidden="true">▾</span></span><span class="menu-sub">Spoilers: {{ spoilerLevels.find((l) => l.value === spoilerLevel)?.label.toLowerCase() }}</span></button>
      <nav class="universe-picker" aria-label="Choose a universe"><a v-for="u in universes" :key="u.id" :href="`#/u/${u.id}`" :class="['universe-tab', { active: u.id === universe?.id }]" :aria-current="u.id === universe?.id ? 'page' : undefined">{{ u.title }}</a></nav>
      <label class="spoiler-control"><span aria-hidden="true">◉</span><span class="sr-only">Spoiler level, applies to every universe</span><select v-model="spoilerLevel" aria-label="Spoiler level, applies to every universe"><option v-for="l in spoilerLevels" :key="l.value" :value="l.value">{{ l.value === 'all' ? 'Spoilers: all content' : l.value === 'mild' ? 'Spoilers: hide major' : 'Spoilers: none' }}</option></select></label>
    </header>
    <div v-if="menuOpen" class="menu-scrim" @click="menuOpen = false"></div>
    <div v-if="menuOpen" id="app-menu" class="menu-sheet glass" role="dialog" aria-label="Universes and spoiler setting">
      <p class="menu-label">Universe</p>
      <a v-for="u in universes" :key="u.id" :href="`#/u/${u.id}`" :class="['menu-item', { active: u.id === universe?.id }]">{{ u.title }}</a>
      <p class="menu-label">Spoilers, for every universe</p>
      <label v-for="l in spoilerLevels" :key="l.value" :class="['menu-item', { active: spoilerLevel === l.value }]"><input v-model="spoilerLevel" type="radio" name="spoiler" :value="l.value" @change="menuOpen = false" />{{ l.label }}</label>
    </div>
    <UniverseView v-if="universe" :universe="universe" :universes="universes" :route="route" @navigate="navigate" />
    <template v-else>
      <LandingView :universes="universes" />
      <footer>LORE TIMELINES <span>·</span> A shared map for stories that do not follow one straight line</footer>
    </template>
  </div>
</template>
