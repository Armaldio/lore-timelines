import { ref, watch } from 'vue'
import { loadSpoilerLevel, saveSpoilerLevel, SPOILER_KEY, type SpoilerLevel } from './spoilers'

/** The single spoiler setting for the whole app: persisted, and kept in sync across open tabs. */
export const spoilerLevel = ref<SpoilerLevel>(loadSpoilerLevel())
watch(spoilerLevel, (level) => saveSpoilerLevel(level))
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => { if (event.key === SPOILER_KEY) spoilerLevel.value = loadSpoilerLevel() })
}
