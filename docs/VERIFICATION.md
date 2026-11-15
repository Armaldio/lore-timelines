# MVP verification (LORE-6)

## Automated checks
`npm test` (Node test runner) covers: schema validation and broken references; per-dataset rules (15–25 events, every occurrence sourced and connected, every non-exact date explains its uncertainty); lane layout invariants for all five universes; spoiler levels, per-universe persistence and search leakage; graph derivation, relation and character filters; route round-trips. `npm run build` type-checks and builds.

## Manual visual pass (headless Chromium, desktop 1440 and mobile 390)
Landing page; timeline and relationship views of all five universes with all spoilers shown; Donnie Darko at the default spoiler level (7 events hidden, counted but not named); search for "Gretchen" at the default level (the hidden death event is not offered); keyboard arrow navigation and zoom on Star Wars; Dark timeline and Star Wars graph on a 390px viewport (horizontal scroll inside the chart, text version of the graph below it). Screenshots were reviewed locally and are not committed.

## Factual verification status — read this
Reviewed 2026-11-15 by research agents reading live web sources (mostly Wikipedia; fandom wikis were blocked, so Star Wars used a Wookieepedia mirror). Every occurrence carries a `verification` level shown in the detail panel: **verified** = a source that was actually read confirms date and placement; **partial** = the event is confirmed but its date or order is not; **unverified** = not confirmed.

| Universe | Events | Verified | Partial | Unverified |
|---|---|---|---|---|
| Dark | 17 | 10 | 8 | 1 |
| Star Wars | 23 | 15 | 8 | 0 |
| Donnie Darko | 18 | 12 | 6 | 0 |
| Back to the Future | 25 | 10 | 14 | 1 |
| MCU | 20 | 10 | 10 | 0 |

Corrections made in this pass include: BTTF Marty's 1885 arrival (Sep 2) and Doc's part II arrival (Oct 26, 1985); Dark's Mikkel arrival (Nov 5, 1986) and an unsupported "Adam spares Eva" event rewritten; Star Wars academy fall (28 ABY) and Scarif (1–0 BBY); Donnie Darko's party moved to Oct 29 and the tangent chain re-ordered; MCU's Snap fixed at 2018 and a wrong Multiverse of Madness description rewritten. Seven edges that ran backwards in time as `leads-to` were retyped, and Back to the Future gained its one real loop (altered 1985 back to the Nov 12, 1955 dance).

Limits that remain:
- **"Verified" is only as good as the source read.** Wikipedia plot summaries do not say whether years such as 2012 or 2018 appear on screen; official-timeline years (MCU 2010, 2023, 2024) rest on Wikipedia's summary, not Marvel's own page.
- **Donnie Darko's Oct 3–30 dates come from Kelly's shooting script**, not the final cut's title cards (not reachable); the cinema, fire and arrest dates are inconsistent in the script.
- Dark's Mikkel disappearance day, Jonas's first 1986 trip and the Tannhaus crash year are inferred; the Dark season Wikipedia pages returned 404, so the episode-list page is cited.
- BTTF film one states no on-screen date; its dates come from part II/III summaries.
- Source URLs point at general pages (film, episode list, year page), not scenes or timestamps.

## Real time axis (checked)
`tests/time.test.ts` and `tests/layout.test.ts`: dates parse to fractional years (Gregorian and BBY/ABY); cards sit exactly at their date (30 years of Back to the Future = 30 × scale px); no card overlaps another in its lane at four scales for all five universes; zooming in reduces lane rows; ticks refine through 50 years → 5 years → year → month → day → hour, never crowd (≥ 60 px apart) and are never blank. Headless Chromium (stage layout): the page does not scroll (document height = viewport, wheel leaves scrollY at 0); drag pans without selecting text; wheel zoom anchors at the cursor and the ruler follows; 20 zoom-in clicks on Donnie Darko reach minute ticks (×12k) and 50 zoom-out clicks reach quarter ticks (×0.05), no cap; the spoiler level set on one universe is the same on another universe, after a reload and on the landing page. **Not verified:** real touch pinch (implemented with touch events, untested on a device) and screen readers.

**Inferred positions.** Where a placement is a label, a dispute or story order, the dataset's `when` (or one day after/before the anchor) positions it, and the card is dashed with an explanation in the detail panel. These inferred dates, notably the Donnie Darko October 1988 ranges and the 1885 and altered-1985 Back to the Future placements, are as unverified as the rest of the data. Hidden-by-spoiler cards still occupy their real position, so the axis extent and card positions can hint when an event happens, never what it is.

## Known limitations
- Lane filter chips dim lanes rather than remove them, to keep the layout stable.
- Events in the same year (Star Wars, Dark) stack in rows until you zoom in; year-only dates span their whole year.
- The relationship view keeps story-order columns; only the timeline has the real time axis.
- The detail-panel art is a decorative placeholder; no images are used.
- Source URLs are page-level, not scene-level.
