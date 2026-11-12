<script setup lang="ts">
import type { Universe } from '../domain'
defineProps<{ universes: Universe[] }>()
</script>

<template>
  <section class="landing">
    <div class="landing-hero"><div class="orbit" aria-hidden="true"><span></span></div><div><h1>Stories as maps, not watch lists</h1><p>Explore what happens in each universe — across eras, alternate worlds and time loops — in story order. Spoilers stay hidden until you choose otherwise.</p></div></div>
    <ul class="universe-grid" aria-label="Universes">
      <li v-for="u in universes" :key="u.id"><a class="universe-card" :href="`#/u/${u.id}`">
        <h2>{{ u.title }}</h2><p class="uc-sub">{{ u.subtitle }}</p><p class="uc-desc">{{ u.description }}</p>
        <p class="uc-meta"><span>{{ u.events.length }} events</span><span>{{ u.worlds.length }} {{ u.worlds.length === 1 ? 'lane' : 'lanes' }}</span><span>{{ u.characters.length }} characters</span></p>
      </a></li>
    </ul>
  </section>
</template>
