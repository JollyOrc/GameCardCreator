# US-011 — Equal title bars: one title size and one header height per card kind

**Status:** Ready 2026-11-16 (G0, G1; decisions D1 to D7 made by the owner: "all proposals"; story committed
`db10d04`); G2 tests written 2026-11-16, red by design, AC-8 and AC-10 amended at G2.
**Introduced:** 0.5.0 (planned)
**Backlog issue:** #35

**As** a game master printing a sheet of skill or spell cards **I want** every card of one kind to have
the same title size and the same header height, **so that** a sheet looks even and the cards line up when
they lie side by side on the table.

Reader of the output, engine and font: as US-002 (a PDF viewer and an A4 printer; Typst 0.14 through
typst.ts 0.7.0; Libertinus Serif). All examples use invented names (SCAR-035). Creature cards are not
covered (D7, "Not covered").

---

## What happens today (0.4.0) and why the headers differ

The header of a skill or spell card is up to three lines: tags (bold, 0.8 S), title (bold, 1.3 S), details
row (0.9 S, skills only), where `S` is the card's own text size, chosen by the fit loop for each card
(US-002 AC-5). A card with a branch has a band of 4 mm + header + 2 mm (US-009 AC-3); its header is as wide
as the text area minus the icons and 1.5 mm (US-009 AC-5). A card without a branch has the plain header,
then a rule (US-002). So two headers of one kind differ in height for three reasons:

1. **the title wraps** (a long title, or a narrower header beside icons);
2. **the tags line or the details row wraps**;
3. **the text size differs** (a card with much text shrinks, and its header shrinks with it).

Measured (2026-11-16, Typst 0.14.2, the bundled fonts, the defaults; the example notes below), header
heights at text size 7 pt and 54 mm width: `Parry.md` 6.22 mm, `Riverbank Ambush of the Reed Wardens.md`
9.89 mm (its title wraps at 9.1 pt), `Feint.md` 8.48 mm (its tags line wraps); at 6 pt `Parry.md` would be
5.53 mm. (Typst's `measure` of a block, from the cap height of its first line to the baseline of its last,
as the plugin measures today.)

## Terms

- **Kind:** skill or spell. Each kind has its own switch (D5); "the cards of a kind" are all the cards of
  that kind in one run, on every sheet of it (D1). Cards of another kind in the same run do not count.
- **Header:** the tags line, the title and the details row of a card, each when present (as today).
- **Title size** `T` and **smallest title size** `Tmin`: settings of the kind (D5).
- **The kind's title size** `t`: the one size at which every title of the kind is set (AC-2).
- **The kind's header height** `H`: the one height every header of the kind gets (AC-3).
- **Equal mode:** a kind whose switch is on.

## Settings (defaults)

Per kind, in `skill` and `spell` of the settings file (D5):

| Setting | Key | Default | Allowed |
|---|---|---|---|
| Equal title bars | `equalTitles` | off | on, off |
| Title size | `titleSize` | 9.1 pt (1.3 x the default text size 7 pt) | 6 to 20 pt |
| Smallest title size | `minTitleSize` | 7 pt | 4 to 20 pt, not above the title size |

The step between the title sizes tried is the shared `Size step` of the text sizes (US-003 D2; default
0.25 pt). A settings file without these keys gets the defaults (US-008 AC-4), so a 0.4.0 file works
unchanged.

## The examples used below (invented)

Skill notes (default settings unless stated; no scheme note unless stated):

| Note | Tags | Details | Text |
|---|---|---|---|
| `Parry.md` | `CombatSkill`, `Swordplay` | `time: reaction` | 40 words |
| `Riverbank Ambush of the Reed Wardens.md` | `Swordplay` | `time: action` | 40 words |
| `Feint.md` | `CombatSkill`, `Swordplay`, `Footwork`, `Misdirection`, `Trickery`, `Quickness`, `Deception`, `Bluffing` | `time: reaction` | 40 words |
| `The Long Riverbank Ambush of the Hidden Reed Wardens.md` | `Swordplay` | `time: action` | 40 words |
| `Long Lesson.md` | `Swordplay` | `time: action` | 200 words (today: 6 pt, US-002 AC-5) |
| `Plain.md` | `Misc` | none | 40 words |

Scheme note (only where stated): the one of US-009 (`Swordplay` → `#F4D6B0`, `sword`).

Measured for the examples (Typst 0.14.2, bundled fonts; the largest size at which the title stays on one
line, in pt): `Riverbank Ambush …` 8.27 at 54 mm (plain header), 7.07 at 46.15 mm (beside one `sword` icon:
54 mm − 6.35 mm − 1.5 mm); `The Long Riverbank Ambush …` 5.75 at 54 mm; `Parry`, `Feint`, `Plain` above 20
in both widths.

## Acceptance criteria

- **AC-1 (off is today).** With the switch of a kind off, its cards are exactly as in 0.4.0: the Typst
  source of a run is the same text as 0.4.0's for the same notes and settings (the golden sources of US-009
  stay green; a test compares a run with every new key absent, and one with the keys present and the switch
  off). The switch of one kind does not change the cards of the other kind: with only skills on, the spell
  cards' source is today's.
- **AC-2 (one title size per kind: shrink first, D2, D3).** In equal mode the sizes tried for the title are
  `T`, then steps of `Size step` down while not below `Tmin`, then `Tmin` itself as the last (the rule of
  `textSizes`, US-002 AC-10, rounded the same way). The kind's title size `t` is the largest of them at which
  **every** title of the kind fits on one line in **its own** header width (54 mm minus its icons and 1.5 mm
  on a card with a branch, the full text width on a plain one, at the default card size). Every title of the
  kind is set at `t`, whatever the card's text size. Examples at the defaults (`T` 9.1, `Tmin` 7, step 0.25:
  9.1, 8.85, 8.6, 8.35, 8.1, 7.85, 7.6, 7.35, 7.1, 7):
  - `Parry`, `Feint`: `t` = 9.1.
  - `Parry`, `Riverbank Ambush …`, `Feint`, no scheme: `t` = 8.1 (8.35 is wider than the 8.27 that fits).
  - The same with the scheme (both titles beside a `sword` icon): `t` = 7 (7.1 is above the 7.07 that fits).
- **AC-3 (one header height per kind, D2, D4).** In equal mode the whole header is set from `t`: as today,
  but at the text size `t / 1.3` instead of the card's `S` (tags `0.8 t / 1.3`, title `t`, details row
  `0.9 t / 1.3`, leading and gaps as today), so a card's header does not depend on its text size (reason 3
  goes). The kind's header height `H` is the largest header height among the cards of the kind (in each
  card's own header width), whatever makes it largest: a wrapped title, tags line or details row. Every
  header of the kind is given the height `H`; its lines stay at the top, and the room under a shorter
  header stays empty. Example (no scheme, defaults; `t` = 8.1 from AC-2): headers `Parry` 5.69 mm,
  `Riverbank Ambush …` 5.69 mm, `Feint` 7.70 mm (its tags line wraps): `H` = 7.70 mm for all three. Today the
  same three are 6.22, 9.89 and 8.48 mm.
- **AC-4 (the text size is not in it, reason 3).** `Long Lesson.md` with `Parry` and `Riverbank Ambush …`
  in equal mode: its text is still fitted as today (6 pt or whatever the room under `H` allows), its header
  is the same as the others' (title 8.1 pt, height `H`). Today its header is set at 6 pt (title 7.8 pt).
- **AC-5 (still too long: wrap, grow, one warning, D3).** When a title does not fit on one line even at
  `Tmin`, `t` = `Tmin`, that title wraps, and `H` grows with it (AC-3). The run gives **one** warning for
  the kind: `SKILL_TITLE_WRAPPED` or `SPELL_TITLE_WRAPPED` (made by `cardCode`), path the note whose title
  is widest at `Tmin`, detail `<k> of <n> titles wrap at <Tmin> pt`. Example: `Parry`, `Riverbank Ambush …`,
  `Feint`, `The Long Riverbank Ambush …`, no scheme: `t` = 7, the last title wraps; headers at 7 pt: 5.11,
  5.11, 6.85 and 7.94 mm: `H` = 7.94 mm; one warning `SKILL_TITLE_WRAPPED — The Long Riverbank Ambush of the
  Hidden Reed Wardens.md — 1 of 4 titles wrap at 7 pt`. No warning when every title fits (shrinking is no
  problem, D3).
- **AC-6 (banded and plain cards, D6).** On a card with a branch the band is 4 mm + `H` + 2 mm high (US-009
  AC-3 with `H` for the header's height) and the text starts 2 mm under the band (US-009 AC-8). On a card
  without a branch the header box is `H` high, the rule stands 2 pt under the box (as today under the last
  header line) and the text follows as today. So the band's lower edge, the rule and the text's first line
  stand at the same height on every card of the kind that has the same kind of header. Example (the scheme,
  defaults): `Parry`, `Riverbank Ambush …` (banded, `sword`), `Plain` (no branch): `t` = 7 (AC-2), headers
  5.11, 5.11 and 3.28 mm: `H` = 5.11 mm; both bands 11.11 mm high; `Plain`'s header box 5.11 mm, its rule
  under it. The icons, the gradient, the bleed and the credit line are as in US-009.
- **AC-7 (the fit).** The text of each card is fitted as today (US-002 AC-5, AC-6; US-009 AC-8), in the
  room left under `H`: the sizes tried, the cut and the overflow warning are unchanged, only the header's
  room is `H` instead of the card's own header. `t` and `H` are worked out from the titles and headers
  alone, never from the fit, so the fit cannot change them (SCAR-021); two compiles of the same run give the
  same `t`, `H` and sizes.
- **AC-8 (one compile, the facts).** `t` and `H` are measured in Typst in the same compile as the cards (no
  second compile), once per kind. For each kind in equal mode the compile writes one fact under the label of the fit facts,
  `gcc-fit`, in a shape of its own: `(titles: <kind>, size: t, height: H (mm), wrapped: <card indexes>,
  widest: <card index>)` (amended at G2: the worker reads one label, US-008; a fact without `i` is
  already ignored by the fit warnings, US-002 AC-8); the run makes
  the warning of AC-5 from it, after the notes' own warnings and the glyph warnings and before the fit
  warnings (US-010 AC-5). A run without a kind in equal mode writes no such fact.
- **AC-9 (the settings and their checks, SCAR-019).** Title size outside 6 to 20 pt, smallest title size
  outside 4 to 20 pt, or (both in range) the smallest above the title size: refused with one message each,
  naming the kind (`The skill title size 21 is outside 6 to 20 pt`), checked whether the switch is on or
  off (as the bleed). Examples with `Parry` and `Riverbank Ambush …`, no scheme, step 0.25:
  - `T` 9.1, `Tmin` 7 (defaults): `t` 8.1 (AC-2).
  - `T` 20, `Tmin` 7 (upper end): `t` 8.25 (20 − 47 steps; 8.25 fits under 8.27).
  - `T` 13, `Tmin` 7 (a middle value): `t` 8.25.
  - `T` 6, `Tmin` 4 (lower ends): `t` 6, no shrinking needed.
  - `T` 9.1, `Tmin` 9.1 (no room to shrink): `t` 9.1, `Riverbank Ambush …` wraps, warning `1 of 2 titles
    wrap at 9.1 pt`.
  - With `Size step` 1 (not the default): `T` 9.1, `Tmin` 7: tried 9.1, 8.1, 7.1, 7: `t` 8.1.
- **AC-10 (the settings screen, US-007).** The page `Page and text size` gets two groups after `Text
  size`: `Skill titles` and `Spell titles`, each with the toggle `Equal title bars` and the number fields
  `Title size` and `Smallest title size` (pt). The two number fields are shown only while the toggle is
  on; switching the toggle redraws the page at once (SCAR-016); a hidden field keeps its value in the file.
  The fields commit through the one path of US-007 AC-4 (`commitSetting`), an invalid value is refused
  under the field (US-007 AC-3, AC-8), and `Reset this page to defaults` resets them with the page's other
  keys (US-007 AC-9). Twenty-eight fields in all (twenty-two before).
- **AC-11 (deterministic, rule 7).** As US-002 AC-11: the same notes and settings give the same PDF bytes in
  two fresh processes; the order of the notes in the run does not change `t` or `H`.
- **AC-12 (look, SCAR-025).** A sheet of the examples of AC-3, AC-5 and AC-6 at printed size, and the band
  edges and rules of neighbouring cards zoomed in at 4x: the bands' lower edges and the rules of one row of
  cards lie on one line to 0.1 mm (checked by program from the PDF's drawing positions, SCAR-015,
  SCAR-023: the number of bands and rules checked equals the number of cards drawn). The author's run on
  their own vault in Obsidian (manual check M09, SCAR-045).

## Interfaces fixed by the tests (G2)

So that the tickets agree: `src/core/card/titles.ts` has `TitleSettings` (`equalTitles`, `titleSize`, `minTitleSize`),
`DEFAULT_TITLES`, `checkTitleSettings(kind, settings)` (the messages of AC-9: `The <kind> title size <v> is outside 6 to
20 pt`, `The <kind> smallest title size <v> is outside 4 to 20 pt`, `The <kind> smallest title size <v> is above the
title size <t>`), `titleSizes(settings, step)` (the rule of `textSizes`) and `titleWarnings(facts, cards)` (pure; skill
before spell; the first valid fact of a kind counts; a fact whose `widest` is no card of its kind is ignored).
`SkillSettings` and `SpellSettings` extend `TitleSettings`; `cardSheetTypst`'s options take `titles: {skill?, spell?}`;
the title sizes are written into the source as an array like the text sizes; the title of every card of a kind in equal
mode is written once more, as a string literal, into the kind's data (an eighth escaped place, `card-escape`). The fields
are `skill.equalTitles`, `skill.titleSize`, `skill.minTitleSize` and the same for `spell`, in the groups `Skill titles` and
`Spell titles`; `FieldDef.shownWhen` names the toggle, `isShown(def, settings)` and `redraws(id)` decide, and the tab draws
a group's fields through `isShown` with the settings of now and, after a toggle's commit, draws the page again when
`redraws(def.id)`.

## Decisions (the owner, 2026-11-16: "all proposals")

- **D1:** "all cards of a kind" are those of the whole run, per kind; not per sheet.
- **D2:** in equal mode the header is set from the title size alone (title `t`, tags and row in their
  present proportions), independent of the card's text size.
- **D3:** shrink the title first, down to the smallest title size; then wrap, the headers grow, and one
  warning per kind names the widest title. Shrinking alone gives no warning.
- **D4:** the header height is the tallest header of the kind, whatever the reason (title, tags line,
  details row).
- **D5:** settings per kind (skill, spell): a switch, default off; a title size, default 9.1 pt, range 6 to
  20; a smallest title size, default 7 pt, range 4 to the title size; shown only while the switch is on.
- **D6:** cards without a branch get the same header height; their rule stands under it.
- **D7:** skill and spell cards in this story (release 0.5.0); creature cards are a follow-up (see "Not
  covered").

## Who relies on what changes (SCAR-017, SCAR-027)

| User | What it assumes | After this story |
|---|---|---|
| `core/card/sheet.ts`: `headerLines`, `buildCode`, `bandHeaderCode`, `gcc-fit`, `gcc-fit-b` | the header is set at the card's `S` and is as high as its own lines | in equal mode at `t / 1.3`, in a box of `H` (AC-3, AC-6); off: unchanged (AC-1) |
| `core/skill/fit.ts` (reads `gcc-fit`) | one fact per card | also reads `gcc-titles` (AC-8) |
| `core/run/run.ts`, `core/card/warning.ts` (`cardCode`) | the warnings in the order of US-010 AC-5 | `*_TITLE_WRAPPED` after the glyph warnings (AC-5, AC-8) |
| `core/skill/settings.ts`, `core/spell/settings.ts`, `core/run/settings.ts` | the keys of 0.4.0 | three keys per kind and their checks (AC-9) |
| `plugin/settings/fields.ts`, `reset.ts`, the tab (US-007) | 22 fields, every field always shown | 28 fields; two hidden while the toggle is off (AC-10) |
| golden sources (US-009), `tests/unit/sheet-*`, `card-codes`, `settings-*`, `fields` | the 0.4.0 output and field count | unchanged output with the switch off (AC-1); counts amended |
| `docs/technical/architecture.md`, `tests.md`, the manual-check index | — | amended; M09 added |

## Not covered

Creature cards (D7): their name band is drawn by Obsidian2Typst's statblock (`o2t-sb-box`), so equal bars
there need a size or height input of that API, written first in Obsidian2Typst's story (SCAR-040), and a
measurement of how often a creature name wraps; the creature card without a statblock (its title in this
plugin) goes with that follow-up. Equal heights across kinds; per-sheet equality (D1); cutting or shrinking
a tags line or details row so that it does not wrap (D4); other fonts. **Not measured yet (G2):** the
compile time with equal mode on a run of 200 cards; the creature side.
