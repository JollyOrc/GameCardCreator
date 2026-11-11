# Tests

Quality gates: see `CLAUDE.md`. Unit tests are in `tests/unit/`.

## AC-to-test map (SCAR-003)

| Story | AC | Test (`tests/unit/sheet-layout.test.ts`) | State |
|---|---|---|---|
| US-001 | AC-1 | `AC-1: default grid` (3 tests) | green (#1) (#1) |
| US-001 | AC-2 | `AC-2: margin range` (5) | green (#1) (#1) |
| US-001 | AC-3 | `AC-3: card size range` (5) | green (#1) (#1) |
| US-001 | AC-4 | `AC-4: upright only` (3) | green (#1) (#1) |
| US-001 | AC-5 | `AC-5: pages and order` (7) | green (#1) (#1) |
| US-001 | AC-6 | `AC-6: gap` (2) | green (#1) (#1) |
| US-001 | AC-7 | `AC-7: cut marks` (6) | green (#1) (#1) |
| US-001 | AC-8 | `AC-8: sweep` (1, asserts 168 combinations) | green (#1) (#1) |
| US-001 | AC-5, AC-7, AC-9 | `tests/integration/sheet-pdf.test.ts`: page size, frames, page counts, cut marks (+ reader tests, blank guard) | green (#2) |
| US-001 | AC-10 | layout part (1); PDF part: two fresh processes 1.1 s apart (+ guard that without the date line they differ) | green (#1 / #2) |
| US-001 | AC-11 | looked at: full page (1240 px wide) and a corner at 23.6 px/mm; sheet of 10 cards | done 2026-11-11 (#2); owner's look open |
| US-001 | AC-12 | `AC-12: settings checked` (20) | green (#1) (#1) |

## How the tests were proven (2026-11-11, G2)

A throwaway reference implementation, written from the story, was run against
the tests: 53 passed, 5 todo. Hand-computed story numbers were wrong twice
and are corrected in the story (AC-3's card size outside the allowed range,
AC-6's count at gap 5 mm, AC-7's omission examples). Mutation check of the
reference: six rules switched off in turn (centring, gap in the column count,
each of the four omission sides, the 3 mm boundary, row/column order, the
cut-marks switch) all failed a test; the first try left the top and bottom
omission mutants alive and led to the 62 x 143 example. The reference is not
in the repository; the code ticket writes the real module.

## Gate set (SCAR-006, SCAR-044)

Tickets #1 and #2 are done (2026-11-11): `npm run typecheck`, `build`, `lint`,
`npm test` (53 passed) and `npm run test:integration` (21 passed) are green;
no test is `todo`. Mutation check of the real module
(2026-11-11): 17 mutants (centring, column and row count with gap, each of
the four omission sides, the 3 mm boundary, reading order, the cut-marks
switch, both range ends, the finite check, page count, the no-fit rule, both
edge coordinates), all caught; the module was restored and proved equal to
its checksum.

## Ticket #2 (2026-11-11)

`npm run test:integration`: 21 tests (4 reader tests, 2 reader-shape tests,
A4 size, frames at 3 settings, page counts, cut marks, determinism and its
guard). Mutation check, emitter (8 mutants: date line, x, y, page break, cut
marks, page width, the 0-cards refusal, card height) all caught; reader (5
mutants: y flip, scale, closed, axis-aligned, both-closed) all caught after the
open-path and slanted-shape tests were added; the first run let one survive.
Times: each compile about 0.1 s; limit 30 s per test (SCAR-030).

## US-002 skill card (2026-11-11, G2): tests written (green since #3 and #4)

| AC | Test | State |
|---|---|---|
| AC-1 | `tests/unit/skill-read.test.ts` AC-1 (example note, header edge cases: look-alike rule, no closing line, BOM, CRLF, view blocks) | written |
| AC-2 | `skill-read` AC-2 (tag labels, string value); `skill-card-pdf` AC-2 (five tags wrap) | written |
| AC-3 | `skill-read` AC-3 (row: order, absent, link, alias, number, boolean, list/map warning) | written |
| AC-4 | `skill-read` AC-4 (links, heading, callout, lists, rule, embeds, table, html, code) | written |
| AC-5 | `skill-settings` sizes; `skill-card-pdf` AC-5 (6 word counts; the drawn size equals the fact) | written |
| AC-6 | `skill-fit` (warnings); `skill-card-pdf` AC-6 (400 words) | written |
| AC-7 | `skill-card-pdf` AC-7 (about 120 cases: 25 special strings x 6 places, 8 line starts x 3 places) | written |
| AC-8 | `skill-read` AC-8; `skill-fit` (incl. SKILL_FIT_UNKNOWN) | written |
| AC-9 | `skill-read` AC-9; `skill-card-pdf` AC-9 | written |
| AC-10 | `skill-settings`; `skill-read` AC-10; `skill-card-pdf` AC-10 | written |
| AC-11 | `skill-card-pdf` AC-11 (two fresh processes) | written |
| AC-12 | `skill-card-pdf` AC-12 (10 cards, 2 pages, containment to 0.1 mm) | written |
| AC-13 | manual look at printed size and 4x | with the code ticket |

Support code, tested against known Typst first (SCAR-028):
`tests/integration/support-pdf.test.ts` (3 tests) for the copied PDF text
reader (from Obsidian2Typst, MIT, same author) and the fact reader.
The modules the tests import do not exist before tickets #3 (settings,
read, fit: the three unit files) and #4 (sheet, escape: the integration file
and `skill-sheet-cli.ts`). Typecheck is red until #4 for exactly this reason
(SCAR-044): after #3 its only errors are in those two files. The green set
meanwhile: prettier, eslint, the 53 geometry tests, `sheet-pdf` and
`support-pdf` integration tests; after #3 also the three unit files.

## Ticket #3 (2026-11-11)

Unit tests: 147 passed (`skill-settings`, `skill-read`, `skill-fit`,
`skill-source`). Integration: `sheet-pdf` and `support-pdf` 24 passed; the
skill integration file waits for #4. Typecheck and build are red only for
`src/core/skill/sheet` (two files, as the ticket says). Mutation check of
`settings.ts`, `read.ts` and `fit.ts` (about 55 mutants over two rounds, backup
and checksum before, `shasum -c` after): all caught except three
equivalent ones, which were removed as dead code (the float epsilon in
`textSizes`, the integer and sign checks of a fact's index) and one type-only
check (`typeof size`, needed for narrowing). The first round let seven live:
no test for the first valid fact, a non-boolean `fits`, a BOM before a note
without a header, a closing line like `--- text`, an empty or bare `#` tag, a
header that is a scalar or a list, and the table cell separator; tests were
added for each.

## Ticket #4 (2026-11-11)

Whole tree green: typecheck, build, lint, `npm test` 161 passed,
`npm run test:integration` 44 passed (US-001 sheet 22, support 3, skill card
19). New in #4: `card-escape` unit tests (14, incl. the text check that user
text reaches the emitter only through `typstString`), the fit-loop sweep
(0 to 400 words in steps of 10: 41 facts, sizes never grow, overflow only at
the top, no compiler diagnostic: SCAR-021), the clip box of the text area,
the source test for bold, italic, lists and refused settings.

Found by running: (1) the story's 200-word size (5.75 pt) was measured with
filled tag chips; the story's own layout gives 6 pt, checked by an independent
spike run and by the emitter; story and test corrected; (2) the test fixture
lacked the tags and details row of the measured card; (3) the support PDF
reader counted a clip box as a frame (fixed, tested on a clipped block, and
it now reports clip boxes); (4) the determinism harness needed a
`createRequire` banner for esbuild's ESM bundle.

Mutation check, emitter and escape (about 30 mutants over three rounds, with
backup and checksum): all caught; one first-round mutant was a syntax error
(not a result) and was redone as a behaviour change; survivors led to tests
for bold/italic/enum, the clip, the refused settings.

## US-003 spell card (2026-11-11, G2): tests written, red until the code ticket

| AC | Test | State |
|---|---|---|
| AC-1 | `tests/unit/spell-read.test.ts` (example, other shapes); `spell-card-pdf` AC-1 (text order, sizes, no row) | written |
| AC-2 | `spell-read` AC-2 (timing ignored: card equals the example card) | written |
| AC-3 | `spell-read` AC-3 (links, lists, image, table, html, code, view block) | written |
| AC-4 | `spell-read` AC-4; `card-codes` (fit warnings follow the kind) | written |
| AC-5 | `spell-card-pdf` AC-5 (7 word counts, overflow warning) | written |
| AC-6 | `spell-settings` (shared sizes, `checkSizes`); `spell-card-pdf` AC-6 | written |
| AC-7 | `spell-card-pdf` AC-7 (mixed sheet: pages, order, containment, codes) | written |
| AC-8 | `spell-card-pdf` AC-8 (39 literal-text cases) | written |
| AC-9 | `spell-card-pdf` AC-9 (two fresh processes) | written |
| AC-10 | manual look, with the code ticket | pending |
| AC-11 | `card-codes` (cardCode; text check over all of `src/core`) | written |

New support: `tests/support/card-sheet.ts` (one helper that compiles cards of
any kind and cuts the text by card), `spell-fixtures.ts`, `spell-sheet-cli.ts`.
The modules and exports the tests import do not exist before the tickets:
`src/core/spell/{settings,read}.ts`, `src/core/card/{sheet,warning}.ts`,
`DEFAULT_SIZES`, `checkSizes`, `CardSizes` in `skill/settings.ts`, and the
optional `kind` of `SkillCard`. Typecheck is red until the tickets are done
(SCAR-044); the US-001 and US-002 tests (161 unit + 44 integration, minus the
new files) stay green and are re-run at every ticket (D4: the generalisation
keeps them green).
