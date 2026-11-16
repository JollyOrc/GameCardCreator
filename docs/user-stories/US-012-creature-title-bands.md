# US-012 — Equal title bands on creature cards: one name size for all creature cards of a run

**Status:** Done (tickets #46 to #50; M10 passed 2026-11-16)
**Introduced:** 0.6.0
**Implemented:** 0.6.0 (tickets #46 to #50; M10 passed 2026-11-16)
**Follows:** US-011 (equal title bars on skill and spell cards; its D7 left creature cards for this story)
**Tickets:** #46 (settings), #47 (warning), #48 (sheet and run), #49 (screen), #50 (test build, M10), in this order (G3, 2026-11-16)

**As** a game master printing a sheet of creature cards **I want** every creature's name in the statblock
band to have the same size on every card, and the bands the same height, **so that** a sheet of creatures
looks as even as a sheet of skills or spells.

Reader of the output, engine and fonts: as US-004 (a PDF viewer and an A4 printer; Typst 0.14 through
typst.ts 0.7.0; Libertinus Serif and the preset fonts Obsidian2Typst hands over). The band is drawn by
Obsidian2Typst's `o2t-sb-box` (0.15.2, its US-041 marks included). All examples use invented names (SCAR-035).

---

## What happens today (0.5.0) and why the bands differ

A creature card with a statblock draws the answer of `api.statblockTypst` (US-004 AC-3): `o2t-sb-box(d)` with
the answer's `data`, in which the card multiplies **every** entry of `look.sizes` by S / 7, S being the card's
own text size chosen by the fit (US-004 AC-4, AC-5). The band's name size is `look.sizes.band` x S / 7, so it
follows the card's text size, as a skill title did before US-011. Two bands differ for two reasons:

1. **the text size differs** (a card with much text shrinks, and its name shrinks with it);
2. **the name wraps** (a long name at a large size takes two lines, and the band grows).

A card without a statblock (a refused answer, US-004 D2) draws the creature's name itself, bold at 1.3 em of S.

Measured (2026-11-16, Typst 0.14.2, the bundled fonts, the fixture's look: band 11.5 pt, no band font, so
Libertinus Serif; card text width 54 mm; `o2t-sb-box` of the fixture's prelude, Obsidian2Typst 0.15.2): the
band of `Fen Hare` is 11.5 pt and 6.67 mm high at S = 7, 9.86 pt at S = 6. The largest band size at which a
name stays on one line (0.05 pt steps): `Marsh Lantern Wisp` 13.8 pt, `Old Grey Ferryman of the Sunken Weir`
7.9 pt; `Fen Hare`, `Reedmother` and `Thornwhisperingbramblequeen` above 20 pt. As a card's own bold title
(no statblock): `Old Grey Ferryman …` up to 8.55 pt, `Marsh Lantern Wisp` up to 16.4 pt.

## Terms

As US-011, for the kind **creature**: the creature cards of one run, on every sheet of it (US-011 D1).

- **Name size** `t`: the one size at which every creature name of the run is set (AC-2).
- **Band:** the first piece of `o2t-sb-box`, the name with its ◆ marks (Obsidian2Typst US-041).
- **One line:** a band whose height equals the height of the band of a two-letter name at the same size;
  a name whose marks are removed because a word is too wide beside them (US-041 D3) is one line when the
  name itself is.

## Settings (defaults)

In `creature` of the settings file (D14), beside the three headings of US-004:

| Setting | Key | Default | Allowed |
|---|---|---|---|
| Equal title bars | `equalTitles` | off | on, off |
| Title size | `titleSize` | 11.5 pt (Obsidian2Typst's built-in band size: the band of an unshrunk card at the default text size 7 pt) | 6 to 20 pt |
| Smallest title size | `minTitleSize` | 7 pt | 4 to 20 pt, not above the title size |

The step is the shared `Size step` (US-003 D2; default 0.25 pt). A settings file without these keys gets the
defaults (US-008 AC-4), so a 0.5.0 file works unchanged. `CreatureSettings` extends `TitleSettings` (US-011).

## The examples used below (invented)

Creature notes, each with a statblock unless stated (the fixture answer of US-004 with the note's name as
the band, as Obsidian2Typst writes it), 40 words of text:

| Note | Largest one-line band size (pt) |
|---|---|
| `Fen Hare.md` | above 20 |
| `Reedmother.md` | above 20 |
| `Marsh Lantern Wisp.md` | 13.8 |
| `Old Grey Ferryman of the Sunken Weir.md` | 7.9 |
| `Thornwhisperingbramblequeen.md` | above 20 (one word) |

Run A: `Fen Hare`, `Reedmother`, `Marsh Lantern Wisp`. Run B: run A and `Old Grey Ferryman …`.

## Acceptance criteria

- **AC-1 (off is today).** With the creature switch off, creature cards are exactly as in 0.5.0: the Typst
  source of a run is the same text as 0.5.0's for the same notes and settings (a test with the new keys
  absent, one with them present and the switch off). The creature switch does not change skill or spell
  cards, and theirs do not change creature cards.
- **AC-2 (one name size: shrink first, D11, D12).** In equal mode the sizes tried are `T`, then steps of
  `Size step` down while not below `Tmin`, then `Tmin` (the rule of `titleSizes`, US-011 AC-2). `t` is the
  largest of them at which **every** creature name of the run is one line in its band at the card's text
  width. Whether a name is one line is decided by measuring `o2t-sb-box` itself with a statblock that has
  only the band (every other part `none`, `attacks: ()`, the contract's empty forms, US-004 AC-3), never by a
  copy of the band's rule in this plugin (SCAR-017). Examples at the defaults (`T` 11.5, `Tmin` 7: 11.5,
  11.25, …, 7.25, 7):
  - Run A: `t` = 11.5; every band 6.67 mm high.
  - Run B: `t` = 7.75 (8 is above the 7.9 that fits); every band 5.80 mm high.
  - `Thornwhisperingbramblequeen` with run A: `t` = 11.5 (one line, US-041 D3 composed).
- **AC-3 (the name size does not follow the text size, D11).** In equal mode the card sets
  `look.sizes.band` to `t`; every other entry of `look.sizes` is still multiplied by S / 7 as today (US-004
  AC-4). Example: run A with a 260-word `Fen Hare` (today 6 pt with Signs, Instincts and Skills dropped,
  band 9.86 pt): its band is 11.5 pt and 6.67 mm high like the others; its other statblock sizes stay at
  S / 7. (Amended at G2: the draft said 200 words; measured through the plugin's compile, 200 words give
  6.5 pt today, 260 give 6 pt.)
- **AC-4 (still too long: wrap, one warning, D13).** When a name is not one line even at `Tmin`, `t` =
  `Tmin`, that band takes two lines and stays taller (no height input of Obsidian2Typst is used; the other
  bands keep their one-line height), and the run gives **one** warning `CREATURE_TITLE_WRAPPED` (made by
  `cardCode`), path the note whose name is widest at `Tmin`, detail `<k> of <n> titles wrap at <Tmin> pt`.
  Example: run B with `Tmin` 9: `t` = 9; bands 6.09 mm, `Old Grey Ferryman …` 10.24 mm; warning
  `CREATURE_TITLE_WRAPPED — Old Grey Ferryman of the Sunken Weir.md — 1 of 4 titles wrap at 9 pt`. No warning
  when every name is one line.
- **AC-5 (a card without a statblock, D15).** In equal mode its own title is set bold at `t` (not 1.3 em of
  S) and counts in AC-2, measured as one line in its own font at the card's text width; its height is its
  own (it is not a band). Example: `Fen Hare`, `Reedmother` with statblocks, `Old Grey Ferryman …` refused
  (no statblock; one line up to 8.55 pt as a bold title): `t` = 8.5; the two bands 5.97 mm, the title one
  line. With its statblock the same name gives `t` = 7.75 (run B).
- **AC-6 (the fit, SCAR-021).** Each card is fitted as today (US-004 AC-5: the parts dropped one by one,
  then the smaller sizes): only the band's size is `t` instead of the scaled one. `t` is worked out from the
  names alone, never from the fit, so the fit cannot change it; two compiles of the same run give the same
  `t` and sizes.
- **AC-7 (one compile, the fact).** `t` is measured in Typst in the same compile as the cards, once. The
  compile writes one fact under `gcc-fit`: `(titles: "creature", size: t, height: <tallest band or title,
  mm>, wrapped: <card indexes>, widest: <card index>)`, the shape of US-011 AC-8; the run makes AC-4's warning
  from it in the place of US-011 AC-8, creature after skill and spell. A run without creature cards in equal
  mode writes no such fact.
- **AC-8 (the settings and their checks, SCAR-019).** As US-011 AC-9, naming the kind (`The creature title
  size 21 is outside 6 to 20 pt`), checked whether the switch is on or off. Examples with run A, step 0.25:
  - `T` 11.5, `Tmin` 7 (defaults): `t` 11.5.
  - `T` 20, `Tmin` 7 (upper end): `t` 13.75 (20 − 25 steps; under the 13.8 that fits).
  - `T` 14, `Tmin` 7 (a middle value): `t` 13.75.
  - `T` 6, `Tmin` 4 (lower ends): `t` 6.
  - `T` 11.5, `Tmin` 11.5 with run B: `t` 11.5, `Old Grey Ferryman …` wraps, warning `1 of 4 titles wrap at
    11.5 pt`.
  - `Size step` 0.3, `T` 20, `Tmin` 7: tried 20, 19.7, …: `t` 13.7.
- **AC-9 (the settings screen, US-007, US-011 AC-10).** The page `Page and text size` gets a third group after
  `Spell titles`: `Creature titles`, with the toggle `Equal title bars` and the fields `Title size` and
  `Smallest title size` (pt), shown only while the toggle is on, redrawn at once when it changes (SCAR-016),
  committed through `commitSetting`, reset by `Reset this page to defaults`. Thirty-one fields in all
  (twenty-eight before).
- **AC-10 (composed with the other kinds, SCAR-002).** A run with skill, spell and creature cards, all three
  in equal mode: each kind has its own `t` and fact; the order of the warnings is skill, spell, creature.
  Example: `Parry` and `Riverbank Ambush …` (US-011) with run B: skill `t` 8.1 (US-011 AC-2), creature `t`
  7.75.
- **AC-11 (deterministic, rule 7).** As US-011 AC-11: the same notes and settings give the same PDF bytes in
  two fresh processes; the order of the notes does not change `t`.
- **AC-12 (look, SCAR-025).** A sheet of runs A and B at printed size, the bands zoomed in at 4x: on every
  card of one run the name has one size and the band's lower rule one distance from the card's top, to 0.1
  mm (checked by program from the PDF's text sizes and drawing positions; the number of bands checked
  equals the number of creature cards drawn, SCAR-023). The author's run on their own vault in Obsidian
  (manual check, SCAR-045).

## Interfaces fixed by the tests (G2)

So that the tickets agree: `src/core/card/titles.ts` gains `DEFAULT_CREATURE_TITLES` (off, 11.5, 7); `checkTitleSettings`
and the title facts take the kind `creature`, whose warning comes after skill and spell (`titleWarnings`).
`CreatureSettings` extends `TitleSettings` and `DEFAULT_CREATURE` holds the three keys; `checkCreatureSettings` gives the
headings' messages, then the title messages. `cardSheetTypst`'s options take `titles: {skill?, spell?, creature?}`; the run
passes `settings.creature`. The sizes tried are written as an array; the fact is written once under `gcc-fit` with
`titles: "creature"`; `height` is the tallest band (a band-only statblock measured with `o2t-sb-box`) or own title. The
name of a creature without a statblock is written once more into the kind's data, through `typstString` (a ninth escaped
place, `card-escape`); a statblock's name is never written by this plugin (it is in the answer's data). The fields are
`creature.equalTitles`, `creature.titleSize`, `creature.minTitleSize` in the group `Creature titles` of the layout page,
with `shownWhen` the toggle. Fixtures: `tests/support/band-fixtures.ts` builds each name's answer from the US-004 fixture
(measured equal to Obsidian2Typst's real answers, recorded in `tests/fixtures/us-012-answers.json` and replayed by a guard
test); the 0.5.0 creature sources are in `tests/fixtures/golden/creature-sources.json`.

## Measured on the author's vault (numbers only, SCAR-035; 2026-11-16)

38 creature notes, the author's preset and settings (largest text size 10 pt), read-only. Today: 12
different band sizes (9.04 to 16.43 pt) and 6 wrapped names. In equal mode every name is one line up to
11.75 pt (one name decides). The fit with one band size for all cards (an emulation in a spike: the sheet
source of 0.5.0 with the band set to 11.75 and to 11.5 pt; not this story's code): no card's text size got
smaller, 10 got larger (by up to 1 pt), one card drops one part fewer, the same 3 cards overflow, 38 cards on
5 pages as today. The spike's per-card sizes of today equal those in the author's own PDF of 2026-11-14
(the harness checked against real output, SCAR-028).

## Decisions (the owner, 2026-11-16: "all proposals")

- **D11:** in equal mode the band's name size is one size for all creature cards of the run, independent of
  the card's text size; the card sets `look.sizes.band` (the US-004 contract allows it), the other sizes
  keep scaling. No change in Obsidian2Typst.
- **D12:** shrink first, as US-011 D3; one line is decided by measuring `o2t-sb-box` itself.
- **D13:** a name that wraps even at the smallest size keeps its taller band and gets the warning; equal
  heights for it would need a band-height input of Obsidian2Typst (a story there first, SCAR-040), not made.
- **D14:** the three settings of US-011 D5 for the creature kind; title size default 11.5 pt.
- **D15:** a card without a statblock sets its title at `t` and counts in the check.
- **D16:** equal are the band's name size and height; the text under the statblock does not start at a
  common height (the statblocks differ). Release 0.6.0.

## Who relies on what changes (SCAR-017, SCAR-027)

| User | What it assumes | After this story |
|---|---|---|
| `core/card/sheet.ts`: `creatureBuildCode`, `CREATURE_PRELUDE` (`gcc-fit-c`) | every `look.sizes` entry scaled by S / 7; the fallback title at 1.3 em | in equal mode the band at `t`, the fallback title at `t` (AC-3, AC-5); off: unchanged (AC-1) |
| `core/card/titles.ts` (`titleWarnings`, `checkTitleSettings`) | kinds skill and spell | also creature (AC-4, AC-7, AC-8) |
| `core/creature/settings.ts`, `core/run/settings.ts`, `plugin/settings-file.ts` | the headings only | three keys and their checks (AC-8) |
| `core/run/run.ts`, `core/card/warning.ts` (`cardCode`) | title warnings for two kinds | `CREATURE_TITLE_WRAPPED` after the spell's (AC-7) |
| `plugin/settings/fields.ts`, `reset.ts`, the tab | 28 fields | 31 fields (AC-9) |
| golden sources, `tests/unit/sheet-*`, `settings-*`, `fields`, `titles` | the 0.5.0 output, the two kinds, the field count | unchanged output with the switch off (AC-1); counts and kinds amended |
| found at G2 (amended): `us-007-fields`, `us-007-tab-helpers`, `scheme-settings`, `titles-screen` (28 fields, two title groups, two redrawing toggles); `creature-settings`, `creature-screen`, `run-creature`, `integration/creature-card-headings` (creature settings are three headings; every `creature.` field is a heading); `card-escape` (eight escaped places) | the 0.5.0 membership | 31 fields, three groups and toggles; creature settings with the title keys; nine escaped places |
| Obsidian2Typst `o2t-sb-box` (read, not changed) | — | measured with a band-only statblock (AC-2) |
| `docs/technical/architecture.md`, `tests.md`, the manual-check index | — | amended; a new manual check |

## Not covered

An equal band height for a name that wraps at the smallest size (D13: needs an Obsidian2Typst input); the
text under the statblock at a common height (D16); equality across kinds; per-sheet equality (US-011 D1);
band fonts other than the fixture's Libertinus, the test font DejaVu Sans Mono and the author's preset font.
**Measured at #48:** 200 creature cards in equal mode compile in about 1.3 s in Node (off about 1.5 s); a first version
that measured the names once per card failed at 200 and was changed (`docs/technical/tests.md`, #48).
