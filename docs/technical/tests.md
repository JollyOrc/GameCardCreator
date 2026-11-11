# Tests

Quality gates: see `CLAUDE.md`. Unit tests are in `tests/unit/`.

## AC-to-test map (SCAR-003)

| Story | AC | Test (`tests/unit/sheet-layout.test.ts`) | State |
|---|---|---|---|
| US-001 | AC-1 | `AC-1: default grid` (3 tests) | written, red until T1 (#1) |
| US-001 | AC-2 | `AC-2: margin range` (5) | written, red until T1 (#1) |
| US-001 | AC-3 | `AC-3: card size range` (5) | written, red until T1 (#1) |
| US-001 | AC-4 | `AC-4: upright only` (3) | written, red until T1 (#1) |
| US-001 | AC-5 | `AC-5: pages and order` (7) | written, red until T1 (#1) |
| US-001 | AC-6 | `AC-6: gap` (2) | written, red until T1 (#1) |
| US-001 | AC-7 | `AC-7: cut marks` (6) | written, red until T1 (#1) |
| US-001 | AC-8 | `AC-8: sweep` (1, asserts 168 combinations) | written, red until T1 (#1) |
| US-001 | AC-9 | `PDF level` (4 `todo`) | needs the engine ticket T2 (#2) |
| US-001 | AC-10 | layout part (1) written; PDF part `todo` | #1 / #2 |
| US-001 | AC-11 | manual look, full page width and 4x at the joins | manual check, with T2 |
| US-001 | AC-12 | `AC-12: settings checked` (20) | written, red until T1 (#1) |

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

## Gate set while tests come before code (SCAR-006, SCAR-044)

`tests/unit/sheet-layout.test.ts` imports `src/core/sheet/layout.ts`, which
does not exist before ticket T1 (sheet geometry). Until T1 is done the whole
tree checks `npm run typecheck`, `npm test` and `npm run lint` (type-aware
rules) are red for exactly this reason, and for no other. The set that must be
green meanwhile: `npx prettier --check .` and `npx eslint .` (no type check of
the missing import). T1 closes the gap; no later ticket may be started with
the gate red.
