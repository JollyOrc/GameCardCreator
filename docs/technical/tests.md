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
