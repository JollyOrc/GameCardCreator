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

## US-003 spell card (2026-11-11, G2): tests written (green since #6 and #7)

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

## Ticket #6 (2026-11-11)

Gate as the ticket states: eslint 0, prettier 0, `npm test` 177 passed (the 8
unit files that do not import `src/core/spell/*`, among them the new
`card-codes` 9 and `card-sheet` 7), `test:integration` 44 passed (the spell
integration file excluded: it needs #7). Typecheck is red only in
`spell-read`, `spell-settings`, `spell-card-pdf` and `spell-sheet-cli`
(missing `src/core/spell/*`), as stated. All US-001 and US-002 tests pass
unchanged.

SCAR-017 grep (done before writing code): `SKILL_` was in `skill/read.ts` (9
warning calls, 2 comments) and `skill/fit.ts` (2 codes, 2 comments): all go
through `cardCode`; users of `skillSheetTypst`, `SkillSettings`,
`checkSkillSettings`, `textSizes`, `DEFAULT_SKILL`: `skill/{read,settings,
sheet}.ts`, the US-002 tests, `skill-sheet-cli`, `spell-sheet-cli`,
`spell-settings`. SCAR-023 guards that pin moved code: `card-escape` read
`skill/sheet.ts`; re-pointed to `card/sheet.ts` with the reason in the file;
`skill-source` still holds (the reader stays in `skill/read.ts`).

Mutation check (19 mutants, backup and checksum): all caught except two in
`readText` (the `kind` field of the card, and the kind of the `Reading`):
nothing reads a spell until #7, so they are re-run there. Two tests were
added after the first review found `cardSheetTypst` untested directly
(`card-sheet`).

## Ticket #7 (2026-11-11)

Whole tree green: typecheck, build, lint, `npm test` 202 passed,
`npm run test:integration` 57 passed (US-001 sheet 22, support 3, skill card
19, spell card 13). New in #7: `src/core/spell/{settings,read}.ts`, and the
stability sweep with spell cards (0 to 400 words in steps of 10, 41 facts,
sizes never grow, no compiler diagnostic).

First green run read against the criteria: three failures, all read as
"test or code?": a doc comment in `spell/read.ts` contained the literal
spell code and the AC-11 text check rightly flagged it (code: comment
reworded); an excess-property type error in `card-sheet.test.ts` (test); a
run lookup for `A thin` that the bold run splits (test: looks up the run `A`).

Mutation check (9 mutants, backup and checksum): all caught, including the
two that waited for a spell reader (`kind` of the card and of the reading).
Look (AC-10): the mixed sheet at full page width and a spell card at 23.6
px/mm: correct; hand-over `spikes/typst-sheet/spell-sheet.pdf` (sha256
1af59ffa6cdd34f8...). Observation: paragraphs are separated by 0.6 em against
0.5 em between lines, as the story says, so the extra gap is about 0.7 pt and
hardly visible.

## US-005 make cards from notes (2026-11-12, G2): tests written, red until tickets #8 to #11

| AC | Test | State |
|---|---|---|
| AC-1 | `tests/unit/run-deck.test.ts` (link forms, exclusions, header and code, the plan with a stand-in resolver: missing, not a note, ambiguous, order) | written |
| AC-2 | `tests/unit/run-kinds.test.ts` (`expandSelection`); `tests/plugin/run-runner.test.ts` (a folder, several choices) | written |
| AC-3 | `run-kinds` (`kindOf` table, `checkKindRules`) | written |
| AC-4 | `tests/unit/run-cards.test.ts` (the run with a stand-in compiler: order, unknown kind, unreadable note, warning order, fit facts, settings reach the reader and sheet, no cards, no PDF); `tests/integration/us-005-run.test.ts` (real compile) | written |
| AC-5 | `tests/unit/run-output.test.ts` (`checkOutputFolder` table); `tests/plugin/run-disk-writer.test.ts` (real files); `tests/plugin/run-sources.test.ts` (one writer, no delete) | written |
| AC-6 | `run-output` (names, run name) | written |
| AC-7 | `run-runner` (ask once naming both files before any read; Cancel; no question without a file) | written |
| AC-8 | `run-output` (the file's text); `us-005-run` (the composed file) | written |
| AC-9 | `run-runner` (refusals before anything, busy guard, settings at run time, menu entries read nothing, the deck command); `tests/unit/run-settings.test.ts` | written |
| AC-10 | `run-sources` (no vault write call, reading-only dependencies) | written |
| AC-11 | `us-005-run` (two fresh processes) | written |
| AC-12 | `us-005-run` (the composed deck) | written |
| AC-13 | manual check `docs/technical/manual-checks/M01.md` on a generated scratch vault | run 2026-11-12 (build 0.1.0-m01.3, steps 1 to 12) with open points (step 5 details, step 10, notice texts); **the run on the real vault is open** |

New support: `tests/support/run-fixtures.ts` (the composed vault, the runner's
dependencies with the real compile, a recording writer), `us-005-run-cli.ts`.
The modules the tests import do not exist before the tickets:
`src/core/run/{deck,kinds,select,names,output,report,settings,run}.ts` and
`src/plugin/{disk-writer,runner,commands}.ts`. The whole-tree typecheck is
red only for these imports (SCAR-044); the 202 unit and 57 integration tests of
US-001 to US-003 stay green.

Tickets: #8 the pure core (`run-deck`, `run-kinds`, `run-output`), #9 settings
and `runCards` (`run-settings`, `run-cards`), #10 the plugin layer
(`run-disk-writer`, `run-runner`, `run-sources`), #11 PDF level, determinism and
the manual check (`us-005-run`). Order: #8, #9, #10, #11. The whole-tree
typecheck is green only after #11 (SCAR-044); each ticket names the errors
that may remain.

## Ticket #8 (2026-11-12)

Gate as the ticket states: eslint 0, prettier 0, `npm run lint` 0; unit tests
303 passed (US-001 to US-003 and the three files of this ticket: 101), the
integration tests 57 passed; the whole-tree typecheck is red only in the files
of later tickets (`run-cards`, `run-settings`, `run-runner`, `run-disk-writer`,
`us-005-run`, `run-fixtures`, `us-005-run-cli`).

First green run: all 94 tests passed at once, so each assertion was read again
against its criterion. Mutation check (60 mutants over the six modules and the
header refactor, backup and checksum): 52 caught at once; the survivors were
read as "can the test input reach the code?": six real test gaps (escaped pipe,
link title, angle form, tilde fences, case-only ties, trailing slash in a run
name), one test that could not tell (the ambiguity stand-in never matched a path
target: the stand-in now answers by name alone), two dead pieces of code
removed (the second note filter in folder expansion, a `~` branch the
"not absolute" check subsumes), one equivalent mutant (the fence-opening line);
all caught or explained after the fixes.

## Ticket #9 (2026-11-12)

Gate as the ticket states: eslint 0, prettier 0, lint 0; unit tests 323 passed
(US-001 to US-003, #8 and the two files of this ticket: 20), integration 57;
the whole-tree typecheck is red only in `run-runner`, `run-disk-writer`,
`us-005-run` and `us-005-run-cli` (the plugin ticket's modules).

First green run: 17 of 17 at once; assertions read again. Mutation check
(32 mutants over `settings.ts` and `run.ts`, backup and checksum): the first
round left four alive; each read as "can the input reach the code?": the guard
before any read (a formatting mismatch of my script, retried: caught), a
non-default spell tags property (no test: added), a compile message of several
lines (added), several settings problems at once (added), and the dedicated
"no cards" guard, which was dead code (the sheet refuses zero cards with the
same message and never compiles): removed. All caught after the fixes.

## Ticket #10 (2026-11-12)

Gate as the ticket states: eslint 0, prettier 0, lint 0; unit and plugin tests
372 passed (all of US-001 to US-003 and #8, #9 and the plugin files), integration
57 (the PDF-level file of #11 excluded); typecheck red only in `us-005-run` and
`us-005-run-cli`.

Found at the ticket's review: the ticket promised a tested key rule for the
confirmation (SCAR-013) and the G2 tests had none. `tests/unit/run-confirm.test.ts`
(13 tests: the dialog text, Escape, Enter on the focused button, no action in a
composition) was written before the code and `core/run/confirm.ts` follows it.

First green run: 45 of 45 at once; assertions read again. Mutation check (50
mutants over `confirm.ts`, `disk-writer.ts`, `runner.ts`, `commands.ts`, backup
and checksum): six survived the first round and each was a real gap: nested
folders and an empty folder from the writer, the deck's warnings ahead of the
cards' in the file, a Windows output folder, an upper-case `MD` extension, the
guard freed in `finally` (my script first could not match it: two lines alike).
Two of my new tests polluted the shared vault map (a note added under `skills/`
changed another test's folder listing): found at once, the test now deletes it.
All caught after the fixes.

## Ticket #11 (2026-11-12)

Whole tree green: typecheck, build, lint exit 0; `npm test` 383 passed (unit,
plugin and tooling); `npm run test:integration` 61 passed (US-001 sheet 22,
support 3, skill card 19, spell card 14, US-005 run 4 — counts of the files).
`tests/integration/us-005-run.test.ts` was written at G2 and passed as soon as
the runner existed; this ticket proved it (mutation) and added the rest.

**A gate defect found and fixed:** `npm test` ran only `tests/unit`, so the
plugin tests of #10 never ran in the project's own gate (they had been run by
hand). The script now runs `tests/unit tests/plugin tests/tooling`; proof
(SCAR-006): with a deliberately failing test in `tests/plugin`, `npm test`
exits 1; without it, 0. `CLAUDE.md` says so.

New in this ticket: the generator of the scratch vault
(`tests/fixtures/generate-vault.ts`: invented notes, a new folder only, the
same files every run; `tests/tooling/generate-vault.test.ts`, 8 tests), the
manual-check index and file (`docs/technical/manual-checks.md`, `M01.md`) with
the guard of SCAR-029 (`tests/tooling/manual-checks.test.ts`, 3 tests).
Corrections of my own first versions: the deck note's markdown link keeps its
`../` as written (the test expected it stripped); the image is a real 1x1 PNG
written as bytes.

Mutation check of the composed flow (9 mutants against `us-005-run` alone):
all caught except one equivalent (two pushes into independent arrays).
M01 is run after US-008 (nothing to install before); it also measures the
real link lookup (stand-in until then).

## US-008 the plugin inside Obsidian (2026-11-12, G2): tests written, red until tickets #12 to #14

| AC | Test | State |
|---|---|---|
| AC-1 | `tests/plugin/us-008-compiler.test.ts` (the worker core's PDF and facts equal the reference compile; a Typst error; compile before init) | written |
| AC-2 | same file (no `fetch`/`XMLHttpRequest`; the embedded text decodes once, only when asked; invalid text refused; a failed decode retried) | written |
| AC-3 | same file (one at a time; an error answers a message; a worker error restarts; a worker that cannot start; unload, including a worker still starting) | written |
| AC-4 | `tests/unit/us-008-settings-file.test.ts` (defaults, merge, wrong types named, copies); `us-008-adapters` (the refusal names the file); `us-008-wiring` (no `saveData`) | passing (2026-11-12, #14) |
| AC-5 | `us-008-adapters` (vault access, check callback, menus); `us-008-wiring` (main.ts only hands over) | passing (2026-11-12, #14) |
| AC-6 | `us-008-adapters` (the modal: focus on Cancel, Escape, Enter on the focused button, composition, close = Cancel, first answer counts); `us-008-wiring` (keys by `dialogKey` only) | passing (2026-11-12, #14) |
| AC-7 | `us-008-compiler` (nothing at creation; one worker, buffers handed once) | written |
| AC-8 | `tests/tooling/us-008-build.test.ts` (licence report, allowed list, `argparse`) | passing (2026-11-12, #13); the real bundle's report read with `npm run build`: 10 packages, all allowed, no `argparse` |
| AC-9 | same file (test install: files, version, not a vault, data.json untouched, a second install) | passing (2026-11-12, #13); installed in a scratch vault, checksums equal the fresh build, the vault's other 12 files unchanged, a second install refused |
| AC-10 | same file (`checkRelease`; the release script never publishes; the scripts exist) | passing (2026-11-12, #13); `release:build` itself is not run until a release (it needs a committed tree and release notes) |
| AC-11 | `us-008-wiring` (Node's file system only in the writer; manifest) | passing (2026-11-12, #14) |
| AC-12 | manual check `M02` (compile in the author's Obsidian), written with #13; M01 follows | M02 written, spike build installed (0.1.0-m01.1), **waits for the author's measurement** |

Support: `tests/support/fake-dom.ts` (an element that records children, listeners,
focus and events: carries only what Obsidian's `createEl`, `addEventListener` and
`focus` give).

**Proven against a throwaway reference** of the worker core, the client and the
codec (outside the repository, removed): 15 of 15 compiler tests pass; the
first run showed that the unload test never reached its case (`dispose()` ran
before any worker existed) and, once it did, that a worker still starting when
the plugin unloads would never be terminated: the test now fails against a
client without that check and passes with it. Not proven by a reference: the
settings file, the adapters, the modal, the build functions (their tests are read
assertion by assertion at the first green run).
Five guards pass already (the manifest, no `saveData`, Node's file system only in
the writer, the scripts' absence is not a pass: they are in the red set).
The rest is red only for missing modules (66 failures, all "Cannot find module").

Tickets: #12 the compile worker (`us-008-compiler`), #13 build, test install,
release scripts, the spike build and M02 (`us-008-build`), #14 the Obsidian
side (`us-008-settings-file`, `us-008-adapters`, `us-008-wiring`). Order: #12,
#13, #14. The whole-tree typecheck is green only after #14 (SCAR-044): the
settings-file test imports `plugin/settings-file` statically.

**#14 (2026-11-12):** the whole tree is green: 467 tests (unit, plugin, tooling),
61 integration, typecheck, eslint, prettier. Two slips of mine in the G2 tests
were found by the code and corrected, not hidden: the wiring test required
`confirmReplace: confirmReplaceWith(Modal)` although the adapters test (and the
runner) need the app handed to the modal, so the text check now requires
`(files) => confirmReplaceWith(Modal)(this.app, files)`; and the fake
`getFirstLinkpathDest` did not match a link by file name (`pic.png`), which
Obsidian does. Mutation checks on settings-file, obsidian-deps, ui and runner:
ten mutants, nine caught; the survivor shares the frozen default objects, which
nothing can change (equivalent). Not measured in Obsidian: the real `Modal`,
`getFirstLinkpathDest`, `file-menu` and `files-menu` events and `loadData`: that
is M01 (steps 7 and 8 and the whole run).

## US-008 amendment 2026-11-12 (AC-13: the worker decodes), G2: tests written, red until ticket #15

| AC | Test | State |
|---|---|---|
| AC-1 | `us-008-compiler` (the init now carries texts; the reference compare is unchanged) | adapted, passing (2026-11-12, #15) |
| AC-2 | same (`gzipBase64` and `decodeWasm` inverse; not base64 / not gzip refused; no `fetch` or `XMLHttpRequest`); the lazy-decode tests of `lazyWasm` are gone with it | adapted, passing (2026-11-12, #15) |
| AC-7 | same (nothing at creation; one worker, the texts handed over once; the init carries strings, not buffers) | adapted, passing (2026-11-12, #15) |
| AC-13 | same, describe `the worker decodes` (ready after the decode; a text that cannot be decoded answers `failed` and a valid init on the same core works; none and one font text; a failed decode reaches the caller as a message and the next request starts a new worker; a text check that no main-thread module decodes and `lazyWasm` is gone; a text check that `embedded-assets` hands over the whole embedded texts, added after a mutant survived) | passing (2026-11-12, #15) |
| AC-13 (effect) | the trace of build 0.1.0-m01.3 in the author's Obsidian, recorded in M02 (second run) | measured 2026-11-12: no long entry in the first compile (one run; scope in M02) |
| trace | `us-008-trace` (dependency names `compilerText`, `fontTexts`; a rejected `startWorker` is logged and rethrown) | adapted, passing (2026-11-12, #15) |

The tests are adaptations of tests proven against a throwaway reference at G2 of
#12; they were run against the current code and fail for the stated reasons (the
old core and client take buffers, decode on the main thread and keep `lazyWasm`):
18 of 27 in the two files fail, 9 pass (the codec's inverse and refusal tests, the
trace's other cases, `dispose` without a compile). The new text check and the
failure-and-recovery test are proven by a mutation after the code (SCAR-023, as
`ef2308d` asks: stated, not hidden). The whole-tree typecheck is red until #15
(the tests use the new dependency names; SCAR-044).

**Code (#15, 2026-11-12):** 480 tests (unit, plugin, tooling) and 61 integration
pass; typecheck, eslint and prettier are clean. Mutations on the worker core, the
client and the assets: six, all caught (the compiler text not decoded, the fonts
not decoded, a stale compiler after a failed init, a failed init treated as
ready, an `atob` on the main thread, and one font text handed over: the last one
survived the first run, because the embedded modules exist only in the bundle,
and is now caught by the text check on `embedded-assets.ts`). Not measured: the
effect in Obsidian: the trace of build 0.1.0-m01.3 (M02, follow-up, second run).

## US-007 the settings screen (2026-11-12, G2): tests written, red until the tickets

| AC | Test | State |
|---|---|---|
| AC-1 | `tests/unit/us-007-fields` (the fields of the three pages, 17 in all, labels and groups, kinds); `us-007-wiring` (the tab is a `PluginSettingTab` named `Game Card Creator`, the three page names) | written |
| AC-2 | `tests/unit/us-007-status` (ready, one rule, normal form, not ready with the checks' messages in order, pages' problems, no card fits once, a range problem without a second grid message, the vault as folder) | written |
| AC-3 | `us-007-fields` (`fieldKey`: Enter commits, not during a composition or key code 229); `tests/plugin/us-007-commit` (a toggle; not a number; refused values leave the file unchanged) | written |
| AC-4 | `us-007-wiring` (exactly one `commitSetting(`, two `commitRule(`, one `resetPage(` in the tab; the rows from `fieldsOf`; no `saveData`, `.write(` or `loadData` in the tab; no second path for the dialog's answer) | written |
| AC-5 | `us-007-commit` (`/tmp//out/` becomes `/tmp/out`; inside the vault allowed, no warning; seven refused forms with the messages of `checkOutputFolder`); `tests/plugin/us-007-folder-dialog` (A then B then unavailable, cancel, a throw, start folder, availability) | written |
| AC-6 | `tests/plugin/us-007-rules` (append, replace in place, order, a missing folder warns and is saved, the refused rules with `checkKindRules`' messages, deleting, a stale index, a hand edit in between, one queue with the fields) | written |
| AC-7 | `us-007-commit` (empty name, duplicate names without case, a name saved trimmed, a label may be empty) | written |
| AC-8 | `us-007-commit` (the table: 7 numbers x 4 examples that commit x 2 refused x 4 not-a-number forms; the size rule between two fields once; a hand-edited problem elsewhere does not block); `us-007-status` (the grid line, 7 cases) | written |
| AC-9 | `tests/plugin/us-007-reset` (the question names the page, Cancel focused; only the keys of the page; the file loaded now; the modal: Escape, Enter on Cancel and on Reset, click, composition, close, first answer) | written |
| AC-10 | `tests/plugin/us-007-store` (backup before the first write; once; never over an existing copy; none without a file; a failed copy stops the write; only the two paths); `us-007-wiring` (`saveData` in main.ts and the store only; the backup name; `.copy(` only in the store) | written |
| AC-11 | `us-007-commit` and `us-007-rules` (the file is loaded for every commit; two commits at once lose nothing; a failing read or write is a message) | written |
| AC-12 | `tests/plugin/us-007-notice` (the refusal notice text; the output-is-a-file refusal; without the path as before) | written |
| AC-13 | manual check M04 (written with the tickets, G3): the real tab, the open tab, `defaultPath` | pending |

Support: `tests/support/memory-store.ts` (a settings store in memory: `read` and `write` like
`loadData` and `saveData`, `set` for a hand edit, `writes` and `reads` counted).

**Proven against a throwaway reference** of every module, the tab stub and the three edited
files (outside the repository, removed; the three files restored from backups, checksums
checked): 200 of 200 pass in the nine new files and 696 of 696 in the tree. The reference
found **two slips of my own in the tests** and one conflict with an older guard, all before
the tickets: (1) the wiring text said `saveData` is called only from `main.ts`, but the store
must call the one it is given: now two places, each counted; (2) US-005 AC-10's text check
forbade `adapter.copy` anywhere, wider than its criterion (a *run* changes no vault file):
narrowed to the store and `adapter.copy` only, with a check that a run never reaches the store;
(3) `loadData()` must stay one call in `main.ts` (US-008's check): the runner reads through
the store. Seven mutants on the reference (invalid values saved, an existing backup
overwritten, commits not serialised, reset touching every page, Enter during a composition,
the dialog always starting in Documents, a rule problem already in the file blocking other
rows): all caught (a first round ran with a broken shell filter and found no test files: it
was discarded and redone). Not proven by a reference: the real tab (`Setting` rows, the
Back control, blur events): M04.

**Tests of earlier stories that this story's tickets change** (SCAR-023, listed now):
`us-008-wiring` "only main.ts imports Obsidian" (now `main.ts` and the tab) and "no file calls
saveData" (now `main.ts` and the store), `run-sources` "no file calls a write ... on the vault
or its adapter" (now: all but the store, and the store only `adapter.copy`), and
`us-008-adapters`' notice tests (the text `Settings file:` is replaced by `See Settings →
Game Card Creator (file: …)`; its tests check only the path and the setting, and still pass).

The whole-tree typecheck is red until the code ticket (SCAR-044): the new tests import the
eight modules of `src/plugin/settings/` and `confirmDialogWith` of `ui.ts`, which do not exist.

**#17 (2026-11-12):** the code of the core is written. `us-007-fields`, `-status`, `-commit`,
`-rules` and `-reset` pass (162 of 162; with `us-008-adapters` 182); `npm test` has 658 passing
and 17 failing, all of tickets #18 and #19; integration 61 of 61. Sixteen mutants on the code,
all caught.

**#18 (2026-11-12):** `store.ts` and `folder-dialog.ts` are written. `us-007-store`,
`us-007-folder-dialog` and the narrowed `run-sources` pass (28 of 28); `npm test` has 681 passing
and 15 failing, all of ticket #19; integration 61 of 61; the whole-tree typecheck is clean (it was
expected red until #19: wrong, #19's tests do not import the tab). Thirteen mutants, all caught.
