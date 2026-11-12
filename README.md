# Lore Timelines

A Vue 3 + TypeScript starter for exploring story chronologies as connected world lanes. The app is static friendly: all content is bundled as data, with no service, login, or generated timestamps.

## Start

```sh
npm install
npm run dev
```

Build a static bundle with `npm run build`; run schema checks with `npm test`.

## Data model

`schema/universe.schema.json` defines the canonical JSON shape, and `src/domain.ts` mirrors it with TypeScript types and cross-reference validation. A universe contains stable-ID `continuities`, `worlds`, `characters`, `sources`, `events`, `occurrences`, and explicit `edges`. Worlds are timeline lanes within a continuity. Events describe what happened; occurrences place an event in a world and carry its temporal placement, spoiler scope, sources, and uncertainty. One event may have multiple occurrences. Edges connect occurrence IDs so the interface shows only declared relationships.

- `exact`: `value` stores a supplied date string.
- `range`: `start` and/or `end` bound a date range.
- `relative`: `after` and/or `before` refer to event IDs.
- `unknown`: the date is explicitly not established.
- `disputed`: `alternatives` preserve competing readings.

Values are never inferred by the renderer. Use labels such as `32 BBY` if a chronology uses a fictional calendar; only add an exact value when the source supports it. Occurrence `spoiler` is scoped to a placement (`none`, `mild`, or `major`). `uncertainty` records an interpretive caveat. Edges (`leads-to`, `branches-to`, `returns-to`, `related`) express explicit graph relationships without assuming one universal sequence.

The in-app validator rejects duplicate IDs, malformed placements, and broken continuity, world, character, source, event, occurrence, and temporal references. The Netflix *Dark* fixture is distinct from Donnie Darko; it demonstrates an event recurring in 2019 and 1986 lanes and an explicit branch edge. Donnie Darko demonstrates tangent-world branching and return edges. Star Wars demonstrates cross-era chronology. Back to the Future and Marvel Cinematic Universe are selectable renderer examples with explicitly unknown dates; they are not curated canon datasets.

## Extension

Add another `Universe` in `src/data/universes.ts`, keeping IDs stable across revisions and supplying the sources and uncertainty notes that support each placement. The same lane renderer can display a linear order, alternate worlds, branches, and returns.
