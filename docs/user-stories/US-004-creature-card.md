# US-004 — Creature card

**Status:** Draft (G0 done 2026-11-11). Blocked on the owner's answers to the
questions of the control project (statblock route, contract, fonts, credit,
overflow). Criteria marked *pending* depend on them.

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

From top to bottom, inside the US-001 frame with 4 mm padding (text area 54 x
80 mm): the **statblock** at the full text width; the **Behaviour** section;
the **Actions** section, each with its heading as a small bold line. The lead
paragraph and every other section are not shown.

## Settings (defaults)

| Setting | Default | Allowed |
|---|---|---|
| Behaviour section heading | `Behaviour` | heading text |
| Actions section heading | `Actions` | heading text |
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
  properties as plain values (the statblock reads them); the Behaviour blocks:
  a bullet list of two items; the Actions blocks: a bullet list of two items;
  nothing from the lead paragraph or from `Signs`. The text rules are those of
  US-002 AC-1 and AC-4 (header read once, links as text, images left out with
  a warning, and so on) with the codes of the creature kind
  (`CREATURE_IMAGE_OMITTED`, ...).
- **AC-2 (sections).** A section is found by its heading text, without case,
  at any heading level (`##`, `###`); it ends at the next heading of the same
  or a higher level. `### behaviour` finds `Behaviour`. A missing section
  gives no block and one warning `CREATURE_SECTION_MISSING` (detail: the
  heading text, e.g. `Actions`); a section with a heading and no text gives
  no block and no warning. The example note with the Actions section removed
  gives one warning.
- **AC-3 (statblock, contract) — pending.** The statblock part of the card is
  what Obsidian2Typst's API gives for the note's properties, drawn at the
  text width (54 mm). Measured 2026-11-11 with that plugin's own code and
  invented data: 36 mm tall (vigour 4, one attack) to 55 mm (vigour 35, four
  attacks, skills, traits) at the preset's sizes; not measured: icons and
  fonts. The contract (the shape of the API's answer) is written here once the
  route is decided (SCAR-040).
- **AC-4 (fit, with the statblock) — numbers measured, rule pending.** The
  statblock's sizes scale with the card's text size S (factor S / 7), the
  Behaviour and Actions text is set at S, and the largest S that fits is
  used (US-002 AC-5). Measured 2026-11-11 (typical statblock, invented words
  of 6.7 letters, paragraphs of 14 words; scope: this layout and this text):
  30 words use 7 pt; 71 words 6.25 pt; 120 words 5.25 pt; 175 words do not fit
  at 4 pt. Real creature notes: median 71 words, 9 of 38 above 90, 5 above 120.
- **AC-5 (a creature that does not fit) — pending.** One of: cut and warn;
  a continuation card; two cards per creature. The warning codes are
  `CREATURE_TEXT_OVERFLOW` and `CREATURE_FIT_UNKNOWN` in the cut case.
- **AC-6 (text is literal).** As US-002 AC-7 in the title, the Behaviour and
  Actions text and, through the API's own escaping, in the statblock values
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
