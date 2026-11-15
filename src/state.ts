import { ref, watch } from 'vue'
import { loadSpoilerLevel, saveSpoilerLevel, SPOILER_KEY, type SpoilerLevel } from './spoilers'

/** The single spoiler setting for the whole app: persisted, and kept in sync across open tabs. */
export const spoilerLevel = ref<SpoilerLevel>(loadSpoilerLevel())
watch(spoilerLevel, (level) => saveSpoilerLevel(level))
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => { if (event.key === SPOILER_KEY) spoilerLevel.value = loadSpoilerLevel() })
}

/** Phones and other touch-first screens: bigger tap targets, sheets instead of side panels, no placeholder cards. */
const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 760px), (pointer: coarse)') : undefined
export const touchUi = ref(query?.matches ?? false)
query?.addEventListener('change', (event) => { touchUi.value = event.matches })
