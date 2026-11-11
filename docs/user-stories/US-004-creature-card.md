# US-004 — Creature card

**Status:** Draft (G0 done 2026-11-11; the owner answered the control project's
questions 2026-11-11: statblock through a new Obsidian2Typst API function, the
drop-then-shrink rule; the contract (AC-3) written 2026-11-11 and checked
against Obsidian2Typst US-039 at its G1). G1 and the tests wait for that G1.
Criteria marked *pending* depend on the owner's decisions.

**As** a game master **I want** one creature per card — its statblock, its
instincts and its attacks, a picture only if there is room — **so that** I can
run an encounter from the cards.

Reader of the output, engine, font: as US-002. The statblock is the one that
Obsidian2Typst draws for the book (route *pending*, see AC-3). The picture is
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
- **AC-3 (statblock, the contract).** The statblock part of the card is what
  Obsidian2Typst's API gives for the note's properties, drawn at the text width
  (54 mm). The reader is this plugin; the writer's story is Obsidian2Typst
  US-039 (SCAR-040). The contract, written here once:
  - **Call.** `app.plugins.plugins["obsidian2typst"].api` with
    `api.version === 1` and `typeof api.statblockTypst === "function"` and
    `typeof api.compileFonts === "function"`; otherwise the creature card is
    refused with a message naming the plugin and the least version (0.15.0);
    no other card is affected.
  - `api.statblockTypst(data, options?)`: `data` is the note's properties as
    plain values (keys in any case), `options.heading` the band's text (the
    note's file name). It returns `{ok: true, prelude, data, files, credit,
    warnings}` or `{ok: false, reason, message}`.
  - `prelude`: Typst definitions (the helper functions whose names start with
    `o2t-`), the same text for every call, no content of the note.
  - `data`: a Typst dictionary literal with the keys `band`, `look`, `boxes`,
    `track`, `attributes`, `traits`, `attacks`, `skills`, `tags`, for
    `#o2t-sb-box(data)`; `look.sizes` holds the pt sizes of the roles `band`,
    `value`, `label`, `text`, `attacks`, `skills`; `look.fonts` the families by
    role; a part without data is `none` (`skills: none`) or `()` (`attacks`).
  - `files`: `{path, bytes}` for each icon the data names, at that Typst path.
  - `credit`: the icons' credit text, or `null`.
  - `warnings`: `{code, message}` of the data checks, once each.
  - `api.compileFonts()`: the font files the book's export gives its compiler
    (bundled first, then the vault's).
  - The helper draws at the width of its container (`width: 100%`).
  Measured 2026-11-11 with Obsidian2Typst's own code, invented data, no icon
  files, Libertinus: 36 mm tall (vigour 4, one attack) to 55 mm (vigour 35,
  four attacks, skills, traits) at 54 mm width; not measured: icons and the
  preset's fonts in a card compile (the first ticket measures them).
  Example (invented): the answer for the Fen Hare note above, whose `data`
  starts `(band: "Fen Hare", look: (fill: ...`, and a `files` entry per icon.
- **AC-4 (fit, the statblock scales) — numbers measured.** The statblock's
  sizes scale with the card's text size S (factor S / 7); the text is set at
  S; sizes are tried as in US-002 AC-5.
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
  lowest priority by design). The fit facts carry which parts were kept
  (`CREATURE_FIT_UNKNOWN` when no fact is read). Measured 2026-11-11
  (typical statblock with a Skills line; invented words of 6.7 letters,
  paragraphs of 14 words; scope: this layout and this text; words in Signs,
  Instincts, Actions): (0, 30, 40) gives Instincts dropped at 7 pt; (20, 25,
  25) gives Signs dropped at 7 pt; (25, 40, 60) gives only the minimum, shrunk
  to 6.75 pt; (25, 40, 100) the minimum at 6 pt; (30, 60, 150) does not fit at
  5.5 pt (`CREATURE_TEXT_OVERFLOW`). **Consequence to confirm:** a creature
  of 70 words loses its Instincts although shrinking to about 6.25 pt would
  have kept them (the rule is drop first, as decided).
- **AC-6 (text is literal).** As US-002 AC-7 in the title, the section text and, through the API's own escaping, in the statblock values
  (examples to be written with the contract).
- **AC-7 (mixed deck).** Creature, skill and spell cards on one sheet, in the
  given order, every run inside its text area to 0.1 mm (US-003 AC-7).
- **AC-8 (deterministic).** As US-002 AC-11.
- **AC-9 (credit) — pending.** If the statblock shows condition icons that
  carry a credit, the credit line appears once in the bottom margin of every
  sheet with a creature card, and nowhere else.
- **AC-10 (look, SCAR-025).** A sheet with a small, a typical and a long
  creature at printed size, a statblock at 4x.

## Open decisions (control project, `Creature Card Questions.md`)

Route for the statblock (a new function in Obsidian2Typst, our own, or only
its data); the contract and the order of work; fonts; the credit; what the
card shows; the picture as a later story; scaling; the creature that does not
fit.

## Not covered

The picture (US-006), selection and the command (US-005), vault fonts for the
card text, the missing-glyph warning (issue #5).
