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

## Real time axis (checked)
`tests/time.test.ts` and `tests/layout.test.ts`: dates parse to fractional years (Gregorian and BBY/ABY); cards sit exactly at their date (30 years of Back to the Future = 30 × scale px); no card overlaps another in its lane at four scales for all five universes; zooming in reduces lane rows; ticks refine through 50 years → 5 years → year → month → day → hour, never crowd (≥ 60 px apart) and are never blank. Headless Chromium: drag from lane-heading text pans without selecting text, a drag that starts on a card does not select it, Ctrl+wheel zooms and the ruler follows. **Not verified:** real touch pinch (implemented with touch events, untested on a device) and screen readers.

**Inferred positions.** Where a placement is a label, a dispute or story order, the dataset's `when` (or one day after/before the anchor) positions it, and the card is dashed with an explanation in the detail panel. These inferred dates, notably the Donnie Darko October 1988 ranges and the 1885 and altered-1985 Back to the Future placements, are as unverified as the rest of the data. Hidden-by-spoiler cards still occupy their real position, so the axis extent and card positions can hint when an event happens, never what it is.

## Known limitations
- Lane filter chips dim lanes rather than remove them, to keep the layout stable.
- Events in the same year (Star Wars, Dark) stack in rows until you zoom in; year-only dates span their whole year.
- The relationship view keeps story-order columns; only the timeline has the real time axis.
- The detail-panel art is a decorative placeholder; no images are used.
- Source URLs are mostly absent.
