# Lore Timelines

A Vue 3 + TypeScript starter for exploring story chronologies as connected world lanes. The app is static friendly: all content is bundled as data, with no service, login, or generated timestamps.

## Start

```sh
npm install
npm run dev
```

Build a static bundle with `npm run build`; run schema checks with `npm test`.

## Deploy to GitHub Pages

The deployment workflow builds with Node.js 22 and publishes the Vite `dist/` artifact whenever `main` changes. You can also run it manually from the Actions tab; deployment is restricted to `main`. The project site URL is <https://armaldio.github.io/lore-timelines/>.

GitHub Pages is enabled for this public repository with **Build and deployment → Source → GitHub Actions**. Once the deployment workflow is on `main`, pushes and manual runs from `main` publish to the project site URL above.

## Data model

`schema/universe.schema.json` defines the canonical JSON shape, and `src/domain.ts` mirrors it with TypeScript types and cross-reference validation. A universe contains stable-ID `continuities`, `worlds`, `characters`, `sources`, `events`, `occurrences`, and explicit `edges`. Worlds are timeline lanes within a continuity. Events describe what happened; occurrences place an event in a world and carry its temporal placement, spoiler scope, sources, and uncertainty. One event may have multiple occurrences. Edges connect occurrence IDs so the interface shows only declared relationships.

- `exact`: `value` stores a supplied date string.
- `range`: `start` and/or `end` bound a date range.
- `relative`: `after` and/or `before` refer to event IDs.
- `unknown`: the date is explicitly not established.
- `disputed`: `alternatives` preserve competing readings.

Values are never inferred by the renderer. Use labels such as `32 BBY` if a chronology uses a fictional calendar; only add an exact value when the source supports it. Occurrence `spoiler` is scoped to a placement (`none`, `mild`, or `major`). `uncertainty` records an interpretive caveat. Edges (`leads-to`, `branches-to`, `returns-to`, `related`) express explicit graph relationships without assuming one universal sequence.

The in-app validator rejects duplicate IDs, malformed placements, and broken continuity, world, character, source, event, occurrence, and temporal references. The Netflix *Dark* fixture is distinct from Donnie Darko; it demonstrates an event recurring in 2019 and 1986 lanes and an explicit branch edge. Donnie Darko demonstrates tangent-world branching and return edges. Star Wars demonstrates cross-era chronology. Back to the Future and the Marvel Cinematic Universe are curated datasets with explicit alternate-history and multiverse structures.

## Using the app

- `#/` lists the five universes; `#/u/<universe>?view=timeline|graph&o=<occurrence>` is a shareable link to a universe, view and selected event.
- **Spoiler policy:** each universe remembers its level for the browser session (`sessionStorage`). The default hides `major` spoilers; `none` shows only spoiler-free events; `all` is an explicit opt-in. Hidden events are removed from search results, graph nodes, linked-event lists, tooltips and keyboard focus, and a shared link to a hidden event falls back to the first visible one.
- **Timeline:** one fixed grid for every universe (`src/layout.ts`). Lanes are worlds, eras or histories; cards follow story order inside a lane and may share a column with the event they branch from. Spacing is narrative order, **not** a scaled calendar, and lanes never share one universal date axis. Dashed cards and the `≈ → ? ≠` marks flag range, relative, unknown and disputed placements. Zoom with the buttons, `+`/`-` or Ctrl+wheel, pan by dragging or scrolling, and move between events with the arrow keys.
- **Relationships:** character rows with event nodes at their timeline column, built only from event participation and declared edges (`src/graph.ts`), with relationship-type and character filters and a text version of the same data.

## Datasets

`src/data/{dark,star-wars,donnie-darko,back-to-the-future,mcu}.ts` hold 15–25 curated story events each, every occurrence with a source, a deliberate spoiler scope and, for anything but an exact date, an `uncertainty` note. `tests/data.test.ts` enforces these rules. See `docs/VERIFICATION.md` for the verification evidence and known limitations.

## Extension

Add another `Universe` in `src/data/universes.ts`, keeping IDs stable across revisions and supplying the sources and uncertainty notes that support each placement. The same lane renderer can display a linear order, alternate worlds, branches, and returns.
