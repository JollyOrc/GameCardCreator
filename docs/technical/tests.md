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

**#19 (2026-11-12):** the tab, the notice and `main.ts` are written; `us-007-notice`,
`us-007-wiring` and the amended `us-008-wiring` pass; `us-007-tab-helpers` (8 tests, `groupsOf`
and `suggestFolders`) was added; `npm test` 704 of 704, integration 61 of 61, typecheck, eslint,
prettier clean. Two G2 text checks were narrowed at this ticket, each to its criterion: the page
names come from `PAGE_TITLES` (the tab must use it), and one `bindInput` serves every input (Enter
by `fieldKey`, blur), each statement matched whole. Twelve mutants on the tab, `main.ts` and the
runner, all caught. **Measured in Obsidian (M04, build 0.1.0-m01.5, the author's run):** the tab works ("basically all ok"), the dialog starts at the stored folder, the backup is made once and is byte-identical, a hand edit while the tab is open is kept, 6 cards per page with the margin at 15; two findings (F1 fixed, F2 a change request); details in M04.md.

## Ticket #20 (2026-11-12): the deck note in the context menu (US-005 AC-9 amended, D7; US-008 AC-5)

`tests/plugin/run-menu-deck.test.ts` (16): one Markdown note gives `Create cards` then `Create cards
from this deck note` (the same name as the command), the clicks run the selection and the deck
(`Opening Deck`, `a.b`, `X.MD` as `X`), a folder (even `x.md`), a non-note file and several items
give only `Create cards`, no choice none, building reads nothing, and the same through `onFileMenu`
and `onFilesMenu`. Eight failed against the old code, then green; ten mutants caught. 727 of 727 in
the tree. **Not measured:** which Obsidian menus show the item (M05, build 0.1.0-m01.6).

## Ticket #16 and the release preparation (2026-11-12)

`tests/tooling/no-diagnosis-code.test.ts` (5): the diagnosis files are gone, no source file names
a trace or a spike (at least 40 files looked at), `main.ts` registers no spike command and no
`console.log`, `checkBundleText` of the release script names the build folder and `GCC trace` and
`GCC spike`, and `release.mjs` calls it. Red against the old code (all 5), green after the removal
of `trace.ts`, `picker-spike.ts`, `spike-sheet.ts`, their two test files and the spike code in
`main.ts`; five reintroduction mutants caught. The real built `main.js` has no marker (16 350 921
bytes). `tests/tooling/min-app-version.test.ts` (3): the manifest's `minAppVersion` is at least the
highest `@since` of the five Obsidian APIs the plugin uses, read from the pinned type definitions
(1.6.6, from `getAllFolders`), and `versions.json` maps the release version to it; a mutant with
1.5.0 fails 2 of 3. Whole suite: 713 plugin, unit and tooling tests and 61 integration tests pass;
typecheck, eslint, prettier clean.

## US-004 creature card (2026-11-12, G2): tests written (red by design)

| AC | Test | State |
|---|---|---|
| AC-1 | `unit/creature-read` (example, text rules with the creature codes, other shapes); `integration/creature-card-pdf` AC-1 | `creature-read` green (ticket #22, 2026-11-13; two G2 expectations corrected, see the ledger); the PDF part with #24 |
| AC-2 | `creature-read` AC-2 (case, levels, ends, missing, optional Signs, headings as settings; callout and list headings are no sections; the first of two equal headings) | green (ticket #22) |
| AC-3 | `unit/creature-statblock` (fixture is the real answer, the call, reading an answer; added at #23: unavailable warning, files of several answers, malformed shapes) | green (ticket #23, 2026-11-13) |
| AC-4 | `creature-card-pdf` AC-4 (band 11.5, 9.04, 16.43 pt; data used as given) | green (ticket #24) |
| AC-5 | `unit/creature-fit`; `creature-card-pdf` AC-5 (two scans, overflow, dropped parts gone; the five triples of the story, measured again at #24) | green (ticket #24) |
| AC-6 | `creature-card-pdf` AC-6 (the real literal answer; special characters) | green (ticket #24) |
| AC-7 | `creature-card-pdf` AC-7 (order, slots, containment to 0.1 mm) | green (ticket #24; one G2 expectation corrected) |
| AC-8 | `creature-card-pdf` AC-8 (two fresh processes) | green (ticket #24) |
| AC-9 | `creature-card-pdf` AC-9 (once, 5 pt, centred, band, per page, null, two lines); `run-creature` | green (#24, #26); in Obsidian: M06 |
| AC-10 | manual look, 4x, with the code ticket | looked at by the developer at #24 (450 ppi, seven cards: small, typical, long, overflow, a dropped part, no statblock; a gap under the headings found and fixed); the author's look is in M06 (#26) |
| AC-11 | `creature-statblock`, `run-creature`, `creature-card-pdf` (card without statblock) | green (tickets #23, #24, #26) |
| AC-12 | `plugin/creature-compile` (files, font, nothing leaks; added at #25: the diagnostic names the file, the kept compiler, init drops it, own fonts stay, files with fonts); `run-creature` | compile part green (ticket #25, 2026-11-13); the run with #26; the worker inside Obsidian: M06 |
| AC-12a | equal files merged (`run-creature`); different bytes: the later card without statblock and the conflict warning (`run-creature`, `creature-statblock`) | green (#23, #26) |
| AC-13 | `creature-settings` (with the fields' labels), `plugin/creature-screen`, `unit/us-007-fields` (amended, 20 fields), `card-codes` (no literal `CREATURE_`) | green for the settings, the screen and the fields (ticket #21, 2026-11-13); `card-codes` with #22 |
| #24 side effects | new `card-single-size` (one size is a list of one; a defect of the older kinds, found by AC-4), `creature-card-headings`, the triples and prelude tests in `creature-card-pdf`, `fit` mixes; amended: `card-sheet`, `run-cards` (the size list has a trailing comma), `card-escape` (seven escaped places) | green |
| #27 | AC-9 amended: `creature-card-pdf` (band under 3 mm, the default sheet, no credit, exactly 3 mm, one decimal), `run-creature` (the run's warning) | green (2026-11-13) |
| #26 side effects | new `plugin/creature-runner` (the runner hands the API and the extra over; `pluginApi` reads at each call; one place reads the other plugin; `main.ts` decides nothing); `run-creature` gained: one look-up and one fonts call per run, no fonts without a statblock, non-default headings, the notice says why (missing plugin); removed `run-creature-rule` (its guard is gone); manual check M06 | green; M06 waits for the author |
| #21 side effects | amended old tests: `us-007-reset` and `us-007-tab-helpers` (the creature page keys and group), `us-007-rules` and `run-kinds` (the unknown kind in their examples is now `monster`), `run-settings` (defaults); new `run-creature-rule` (an interim guard, removed with #26) | green |

New support: `tests/support/creature-fixtures.ts` (a copy of the real 0.15.1
answers), `creature-sheet-cli.ts`, `tests/fixtures/fonts/` (DejaVu Sans Mono
with its licence, a family the plugin does not bundle); `typst-node` and
`card-sheet` take the answer's files. Interfaces the tests fix: `creature/{read,
settings,statblock}.ts`; `cardSheetTypst(...)` returns `files`; `RunDeps.statblockApi`
and `compile(source, extra?)`; the worker's compile message carries `files` and
`fonts`; the fit fact `dropped`. Result: `npm test` 715 passed, 33 failed in 9
files, all new or amended; integration 61 passed, the creature file does not load.

## US-009 colour-coded headers and icons (2026-11-13, G2): tests written (red by design)

| AC | Test | State |
|---|---|---|
| AC-1 | `unit/scheme-read` (the note, 35: the example, every table form one by one, front matter, CRLF and BOM); `unit/scheme-settings` (the path check, defaults, the settings file); `unit/run-scheme` (when the note is read, at every run, never kept); `unit/card-sheet-golden` (no scheme: the source is the golden text, 6 decks, **green already: it guards the old output**) | written; the golden test green |
| AC-2 | `unit/scheme-branches` (order of the note's tags, spelling, duplicates); `unit/run-scheme` | written |
| AC-3 | `integration/scheme-card-pdf` (flat band: box, colour, header on it, text 2 mm under, frame over the band); `integration/pdf-graphics` (the instrument, SCAR-028) | written |
| AC-4 | `scheme-card-pdf` (gradient: stops, offsets, axis; 2 and 3 colours; order) | written |
| AC-5 | `scheme-card-pdf` (icons: glyph, order, right edge, wrap before icons, band grows); `unit/scheme-icons` (496 names, code points read from the font's CSS); `plugin/scheme-font` (the glyph is drawn with the build's font list, absent without it) | written |
| AC-6 | `unit/run-scheme` (the warning and its detail; none without scheme or valid row) | written |
| AC-7 | `unit/scheme-read` (every refusal with its detail), `unit/run-scheme` (a bad note never stops a run), `unit/scheme-icons` | written |
| AC-8 | `scheme-card-pdf` (sizes unchanged at 7 pt, text below the band, the rules of US-002 kept) | written |
| AC-9 | `scheme-card-pdf` (mixed deck), `unit/run-scheme` (a creature card gets nothing) | written |
| AC-10 | `unit/run-scheme` (the text), `scheme-card-pdf` (5 pt, centred, joined with the creature credit, per sheet) | written |
| AC-11 | `unit/scheme-settings` (fields, the line under the field), `plugin/scheme-screen` (commit, reset, the tab and `main.ts` only hand over); amended: `us-007-fields`, `us-007-tab-helpers`, `us-007-reset` | written |
| AC-12 | `tooling/rpg-awesome` (font file, `fontFiles`, the OFL text, the notices), `plugin/scheme-font` | written |
| AC-13 | `scheme-card-pdf` (two fresh processes, `support/scheme-sheet-cli.ts`) | written |
| AC-14 | manual look at 4x and the contrast over every gradient of the author's scheme: with the code ticket (M07) | pending |
| AC-15 | `unit/scheme-settings` (range, margin, cut marks), `scheme-card-pdf` (six cases of gap and bleed, the last card of four, the gradient axis, the bottom, the text unmoved), `plugin/scheme-screen` | written |

New support: `tests/support/pdf/graphics.ts` (fills, gradients, strokes and their drawing order; checked on a known PDF in `integration/pdf-graphics`, 3 tests, green), `scheme-fixtures.ts`, `scheme-sheet-cli.ts`; `makeSheet` takes `{iconCredit}`; `typst-node` loads the icon font (`assets/fonts/RPGAwesome.ttf`, added at G2 because the tests compile glyphs with it); `pageContent` of `pdf/text.ts` is exported. Interfaces the tests fix: `src/core/scheme/{read,branches,icons,settings}.ts` (`readScheme`, `branchesOf`, `iconCodePoint`, `ICON_NAMES`, `checkSchemeNote`); `schemeCode` in `card/warning.ts`; `SkillCard.rawTags` and `.branches`; `SheetSettings.bleed`; `CardsSettings.schemeNote`; `cardSheetTypst(cards, sheet, sizes, headings, {iconCredit})` (the result is unchanged); the fields `schemeNote` and `sheet.bleed`; `schemeLine` in `settings/status.ts`; `noteExists` in the tab's dependencies; `fontFiles(dir)` in `build/build-plugin.mjs`; the notice file `assets/fonts/RPGAwesome-OFL.txt`.

Result: `npm test` 838 passed, 46 failed in 12 files (all new or amended); `npm run test:integration` 103 passed, 23 failed (the PDF tests of the card; the instrument's 3 and the earlier ones green). Proven against a throwaway reference (scratch copy, discarded): the card and PDF tests (28), the reader, branches and icons tests (49, plus two mutants of the reader caught). **Not proven against a reference** (named for the tickets): `run-scheme`, `scheme-settings`, `scheme-screen`, `tooling/rpg-awesome`, `scheme-font`.

**Ticket #28 (2026-11-13), green:** `unit/scheme-read` (36, one added: a front matter that is not valid YAML), `scheme-branches` (8), `scheme-icons` (6), `card-codes` (the scheme codes, 3), new `tooling/icons-table` (4: the committed `icons.ts` is the generator's output for `assets/fonts/RPGAwesome-icons.txt`, byte for byte). Still red, for the later tickets: `scheme-screen`, `scheme-settings`, `us-007-*` (amended) #29; `run-scheme` #32; `scheme-font`, `rpg-awesome` #33; `scheme-card-pdf` #30, #31, #33.

**Ticket #29 (2026-11-13), green:** `unit/scheme-settings` (the path check, the bleed limits incl. a refused margin, the settings file, the fields, `schemeLine`), `plugin/scheme-screen` (15; the spaces-only case corrected: the screen trims, so it saves empty), amended `us-007-fields`, `us-007-tab-helpers`, `us-007-reset` (G2) and, at the code, the older tests that pin the whole settings: `sheet-layout` (defaults gain `bleed: 0`), `run-settings` (`schemeNote: ''`), `us-007-commit` (the whole-file read-back now also commits a bleed and a scheme note). Still red: `run-scheme` (#32), `scheme-font` and `rpg-awesome` (#33), `scheme-card-pdf` (#30, #31, #33).


**Ticket #30 (2026-11-16), green:** `integration/scheme-card-pdf` AC-3, AC-4, AC-5, AC-8, AC-9, AC-15 and AC-13 (25 of 28; the three credit tests are #31's), new `unit/card-sheet-band` (9: a colour or icon not in the checked form never reaches the source, written after the mutation round found the two guards unreached), new `integration/scheme-card-fit` (7 body lengths: a text that "fits" lies inside the text area under the band, written after the round found the fit's header term unreached); amended: none; `card-escape` stays at seven escaped places (the band's header and body builders share `headerLines` and `bodyLine`, so no new interpolation of user text). Measured on the vault's 174 skill and spell notes (read-only, numbers only; 173 carry a branch in the author's draft scheme): before 174 fit at 7 pt, after 174 fit at 7 pt (AC-8). Scope of every bound: this layout, this typeface, the default sizes.

**Ticket #31 (2026-11-16), green:** `integration/scheme-card-pdf` AC-10 group (4 of 4), new `unit/card-sheet-credit` (9: one text per sheet that has an icon, trimmed; none for no icon, a blank text or no option; the helper defined only when a line can be printed; escaping; the omitted-credit report for the joined line; the creature credit first with a full stop only when it has none of `.!?`; a blank icon credit on a low band reports nothing); `creature-card-pdf` AC-9 and `run-creature` credit tests stay green. `cardSheetTypst` takes `options.iconCredit`; `joinCredits` is the one function that makes the line for both credits; `gcc-credit` moved into its own prelude (`CREDIT_PRELUDE`), byte-equal text.

**Ticket #32 (2026-11-16), green:** `unit/run-scheme` (22: the scheme note read once per run with a skill or spell card, trimmed path, never kept; the colours in the source; the branch warnings with the tags as written; a bad note never stops a run; the credit text), `run-cards`, `run-creature`, `run-kinds`, `card-codes` stay green. One G2 test error corrected: the stand-in compiler of `run-scheme` wrote no fit facts, so every card gave `FIT_UNKNOWN`; it now writes one fact per `gcc-fit`, `gcc-fit-b` or `gcc-fit-c` call, as `run-cards` does.

**Ticket #33 (2026-11-16), green:** `tooling/rpg-awesome` (4), `plugin/scheme-font` (2, through `fontFiles` of the build, the real consumer path), `integration/scheme-card-pdf` AC-13 (two fresh processes). `npm run build` embeds both fonts (main.js 15.8 MB). Whole suite after #33: `npm test` 995 passed / 0 failed, `npm run test:integration` 133 passed / 0 failed.

**Fixture copied again from Obsidian2Typst 0.15.2 (2026-11-16):** `tests/support/creature-fixtures.ts` (the answer's prelude; the data and the files equal 0.15.1's, proved by comparison; the rest of the prelude equals the old one with the band's piece cut out, Obsidian2Typst US-041) and the golden source `mixedWithCreature` in `tests/fixtures/golden/no-scheme-sources.json` (the same prelude swapped in; every other golden source unchanged). `npm test` 995 passed, `npm run test:integration` 133 passed.

## US-010 a warning when a card's text has a character no font draws (2026-11-17, G2): tests written (red by design)

Titles start with `US-010 AC-n` in nine new files; the example notes are invented and the stand-in coverage is a Latin
face and an "extra" face (`tests/support/glyph-faces.ts`, run lengths as the compiler gives them); the worker and
end-to-end tests use the real typst.ts, the font list the build embeds (`fontFiles`) and DejaVu Sans Mono as an extra
font (it draws ✓ and ⌘, which Libertinus does not). The new modules are loaded at run time (they do not exist yet).
With the original code: 49 red by design (47 unit and plugin, 2 integration), every other test passes (1004 and 135).
Proven against a throwaway reference (five existing files patched in place with a backup and a checksum list, two new
modules; restored, `shasum -c` OK, the new modules removed): all 59 new tests pass there and the whole suite is green
(1050 and 137, so no existing test is touched, SCAR-027); a mutation round over the reference: 35 mutants (the ignored
characters one by one, the limit of ten at 9 and 11, the count of `more`, the hexadecimal width and case, the order, the
name of a creature with and without a statblock, empty sections, lists, tags, details, the kind's code, the statblock's
text read by mistake, the decoding of the run lengths, half-open ranges, the faces adding up, the fonts handed to the
coverage, the reason and the path of the unavailable warning, the worker ignoring the extra fonts or accepting non-fonts,
the client's `fonts` key and queue, the runner's refusal, the wiring): 34 caught first time, one survived (an empty list of
fonts sent as a `fonts` key) and a test was added. Three tests were wrong at the first green run and were corrected: two
checked spaces, which are not in the set by design, and one expected the wrong form of an empty path in the warnings file.

| AC | Test |
|---|---|
| AC-1 | `unit/glyph-warning` (the detail: code point order, `U+` upper-case of at least four digits, ten and `and N more`; one warning per note with the kind's code; once per character; the order of the cards), `unit/run-glyph` (the run's warnings), `integration/glyph-check` (the real fonts) |
| AC-2 | `unit/glyph-text` (the text of a skill, a spell and a creature card: title, tags, details, runs, list items, headings of drawn sections; the statblock's text, the credit and the icons stay out; the ignored characters one by one; sorted, once) |
| AC-3 | `unit/glyph-coverage` (half-open ranges, faces adding up), `unit/run-glyph` (a creature run's fonts reach the coverage; ✓ with and without them), `plugin/glyph-worker` (extra font adds its faces, nothing leaks), `integration/glyph-check` (✓ with DejaVu) |
| AC-4 | `plugin/glyph-worker` (the faces of the real fonts; non-font bytes fail; the same answer twice), `plugin/glyph-client` (the message, copies of the buffers, no key for none, failure as `ok: false`, the queue, `dispose`), `unit/run-glyph` (a rejected coverage: one unavailable warning; no dependency: no check), `plugin/glyph-runner` (the refusal becomes the warning; `main.ts` hands over) |
| AC-5 | `unit/run-glyph` (after the notes' own warnings and before the fit warnings), `plugin/glyph-runner` (the notice's count and the warnings file's line) |
| AC-6 | `unit/run-glyph` (every character drawn: same warnings and same source; two runs equal), `integration/glyph-check` (the PDF equals the PDF of a run without the check) |
| AC-7 | `plugin/glyph-worker` (`Ж → ★ ◆ ß é` drawn, `漢 😀` and U+E000 not, the icon font's U+E946 drawn) |

**Ticket #36 (2026-11-17), green:** `glyph-coverage` (7), `glyph-text` (10), `glyph-warning` (10) and `card-escape`, `card-codes` unchanged; two tests added after the mutation round (a result sorted by code point when the text is not; a range inside another face's range); mutation round on the real code: 29 mutants, 27 caught first time and two closed. The whole suite: `npm test` 1031 passed and 22 red (#37, #38, #39), integration 135 passed and 2 red (#39).

**Ticket #37 (2026-11-17), green:** `run-glyph` (15) and the existing run tests unchanged; typecheck clean; mutation round on the real run: 11 of 11 caught. The whole suite: `npm test` 1039 passed and 14 red (#38: `glyph-client`, `glyph-worker`; #39: `glyph-runner`), integration 134 passed and 3 red (`glyph-check`: green with #38).

**Ticket #38 (2026-11-17), green:** `glyph-worker` (7: one added for the order of the faces, one for a request before `init`), `glyph-client` (8: two added: a font given as a view into a larger buffer, a worker that stops or cannot start), `glyph-check` (the end to end, green with the real worker); `creature-compile`, `us-008-compiler`, `scheme-font` unchanged; mutation round: 14 mutants, 13 caught and one equivalent. The whole suite: `npm test` 1054 passed and 3 red (#39's `glyph-runner`), integration 137 passed.

**Ticket #39 (2026-11-17), code part green:** `glyph-runner` (4 after one added: a creature sheet's fonts reach the coverage and the compile as one list), `glyph-check` (6 after one added: the premise of D2 measured with the real worker: a character Libertinus lacks is drawn from an extra font that has it and is the empty glyph without it), `us-008-wiring`, `creature-runner` unchanged; mutation round on the runner and `main.ts`: 7 mutants, 6 caught first time and one closed with a test. The whole suite: `npm test` 1058 passed, integration 138 passed. The manual check M08 and the release follow.


## US-011 equal title bars (2026-11-16, G2): tests written (red by design)

New files: `unit/titles-settings` (defaults, checks, the sizes tried), `unit/titles-warning` (the warning from the kind's
fact; the fit warnings ignore it), `unit/titles-source` (off is the golden source; the fact only for a kind that is on and
has cards; the title through `typstString`), `unit/run-titles` (the settings reach the sheet; the warning's place),
`plugin/titles-screen` (the groups, `isShown`, `redraws`, commits, reset, text checks of the tab),
`integration/equal-titles-pdf` (the story's examples compiled with typst.ts and read back: title sizes, the fact, the rules
and bands, the fit sweep, the settings at the ends, the kinds separate, order and bytes, a row lined up); support
`support/title-fixtures` (the invented notes as cards). Amended (SCAR-027: they counted or listed what the story
changes): `us-007-fields` (28 fields, the layout page's ids), `us-007-tab-helpers` (the two groups), `scheme-settings` (28
fields), `card-escape` (eight escaped places: the title in a kind's data), `skill-settings`, `spell-settings` (the
defaults hold the title keys), `us-008-settings-file`, `us-007-commit`, `us-007-reset` (the spell group holds the title
keys), `run-cards`, `run-settings` (a spell settings object written by hand gets the defaults), `support/card-sheet` (the
options pass through).

Proven against a throwaway reference implementation (a scratch worktree, deleted): every new and amended test green
there (`npm test` 1129, integration 160), lint clean; on the reference ten mutants, nine caught (no shrinking, the height of
the first card only, the header at `t`, the plain box not `H` high, nothing wrapped, the widest the first, a banded card's
own height, the icons left out of the width, a fact for a kind without cards); the tenth (the banded helper written when
no card is banded) changes no output: equivalent. On the code of 0.4.0: `npm test` 1058 passed, 29 red and two files that
cannot load the missing module; integration 138 passed, the new file red; typecheck red only in the new test files
(green with the settings and sheet tickets, SCAR-044).

| AC | Test |
|---|---|
| AC-1 | `unit/titles-source` (golden sources with the option absent, off, and off with odd sizes; the other kind's source), `unit/run-titles` (no fact asked for with the defaults), `integration/equal-titles-pdf` (spells on, skills off) |
| AC-2 | `unit/titles-settings` (the sizes tried), `integration/equal-titles-pdf` (9.1, 8.1, 7 with the icon; off: 1.3 S and the wrap of today) |
| AC-3 | `integration/equal-titles-pdf` (`H` 7.70 mm, the rules at 4 mm + `H` + 2 pt; off: three heights) |
| AC-4 | `integration/equal-titles-pdf` (Long Lesson: smaller text, title 8.1, rule with the others; off: 1.3 S) |
| AC-5 | `unit/titles-warning` (code, path, detail, one per kind, malformed facts), `unit/run-titles`, `integration/equal-titles-pdf` (t 7, `H` 7.94, two lines, the warning) |
| AC-6 | `integration/equal-titles-pdf` (bands 4 + `H` + 2 mm, `Plain`'s rule) |
| AC-7 | `integration/equal-titles-pdf` (40 to 260 words: `t` and `H` unchanged; a text that fits lies inside) |
| AC-8 | `unit/titles-source` (one fact per kind under `gcc-fit`), `unit/titles-warning` (fit warnings unchanged), `unit/run-titles` (the order) |
| AC-9 | `unit/titles-settings` (checks, messages, the kinds' checks), `plugin/titles-screen` (refusals on the screen), `integration/equal-titles-pdf` (20/7, 13/7, 6/4, 9.1/9.1, step 1) |
| AC-10 | `plugin/titles-screen`, `unit/us-007-fields`, `unit/us-007-tab-helpers`, `plugin/us-007-reset` |
| AC-11 | `integration/equal-titles-pdf` (order of the notes; the same bytes twice) |
| AC-12 | `integration/equal-titles-pdf` (a banded row and a plain row lined up to 0.1 mm, counted); the author's look and M09 at the manual check |

**Ticket #40 (2026-11-16), green:** `titles-settings` (26 after one added: a step of 0.1, whose sums leave floating-point dust), `skill-settings`, `spell-settings`, `us-008-settings-file`, `us-007-commit`, `run-cards`, `run-settings`; mutation round: 21 mutants, 19 caught first time, one closed with the new test, one equivalent (`Number.isFinite` before a range comparison). The whole suite: `npm test` 1088 passed and 42 red (#41 to #43), integration 141 passed and 19 red (#42).

**Ticket #41 (2026-11-16), green:** `titles-warning` (19 after two added: the path of the widest title when it is not the first wrapped one; a card without a kind counted as a skill), `card-codes` unchanged; mutation round: 14 mutants, 11 caught first time, two closed with the new tests, one equivalent (a primitive fact has no `titles` field). The whole suite: `npm test` 1105 passed and 27 red (#42, #43), integration 141 passed and 19 red (#42).

**Ticket #42 (2026-11-16), green:** `titles-source`, `run-titles`, `equal-titles-pdf` (23 after two added or changed: a spell card first, so card indexes differ from positions in the kind; the AC-9 step example 0.3 instead of 1), `card-escape`, the golden sources and every run test unchanged; mutation round: 20 mutants, 18 caught first time, two closed with those tests. Compile time of 200 cards in Node: off about 1 s, equal mode about 2.5 to 3 s. The whole suite: `npm test` 1113 passed and 19 red (#43), integration 161 passed.

**Ticket #43 (2026-11-16), green:** `titles-screen`, `us-007-fields`, `us-007-tab-helpers`, `scheme-settings`, `us-007-reset`, and `us-007-wiring`, `us-007-commit` unchanged; mutation round: 11 mutants, 10 caught, one equivalent (a toggle's value is always a boolean). The whole suite: `npm test` 1132 passed, integration 161 passed, typecheck clean, build ok.

## US-009 AC-3 and US-011 AC-1, AC-3, AC-6 amended (M09 finding, D8 to D10; 2026-11-16, G2): tests written (red by design)

New file `integration/band-icon-padding` (US-009 AC-3: Parry 12.22 mm unchanged, Ember Spark 10.84 mm at 7 pt and with
the largest text size 6 pt, Scorch Hex 1 mm under its lowest icon, the skull; US-011 AC-3, AC-6: spells on, `t` 7.35, `H`
4.84 mm, both bands 10.84 mm, Glow's rule under its box; the same spells off). Amended: `integration/scheme-card-pdf`
(a spell's band is lower than a skill's by more than 1 mm, no longer by 2: 10.84 against 12.22). Proven against a
throwaway reference (scratch worktree, removed): `npm test` 1132 and integration 167 green there; one test of mine was
wrong at the first run there (with the switches off the slow curse's 9.1 pt title wraps, so its band follows its
header, not its icon) and was corrected; six mutants of the reference (no padding, 3 mm padding, the icon ignored,
the first icon instead of the lowest, the icons ignored in equal mode, no padding in equal mode): all caught. On
the code of `db5a9d6`: 5 of the 6 new tests red (Parry's is unchanged by D8), every other test green.

| AC | Test |
|---|---|
| US-009 AC-3 (amended) | `integration/band-icon-padding` (four examples), `integration/scheme-card-pdf` (amended) |
| US-011 AC-3, AC-6 (amended) | `integration/band-icon-padding` (spells on and off) |
| US-011 AC-1 (amended) | `unit/titles-source` (no scheme: golden, unchanged), `integration/band-icon-padding` (off: the band follows US-009 AC-3) |

**Ticket #45 (2026-11-16), green:** `band-icon-padding` (7 after one added: Scorch Hex with Glow in equal mode, so the kind's height takes the lowest of two icons), `scheme-card-pdf` (amended at G2), `equal-titles-pdf`, the golden sources unchanged; mutation round: 7 mutants caught, one sharper variant (the first icon without failing on a card without icons) survived and was closed with that test. The whole suite: `npm test` 1132, integration 168, typecheck clean.

## US-012 equal title bands on creature cards (2026-11-16, G2): tests written (red by design)

New files: `unit/band-fixtures` (guard: the answer model equals Obsidian2Typst 0.15.2's recorded real answers; green),
`unit/creature-titles-settings` (defaults, checks naming the kind, the sizes tried at the default, ends, middle and step
0.3), `unit/creature-titles-warning` (the warning from the creature fact; the order skill, spell, creature; facts ignored),
`unit/creature-titles-source` (off is the 0.5.0 golden source; the fact; the sizes array; the name through `typstString`),
`unit/run-creature-titles` (the settings reach the sheet; the warning's place), `plugin/creature-titles-screen` (the group,
`isShown`, `redraws`, commits, both page resets), `integration/creature-titles-pdf` (the story's examples compiled with
typst.ts and read back: band sizes and lines, the fact, the band rules level, the settings, composed with skills, two
fresh processes); support `support/band-fixtures`, `support/creature-titles-cli`; fixtures `fixtures/us-012-answers.json`
(recorded real answers), `fixtures/golden/creature-sources.json` (written by the 0.5.0 code). Amended (SCAR-027): see the
story's table, last row (nine files).

Proven against a throwaway reference implementation (a scratch copy, deleted): every test green there (`npm test` 1192,
integration 186), typecheck clean, lint clean; ten mutants on the reference, ten caught (the band still scaled, no creature
warning kind, no shrinking, the refused card left out of the check, the run without the creature settings, the size always
shown, the creature titles unchecked, the refused card's title at 1.3 em, the height of the first card only, nothing
wrapped). Found while proving: one story number (AC-3: 200 words give 6.5 pt today, not 6; amended to 260 words); the test
reader counted the ◆ marks of a wrapped name as a third line (they sit between its lines, US-041; fixed in the reader,
SCAR-028); six earlier tests pinned the old membership (listed in the story). On the code of 0.5.0: `npm test` 1156 passed,
36 red (US-012 files and the amended pins); integration 172 passed, 14 red (the new file); typecheck red only in the new
test files (green with the settings and sheet tickets, SCAR-044).

| AC | Test |
|---|---|
| AC-1 | `unit/creature-titles-source` (golden with the option absent, off, off with odd sizes, skills on), `unit/run-creature-titles`, `integration/creature-titles-pdf` (off: 11.5 and 9.86 pt) |
| AC-2 | `unit/creature-titles-settings` (sizes tried), `integration/creature-titles-pdf` (run A 11.5, run B 7.75, the one-word name) |
| AC-3 | `integration/creature-titles-pdf` (260-word Fen Hare: band 11.5, VIGOUR at 5.5 S / 7) |
| AC-4 | `unit/creature-titles-warning`, `unit/run-creature-titles`, `integration/creature-titles-pdf` (smallest 9: two lines, 10.24 mm, the warning) |
| AC-5 | `integration/creature-titles-pdf` (the refused ferryman: 8.5); `unit/creature-titles-source` (its name escaped) |
| AC-6 | `integration/creature-titles-pdf` (two compiles, same facts) |
| AC-7 | `unit/creature-titles-source` (one fact under `gcc-fit`), `unit/creature-titles-warning` (fit warnings unchanged) |
| AC-8 | `unit/creature-titles-settings`, `plugin/creature-titles-screen` (refusals), `integration/creature-titles-pdf` (20, 14, 6/4, 11.5/11.5, step 0.3) |
| AC-9 | `plugin/creature-titles-screen`, `unit/us-007-fields`, `unit/us-007-tab-helpers`, `plugin/titles-screen` |
| AC-10 | `unit/creature-titles-warning` (order), `integration/creature-titles-pdf` (skill 8.1, creature 7.75) |
| AC-11 | `integration/creature-titles-pdf` (order of the notes; the same bytes in two fresh processes) |
| AC-12 | `integration/creature-titles-pdf` (band rules level to 0.1 mm, counted; off: not level); the author's look at the manual check |

**Ticket #46 (2026-11-16), green:** `creature-titles-settings`, `creature-settings`, `creature-screen`, `run-creature`, `creature-card-headings`, and `titles-settings`, `skill-settings`, `spell-settings`, `us-008-settings-file`, `run-settings`, `us-007-commit` unchanged (228 tests in the 11 files); mutation round: 7 mutants (the three defaults, the keys left out of `DEFAULT_CREATURE`, the check left out, the check under the skill kind, the title messages first), 7 caught. The whole suite: `npm test` 1163 passed and 29 red (#47 to #49), integration 172 passed and 14 red (#48); typecheck red only in #48's files; lint clean.

**Ticket #47 (2026-11-16), green:** `creature-titles-warning`, and `titles-warning`, `card-codes` unchanged (41 tests); mutation round: 4 mutants (creature left out of the kinds, creature first, the kind of the widest not checked, `n` counting every card), 4 caught. The whole suite: `npm test` 1169 passed and 23 red (#48, #49), integration 172 passed and 14 red (#48); typecheck red only in #48's files; lint clean.

**Ticket #48 (2026-11-16), green:** `creature-titles-source`, `run-creature-titles`, `creature-titles-pdf` (21 after three added: the widest name in its band font, with and without one, closing the surviving mutant "widest in the card's font", the G2 answers name no band font; 200 creature cards in equal mode compile with no compiler warning, the regression test of the defect below), `band-fixtures` (10: the band-font answers recorded from Obsidian2Typst 0.15.2 and replayed), `card-escape` (nine places), `card-codes` (the new constants renamed `EQUAL_CREATURE_*`: the guard's pattern matched a doc comment that named `` `CREATURE_EQUAL_PRELUDE` ``); support: `typst-node` takes extra test fonts for one compile (a second compiler instance; the default one unchanged). **Defect found and fixed:** each card's builder called `gcc-eqc` with the whole data; equal mode took 1.3 s at 38 cards, 7.7 s at 120 and failed at 200 (`RuntimeError: unreachable` in typst.ts; the Typst CLI compiled 160 in 12.6 s). Now measured once and kept in a state: 0.5 s at 38, 1.0 s at 120, 1.3 s at 200 (off 1.5 s at 200), no warning from the CLI. The cause (the memo key hashing the whole data per call) is not verified; the measurement is. Mutation rounds: 12 mutants, 11 caught, the twelfth closed by the band-font test; after the fix 14 mutants (the 12, "each card measures the whole data again", "the state is never set"), 14 caught. Looked at: a sheet of six cards at 150 ppi, the bands at 600 ppi (on; smallest 9: the ferryman's band on two lines with the marks at mid-height). The whole suite: `npm test` 1178 passed and 16 red (#49), integration 189 passed; typecheck clean; lint clean.

**Ticket #49 (2026-11-16), green:** `creature-titles-screen`, `titles-screen`, `us-007-fields`, `us-007-tab-helpers`, `scheme-settings`, and `us-007-wiring`, `us-007-commit`, `us-007-reset`, `creature-screen` unchanged (227 tests in the nine files); mutation round: 6 mutants (each size always shown, the size shown by the spell's toggle, the spell's group, the properties page, the toggle left out), 6 caught. The whole suite: `npm test` 1194 passed, integration 189 passed, typecheck clean, lint clean, build ok.

## US-013 the UI standard: run dialog, ribbon icon, settings in sections (2026-11-17, G2): tests written (red by design)

New files: `plugin/us-013-selection` (the tree from paths and kind rules, the order of the cards, checking folders and
greyed notes, the saved form `all`, `readSelection`, renames and deletes by path segments, the saved-selection command),
`plugin/us-013-dialog-rules` (the destination line, the enabled button, Enter / Escape / IME, the values saved at the
run: normal form, kept keys, a refused folder, a hand edit kept), `plugin/us-013-sections` (five sections and their order,
each field's section, the first section with a problem, reset per section, the feature rows), `plugin/us-013-debug-info`,
`plugin/us-013-notices` (✅ / ❌, the refusal naming its section), `plugin/us-013-wiring` (the commands and `RIBBON`; text
checks: `main.ts` registers them and listens to rename and delete; the tab without `Back`, with `<details>`; no inline
style in `src/plugin`; the `gcc-` classes in `styles.css`; one string table). Amended (AC-11's notices, twelve pins in six
files): `plugin/run-runner` (3), `plugin/us-007-notice` (3), `plugin/glyph-runner` (3), `plugin/creature-runner` (1),
`plugin/us-008-adapters` (1), `integration/us-005-run` (1).

Proven against a throwaway reference implementation of the five pure modules and the runner's notices (written in
place, deleted): every test green there except the six text checks of `us-013-wiring` that need the real `main.ts`, tab,
dialog, styles and string table (they turn green with the code tickets; their patterns read the named files); `npm test`
1275 passed, integration 189 passed. Fifteen mutants on the reference, fifteen caught (rename by name prefix, no `all`
form, plain sort instead of without case, saved paths not filtered, notes without a kind checkable, Enter ignoring the
disabled button, month off by one, the button ignoring the count, no folder check before saving, a properties problem
missed, any section resettable, titles fields in Page and text size, plugins unsorted, no cancel notice, every refusal
naming Output); backups by full path, `shasum -c` 5 of 5 after the round. Found while proving: four amended pins the
first text search missed (they pin `There are no cards to print` and `^1 card on 1 page` in other forms; SCAR-023). On
the code of 0.6.0: `npm test` 1185 passed, 25 red (the US-013 files and the amended pins); integration 188 passed, 1 red
(the amended done notice); typecheck red only in the new test files.

| AC | Test |
|---|---|
| AC-1 | `us-013-wiring` (RIBBON, the two commands, main.ts registration, menus unchanged), `us-013-selection` (`plannedSavedRun`) |
| AC-2 | `us-013-dialog-rules` (`canRun`); the dialog itself: manual check (G4) |
| AC-3 | `us-013-dialog-rules` (`destinationLine`) |
| AC-4 | `us-013-selection` (tree, order, checking, saved form, `initialChecked`, `readSelection`) |
| AC-5 | `us-013-dialog-rules` (`runDialogKey`, `saveRunChoices`) |
| AC-6 | `us-013-selection` (`followRename`, `followDelete`), `us-013-wiring` (main.ts listens) |
| AC-7 | `us-013-sections` (sections, `sectionOf`, `firstProblemSection`, `initiallyOpen`), `us-013-wiring` (tab text checks, styles) |
| AC-8 | `us-013-debug-info` |
| AC-9 | `us-013-sections` (`FEATURE_ROWS`) |
| AC-10 | `us-013-sections` (`RESETTABLE`, `resetSectionDialog`, `resetSection`) |
| AC-11 | `us-013-notices`, the amended pins |
| AC-12 | `us-013-wiring` (string table text check) |
| AC-13 | M11 (measured: no progress tab); no test |
| AC-14 | the manual check of the last ticket |

Added at G4 (US-013, 2026-11-17): `us-013-selection` (an empty selection in a vault without a note with a kind is the
empty list, #51), `us-013-sections` (two of the last three sections in trouble, #53), `us-013-debug-info`
(`enabledPlugins`, #55), `us-013-dialog-rules` (`saveSelection`, `updateSelection`, `selectionFollowers`,
`runSavedSelection`, `openSettingsTab`, #56), `run-disk-writer` (`modifiedAt`, #56). Amended at G4: `us-007-reset`,
`us-007-wiring`, `titles-screen`, `creature-titles-screen`, `scheme-screen` (#55: the page reset became the section
reset), `us-013-wiring` (#56: the rename/delete handlers live in `run-dialog/deps.ts`, main.ts registers them).

#58 (F1, 2026-11-17): new `plugin/f1-question-focus` (a fake modal that copies Obsidian 1.15.0's measured focus of the
first focusable element after `onOpen`; both questions: order Cancel first, Enter right after opening cancels, Enter
after moving to the action acts, back to Cancel cancels); red on the code before the fix (4 of 6), green after.
Amended: `us-008-adapters`, `us-007-reset` (the order; buttons found by name). Mutants: 3 of 3 after one survivor (the
focus listener of Cancel) got the back-to-Cancel test.
