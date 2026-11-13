# US-004 — Creature card

**Status:** Ready (G1 done 2026-11-12; the owner accepted D1 to D5 on 2026-11-12, D2 changed, see AC-11); G2 tests written 2026-11-12; D6 (icon paths) decided and fixed in Obsidian2Typst 0.15.1 (released 2026-11-13); G3 tickets #21 to #26 written 2026-11-13
(G0 2026-11-11; the owner answered the control project's questions
2026-11-11: statblock through a new Obsidian2Typst API function, the
drop-then-shrink rule). The contract (AC-3) is checked against the released
Obsidian2Typst 0.15.1 (US-039, US-040): its answer was printed and compiled on
2026-11-12 with 0.15.0 and copied again from 0.15.1 on 2026-11-13 (only the icon numbers differ), and the author ran the icons and the preset's fonts in a real
compile in Obsidian (its M29, part A).

**As** a game master **I want** one creature per card — its statblock, its
instincts and its attacks, a picture only if there is room — **so that** I can
run an encounter from the cards.

Reader of the output, engine, font: as US-002. The statblock is the one that
Obsidian2Typst draws for the book, taken through its API (AC-3). The picture is
a later story (US-006): this story reserves no space for it.

All examples use invented names. The property names and the section headings
below are the **defaults** of settings; the author maps them to their own
(SCAR-035).

## What the card shows of a note

Inside the US-001 frame with 4 mm padding (text area 54 x 80 mm), top to
bottom: the **statblock** at the full text width (with its Skills line when
there is one); the **Instincts** section; the **Actions** section; the
**Signs** section; each section with its heading as a small bold line. The
lead paragraph and every other section are not shown.

In order of importance (owner, 2026-11-11): the statblock and the Actions
section always stay; the Skills line of the statblock is given up last, the
Instincts section before it, the Signs section first. A part that does not
fit is given up, as AC-5 says.

## Settings (defaults)

| Setting | Default | Allowed |
|---|---|---|
| Instincts section heading | `Behaviour` | heading text |
| Actions section heading | `Actions` | heading text |
| Signs section heading | `Signs` | heading text |
| Sizes | the shared card sizes (US-003 AC-6) | as US-002 |

## The example note used below (invented)

`Fen Hare.md`:

```
---
vigour: 11
might: 4
wits: 2
speed: 5
attacks:
  - "Kick: 2d6"
  - "**Bite**: 1d6"
skills:
  - Quick Step
tags:
  - beast
---
Fen hares are quick and shy.

### Signs
Flattened reeds in a ring.

### Behaviour
- flee at the first sound
- never fight unless cornered

### Actions
- sprint: 12 squares over two Actions
- kick, 2d6
```

## Acceptance criteria

- **AC-1 (reading).** The example gives: title `Fen Hare`; the note's
  properties as plain values (the statblock reads them); the Instincts blocks:
  a bullet list of two items; the Actions blocks: a bullet list of two items;
  the Signs blocks: one paragraph `Flattened reeds in a ring.`; nothing from
  the lead paragraph. The text rules are those of US-002 AC-1 and AC-4 (header
  read once, links as text, images left out with a warning, and so on) with
  the codes of the creature kind (`CREATURE_IMAGE_OMITTED`, ...).
- **AC-2 (sections).** A section is found by its heading text, without case,
  at any heading level (`##`, `###`); it ends at the next heading of the same
  or a higher level. `### behaviour` finds `Behaviour`. A missing Instincts or
  Actions section gives no block and one warning `CREATURE_SECTION_MISSING`
  (detail: the heading text as set, e.g. `Actions`); a missing Signs section
  gives no block and no warning (the part is optional: 26 of the 38 real notes
  have it); a section with a heading and no text gives no block and no
  warning. The example without its Actions section gives one warning; the
  example without its Signs section gives none.
  **Decided at G4 (the owner, 2026-11-13):** only a heading at the top level of
  the note counts; a heading inside a callout or a list item is not a section
  heading (its text stays in the section it is in). A lower heading inside a
  section is not shown, its text under it is. If the same heading text is
  found twice, the first section is the card's. (The two last rules follow the
  tests of G2; the owner confirms them by accepting this ticket.)
- **AC-3 (statblock, the contract).** The statblock part of the card is what
  Obsidian2Typst's API gives for the note's properties, drawn at the text width
  (54 mm). The reader is this plugin; the writer's story is Obsidian2Typst
  US-039 (SCAR-040). The contract, written here once:
  - **Call.** `app.plugins.plugins["obsidian2typst"].api` with
    `api.version === 1` and `typeof api.statblockTypst === "function"` and
    `typeof api.compileFonts === "function"`; otherwise the creature card is
    refused with a message naming the plugin and the least version (0.15.1);
    no other card is affected: one warning `CREATURE_API_UNAVAILABLE` per
    run (empty path, the message as detail), no creature card is made, the
    skill and spell cards of the run are. The API object is read at each
    run, never kept (SCAR-016).
  - `api.statblockTypst(data, options?)`: `data` is the note's properties as
    plain values (keys in any case), `options.heading` the band's text (the
    note's file name). It returns `{ok: true, prelude, data, files, credit,
    warnings}` or `{ok: false, reason, message}` with `reason` one of
    `no-settings` (no active preset, or none with a statblock setup; also a
    preset that could not be read) and `no-statblock` (no stat and no attack
    in the data). It never throws; `api.version` stays 1.
  - `prelude`: Typst definitions (the helper functions whose names start with
    `o2t-`), the same text for every call, no content of the note.
  - `data`: a Typst dictionary literal with the keys `band`, `look`, `boxes`,
    `track`, `attributes`, `traits`, `attacks`, `skills`, `tags`, for
    `#o2t-sb-box(data)`; `look.sizes` holds the pt sizes of the roles `band`,
    `value`, `label`, `text`, `attacks`, `skills`; `look.fonts` the families by
    role; a part without data is `none` (`skills: none`) or `()` (`attacks`).
  - `files`: `{path, bytes}` for each icon the data names, at that Typst path
    (`o2t-icons/<n>.svg`, `n` the 1-based position of the icon in the preset's track, so not always consecutive; the reader writes the bytes at that path
    next to its source).
  - `credit`: the icons' credit text, or `null`.
  - `warnings`: `{code, message}` of the data checks (`STAT_SUM_MISMATCH`,
    `TAG_UNMAPPED`, `HTML_UNSUPPORTED`, ...) and `STATBLOCK_ICON_MISSING`
    (a missing icon is an empty cell), once each; the message starts with the
    band's text in quotes.
  - `api.compileFonts()`: the font files the book's export gives its compiler
    (bundled first, then the vault's).
  - The helper draws at the width of its container (`width: 100%`).
  Measured 2026-11-11 with Obsidian2Typst's own code, invented data, no icon
  files, Libertinus: 36 mm tall (vigour 4, one attack) to 55 mm (vigour 35,
  four attacks, skills, traits) at 54 mm width. Measured 2026-11-12 with the
  released 0.15.0 answer for the Fen Hare note above under the sample preset
  (four sample icons, Libertinus, text size 7 pt): **43.0 mm tall** (121.9 pt)
  at 54 mm width, no diagnostic; the author's own run of icons and the
  preset's fonts in a compile in Obsidian passed (Obsidian2Typst M29, part A).
  The answer's `data` for that note starts `(band: "Fen Hare", look: (fill:
  none, frame: (color: rgb("#000000"), width: 0.75pt), ...` and its `look.sizes`
  are `band: 11.5pt, value: 11pt, label: 5.5pt, text: 7pt, attacks: 7.5pt,
  skills: 9pt`; its `files` hold `o2t-icons/1.svg`, `2`, `3` and `5` (0.15.1 numbers by the preset track; 0.15.0 gave 1 to 4). The test
  fixture of this plugin is a copy of that real output (SCAR-023).
- **AC-4 (fit, the statblock scales) — numbers measured.** The statblock's
  sizes scale with the card's text size S (factor S / 7); the text is set at
  S; sizes are tried as in US-002 AC-5. The scaling is done in the Typst
  source of the card, on the answer's data text, which is not edited: the
  card binds `data`, multiplies each entry of `look.sizes` by the factor and
  hands the result to `o2t-sb-box`. Measured 2026-11-12 (Fen Hare, 54 mm,
  height auto): factor 1 gives 121.9 pt, factor 5.5 / 7 gives 111.8 pt, no
  diagnostic; a larger factor grows the box (158.9 pt at 10 / 7).
- **AC-5 (drop first, then shrink; owner's rule).** The card is tried at the
  largest size (7 pt) with all parts; if it does not fit, the Signs section is
  given up, then the Instincts section, then the Skills line of the statblock,
  each time trying the largest size again; only when the minimum (statblock
  without its Skills line, and the Actions section) still does not fit at 7 pt
  is the minimum shrunk, down to the smallest size. If it does not fit at the
  smallest size, the card is made at that size, cut at the text area, and
  `CREATURE_TEXT_OVERFLOW` names the note and the size. A given-up Instincts
  section or Skills line gives `CREATURE_PART_DROPPED` (detail `Instincts` or
  `Skills`); a given-up Signs section gives no warning (it is the card's
  lowest priority by design). The fit fact of a creature card is `{i, size, fits, dropped}`, `dropped`
  listing, in the order given up, the parts the card has and gave up
  (`Signs`, `Instincts`, `Skills`); `CREATURE_FIT_UNKNOWN` when no valid fact
  is read (also a fact without `dropped`). Measured 2026-11-11
  (typical statblock with a Skills line; invented words of 6.7 letters,
  paragraphs of 14 words; scope: this layout and this text, with the spike's own
  statblock, not the fixture's; words in Signs,
  Instincts, Actions): (0, 30, 40) gives Instincts dropped at 7 pt; (20, 25,
  25) gives Signs dropped at 7 pt; (25, 40, 60) gives only the minimum, shrunk
  to 6.75 pt; (25, 40, 100) the minimum at 6 pt; (30, 60, 150) does not fit at
  5.5 pt (`CREATURE_TEXT_OVERFLOW`). **Consequence to confirm:** a creature
  of 70 words loses its Instincts although shrinking to about 6.25 pt would
  have kept them (the rule is drop first, as decided).
  Without a statblock (AC-11) the minimum is the Actions section alone and
  the Skills step does not exist.
- **AC-6 (text is literal).** As US-002 AC-7 in the title and the section
  text; in the statblock values through the API's own escaping, which this
  plugin does not repeat or change. Examples (the API's measured cases, invented
  data): the attack `**Bite**: 1d6` is set bold (`Bite` then `1d6`); `a#b $c:
  1d4` shows `a#b $c`; `= x: 1d4` shows `= x`; a link shows its text; `Kick
  <x>: 1d4` shows the attack `Kick` (the tag is dropped) with `1d4` and gives
  the forwarded warning `HTML_UNSUPPORTED` (AC-11). In the answer's data these
  are `([*Bite*], [1d6])`, `([a\#b \$c], [1d4])`, `([\= x], [1d4])` and
  `([Kick ], [1d4])` (measured 2026-11-12); the card's PDF text holds each.
- **AC-7 (mixed deck).** Creature, skill and spell cards on one sheet, in the
  given order, every run inside its text area to 0.1 mm (US-003 AC-7).
- **AC-8 (deterministic).** As US-002 AC-11.
- **AC-9 (credit).** The answer's `credit` (the preset's text, or `null`) is
  printed once, as one small line (5 pt, centred, wrapped at the sheet's text
  width, at most two lines) in the bottom margin of every sheet that has a
  creature card, and nowhere else; with `null` or an empty text no line. The
  line stays inside the margin band and covers no card (to 0.1 mm). The
  credit of several creature cards on a sheet is the same text, printed once.
- **AC-10 (look, SCAR-025).** A sheet with a small, a typical and a long
  creature at printed size, a statblock at 4x.
- **AC-11 (warnings and refusals).** Every warning of the answer is forwarded
  as a warning of the run with its own code and message and the note's path
  (the run goes on). A refusal (`no-settings`, `no-statblock`) gives the card **without its
  statblock** (D2): the title and the text sections, fitted as AC-5 says
  without the statblock and without its Skills step, with no credit and no
  files of its own, and one warning `CREATURE_STATBLOCK_REFUSED` with the
  note's path and the API's message; the run goes on. A missing
  or too old plugin refuses every creature card once (AC-3), not the skill and
  spell cards of the same run. The run's report counts the creature cards as
  made or refused like the other kinds.
- **AC-12 (the compile takes the answer's files and fonts).** A sheet with a
  creature card is compiled with the answer's `files` at their paths next to
  the source and with the font files of `api.compileFonts()` added to the
  plugin's own fonts (the card's own text stays Libertinus Serif; the
  statblock's families come from the book's list). A compile after it,
  without files and fonts, is the sheet as before (nothing leaks, to the
  byte, the same PDF as before the creature compile). A sheet without a
  creature card never calls the API.
- **AC-12a (several creature cards, files).** The files of several answers
  are put together by path: a path with the same bytes is one file (D6: from
  Obsidian2Typst 0.15.1 the number of an icon file is its position in the
  preset's track list, so one path is one file for every creature of a
  preset). Defensive: if two answers give one path with different bytes, the
  later card is made without its statblock (as AC-11) with one warning
  `CREATURE_ICON_CONFLICT` (the note's path, the file path as detail); a wrong
  icon is never drawn. The least version of AC-3 becomes 0.15.1.
- **AC-13 (settings and rules).** The three section headings are settings of
  the settings file and of the settings screen (US-007: the same commit and
  reset rules as the other text settings, an empty heading refused); the rule
  kind `creature` is accepted in the rules (US-005 AC-3), shown in the rule
  rows, and selects the creature reader. The card sizes are the shared ones.

## Decided by the owner (2026-11-11)

Route A (the API function, released as Obsidian2Typst 0.15.0); the contract
as AC-3; the statblock's fonts come with the API, the card's own text stays
Libertinus Serif; the credit line in the bottom margin; what the card shows;
the picture is US-006; the statblock scales with the text size; drop first,
then shrink (AC-5).

## Decisions of G1 (accepted by the owner 2026-11-12)

- **D1.** Warnings of the API are forwarded unchanged (AC-11), not renamed to
  creature codes: the book's codes are the ones the author knows.
- **D2.** A refused statblock gives a card without its statblock and one
  warning (AC-11). (The proposal was no card; the owner chose otherwise.)
- **D3.** The credit is 5 pt, centred, at most two lines (AC-9).
- **D4.** The compile of a creature sheet adds the API's fonts to the
  plugin's own (AC-12); how the worker takes them (a fresh compiler for such
  a compile) is a ticket's measurement, the criterion is what the compile
  does, not how.
- **D5.** The three section headings and the rule kind are in this story, not
  a later one (AC-13): without them the card cannot be made from the
  settings screen.

## Decided at G2

- **D6 (owner, 2026-11-12).** Each answer used to number its icon files from 1
  in the order of first use, so two creatures with different conditions lists
  could give one path with two files. Decided: the fix is in Obsidian2Typst
  (number by the preset's track order, release 0.15.1, its own story first),
  not a rewrite of the data text here. This plugin merges by path and warns on
  a conflict (AC-12a). The fixture is re-copied from the 0.15.1 output; the
  least version in AC-3 becomes 0.15.1 then.

## Not covered

The picture (US-006), selection and the command (US-005), vault fonts for the
card text, the missing-glyph warning (issue #5).
