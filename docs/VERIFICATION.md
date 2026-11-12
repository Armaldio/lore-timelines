# MVP verification (LORE-6)

## Automated checks
`npm test` (Node test runner) covers: schema validation and broken references; per-dataset rules (15–25 events, every occurrence sourced and connected, every non-exact date explains its uncertainty); lane layout invariants for all five universes; spoiler levels, per-universe persistence and search leakage; graph derivation, relation and character filters; route round-trips. `npm run build` type-checks and builds.

## Manual visual pass (headless Chromium, desktop 1440 and mobile 390)
Landing page; timeline and relationship views of all five universes with all spoilers shown; Donnie Darko at the default spoiler level (7 events hidden, counted but not named); search for "Gretchen" at the default level (the hidden death event is not offered); keyboard arrow navigation and zoom on Star Wars; Dark timeline and Star Wars graph on a 390px viewport (horizontal scroll inside the chart, text version of the graph below it). Screenshots were reviewed locally and are not committed.

## Factual verification status — read this
The five datasets were drafted from memory by model agents without live source checks, then audited only for structural rules. They have **not** been checked against the works scene by scene. Treat dates and orderings as a good-faith first pass:
- Dark: Mikkel's disappearance and several world-crossing events are ranges or relative placements; episode titles in sources are from memory.
- Star Wars: 9 BBY, 3 ABY and 5 ABY come from Lucasfilm chronology rather than on-screen statements; Scarif is placed at 0 BBY with an uncertainty note; the Clone Wars season 7 source title needs checking.
- Donnie Darko: only 2 Oct 1988 is an exact date; mid-October events are relative. The 1–2 Nov dates in the original placeholder were dropped as unsupported.
- Back to the Future: the 1885 events carry no exact date (September 1885 per the film, unverified).
- MCU: Iron Man (2008/2010), Sokovia, the Snap and the Time Heist/Endgame battle are marked disputed; TVA and other-universe events have no date.

## Known limitations
- Horizontal spacing is story order, not a scaled time axis; there is no pinch-zoom (buttons and Ctrl+wheel only).
- Lane filter chips dim lanes rather than remove them, to keep the layout stable.
- The detail-panel art is a decorative placeholder; no images are used.
- Source URLs are mostly absent.
