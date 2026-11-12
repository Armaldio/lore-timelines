# Lore Timelines

A Vue 3 + TypeScript starter for exploring story chronologies as connected world lanes. The app is static friendly: all content is bundled as data, with no service, login, or generated timestamps.

## Start

```sh
npm install
npm run dev
```

Build a static bundle with `npm run build`; run schema checks with `npm test`.

## Data model

`schema/universe.schema.json` defines the canonical JSON shape, and `src/domain.ts` mirrors it with TypeScript types and cross-reference validation. A universe contains stable-ID `worlds`, `characters`, `sources`, `events`, and explicit `edges`. Events point to one world and may link source and character IDs. `placement` carries a display label plus one of:

- `exact`: `value` stores a supplied date string.
- `range`: `start` and/or `end` bound a date range.
- `relative`: `after` and/or `before` refer to event IDs.
- `unknown`: the date is explicitly not established.
- `disputed`: `alternatives` preserve competing readings.

Values are never inferred by the renderer. Use labels such as `32 BBY` if a chronology uses a fictional calendar; only add an exact value when the source supports it. `spoiler` is scoped per event (`none`, `mild`, or `major`). `uncertainty` records an interpretive caveat. Edges (`leads-to`, `branches-to`, `returns-to`, `related`) express graph relationships without assuming one universal sequence.

The in-app validator rejects duplicate IDs, malformed placement records, and broken world, character, source, or event references. The small Donnie Darko and Star Wars fixtures demonstrate branching worlds and cross-era chronology. Back to the Future and Marvel Cinematic Universe are selectable renderer examples with explicitly unknown dates; they are not curated canon datasets.

## Extension

Add another `Universe` in `src/data/universes.ts`, keeping IDs stable across revisions and supplying the sources and uncertainty notes that support each placement. The same lane renderer can display a linear order, alternate worlds, branches, and returns.
