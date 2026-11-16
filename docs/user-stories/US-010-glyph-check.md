# US-010 — A warning when a card's text has a character no font draws

**Status:** Done (0.4.0, 2026-11-17; M08 passed; tickets #36 to #39)
**Introduced:** 0.4.0 (planned)
**Implemented:** 0.4.0 (tickets #36 to #39; M08 passed 2026-11-17)
**Backlog issue:** #5

**As** a game master whose notes hold characters from other scripts or symbols,
**I want** the plugin to say, for each note, which characters of its card no font can draw,
**so that** I do not print a card with a blank where a letter should be and find out at the table.

Found at G2 of US-002 (a known limitation then). Reader of the output, engine and fonts: as US-002 (the
bundled Libertinus Serif; Typst 0.14 through typst.ts 0.7.0).

---

## The defect, measured (2026-11-17, typst.ts 0.7.0, the bundled fonts)

A compile of `Ж → ★ ◆ ß 漢 😀` in Libertinus Serif gives **no diagnostic**; the PDF draws a blank (the
font's empty glyph) where `漢` and `😀` stand, and the other characters as letters. Libertinus Serif
covers Cyrillic, arrows, `★` and `◆`, not CJK ideographs nor emoji. Rule 8 (problems are warnings with a
source location) asks for a warning; the plugin gives none.

The compiler can say what a font covers: `getFontInfo` of typst.ts, on the file's bytes, returns for each
face its family and the covered code points as alternating run lengths (the way Obsidian2Typst's
`FONT_GLYPH_MISSING` reads them). Reading the five bundled font files took 5 to 25 ms in Node
(2026-11-17; the first call includes the start of the driver).

## Terms

- **Card text** is the text the plugin sets on a card, in the bundled Libertinus Serif (D1): of a skill or
  spell card its title, its tags, its details row (`label: value`) and the note's text (every run of every
  paragraph and list item); of a creature card its title (the name, shown when there is no statblock), the
  three section headings and the texts of its sections. **Not card text:** the statblock's own text (its
  stats, attacks, skills: drawn by Obsidian2Typst in the preset's fonts), the icons (a code point of the
  icon table, never typed by the user), the credit lines at the foot of a sheet (D4), cut marks.
- A character is **drawn** when some font of the compile has it: the plugin's four Libertinus Serif faces,
  the icon font, and, on a run with creature statblocks, the extra fonts of Obsidian2Typst's answer
  (`api.compileFonts()`): Typst falls back to any font it has (D2).
- A character is **missing** when it is card text and not drawn.

## Acceptance criteria

- **AC-1 (the warning).** For every note whose card has at least one missing character the run gives
  **one** warning: code `SKILL_GLYPH_MISSING`, `SPELL_GLYPH_MISSING` or `CREATURE_GLYPH_MISSING` (made by
  `cardCode`, the one place the kind and a problem become a code), path the note, detail the missing
  characters in code point order, each as the character, a space and `U+` with its code point in upper-case
  hexadecimal of at least four digits, joined by `, `; **at most ten**, then ` and N more` for the rest
  (D3). Examples (invented notes): a skill whose text holds `漢` and `😀` has the detail `漢 U+6F22, 😀
  U+1F600`; a spell with twelve different ideographs has the first ten, in code point order, and ` and 2
  more`; a creature whose Signs section holds `漢` gets `CREATURE_GLYPH_MISSING` with `漢 U+6F22`.
- **AC-2 (what is checked).** Every code point of the card text (as the terms say) is checked once per
  note, however often it occurs; spaces, control characters (below U+0020, U+007F to U+009F), the zero-width
  and direction format characters (U+200B to U+200F, U+2060, U+FEFF) and the variation selectors (U+FE00 to
  U+FE0F) are not checked. A note whose card text is entirely drawn gives no warning: `Ж → ★ ◆ ß` and
  `é` (U+00E9) are drawn by Libertinus Serif, `漢` and `😀` are not.
- **AC-3 (a font that draws it).** A character is missing only when none of the fonts of that compile has
  it (D2). Examples: `漢` on a run that has an extra font with `漢` (a creature run whose answer brings that
  font): no warning; the same note on a run without such a font: the warning; a private-use code point of
  the icon font (U+E946, the sword) typed into a note's text: no warning (the icon font draws it); U+E000,
  which no font has: the warning.
- **AC-4 (where the coverage comes from; the run never fails for it).** The coverage is read from the
  compiler's own font information (`getFontInfo`) for exactly the font files of the compile, **in the
  compile worker, never on the main thread** (US-008 AC-2), once per session for the bundled fonts and once
  per set of extra fonts (cached like the compiler of US-004 AC-12), and never from a table typed by hand
  (SCAR-023). When the coverage cannot be read, the run goes on without the check and gives **one** warning
  `GLYPH_CHECK_UNAVAILABLE` (path empty, detail the reason, rule 8) (D5).
- **AC-5 (order, the notice and the warnings file).** The glyph warnings stand after the notes' own
  warnings and before the fit warnings, in the order of the cards; the notice's count and the warnings file
  (US-005 AC-8, one line `- CODE — path — detail`) include them without a change of form. Example line:
  `- SKILL_GLYPH_MISSING — skills/Parry.md — 漢 U+6F22, 😀 U+1F600`.
- **AC-6 (nothing else changes).** The PDF is made as before: a missing character is drawn as the compiler
  draws it, no substitute and no removal; a run in which every character is drawn gives the same warnings
  and the same PDF bytes as 0.3.0 for the same notes and settings (the golden sources of US-009 AC-1 stay
  green); two runs give the same warnings in the same order (US-005 AC-11).
- **AC-7 (the coverage of the bundled fonts, checked).** A test reads the bundled font files with
  `getFontInfo` and asserts the examples of this story (`Ж`, `→`, `★`, `◆`, `ß`, `é` drawn; `漢`, `😀`
  not; the icon font's U+E946 drawn), so that a change of the font files shows (SCAR-023).

## Interfaces fixed by the tests (G2)

The tests state the shape of the pieces so that the tickets agree: the worker takes `{type: 'font-info', id,
fonts?}` and answers `{type: 'font-info-result', id, faces: {family, coverage}[]}` (its own faces first, then
the extra fonts'; run lengths starting with a run that is not covered) or `{type: 'failed', id, message}` for
bytes that are no font; the compile service has `coverage(fonts?)` answering `{ok: true, faces}` or `{ok: false,
message}` (never a rejection; an empty list of fonts is none and sends no `fonts` key; one request at a time,
in the queue of the compiles); the runner's dependency `coverage?(fonts)` is that answer and the run's own
`coverage?(fonts)` rejects when the faces cannot be read; `main.ts` hands the service over in one statement
(`coverage: (fonts) => this.compiler.coverage(fonts)`); the warnings file writes an empty path as it does for
every warning (`- GLYPH_CHECK_UNAVAILABLE —  — <reason>`). Pure core: `src/core/glyph/coverage.ts`
(`decodeCoverage`, `createCoverage`), `src/core/glyph/check.ts` (`cardCodePoints`, `glyphDetail`,
`glyphWarnings`).

## Decisions of G1

- **D1 (the author, 2026-11-17).** Scope: the text the plugin sets, in its own font; the statblock's text is
  Obsidian2Typst's.
- **D2 (the author).** A character that some font of the compile draws is not missing (fallback counts); the
  coverage is read at run time from the fonts the compile really has.
- **D3 (the author).** One warning per note, in the form of Obsidian2Typst's `FONT_GLYPH_MISSING` (ten
  characters with their code points, then `and N more`).
- **D4 (proposed).** The credit lines (the scheme note's `credit`, the creature credit of the answer) are
  **not** checked: they are not the cards' text, they come from the author's note and from a preset, and a
  missing character there would need its own note path. Alternative: check them and warn with the scheme
  note's path (`SCHEME_GLYPH_MISSING`) and for the answer's credit with an empty path.
- **D5 (proposed).** A failure to read the coverage is one warning and the run goes on (AC-4), not a stop.

## Who relies on what changes (SCAR-017, SCAR-027)

| User | What it assumes | After this story |
|---|---|---|
| `core/run/run.ts` (the run; where the warnings are collected) | notes' own warnings, then the fit warnings | a step between them (AC-5) |
| `plugin/compiler` (worker, client) and `core/run`'s `RunDeps` | `compile(source, extra)` only | a call for the coverage of the compile's fonts (AC-4) |
| `core/card/warning.ts` (`cardCode`) | the codes `*_FIT_UNKNOWN`, `*_BRANCH_UNKNOWN`, … | `*_GLYPH_MISSING` made there |
| `tests/unit/run-*.test.ts`, `tests/integration/*` | their stand-in dependencies have no coverage call | the stand-ins return what the real one returns (SCAR-023) |
| the warnings file and the notice (US-005 AC-8, AC-5) | any code, one line each | unchanged in form |
| `docs/technical/dependencies.md`, `architecture.md`, `tests.md` | the worker has compile only | amended |

## Not covered

Checking the statblock's text or the credit lines (D1, D4); a substitute font or a replacement character
(the PDF is unchanged, AC-6); a warning per character or per occurrence (D3); characters in the output
file's name; fonts of the user's vault (the plugin has its own, US-008). Measured: typst.ts 0.7.0, the five
bundled font files, in Node (SCAR-032).
