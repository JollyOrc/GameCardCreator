# US-003 — Spell card

**Status:** Ready (G0 and G1 done 2026-11-11; decisions D1 to D4 accepted by the
owner 2026-11-11)

**As** a game master **I want** one spell per card — its tags on top and the
whole description text, no pictures — **so that** I can hand a player the
spell instead of a rulebook page.

Reader of the output, engine and font: as US-002 (a PDF viewer and an A4
printer; Typst 0.14.2 through typst.ts 0.7.0; Libertinus Serif). The card sits
on the sheet of US-001 and can share a sheet with skill cards (AC-7).

A spell card is the skill card of US-002 **without the details row**: the
spell notes carry no properties besides their tags. Everything that US-002
says about reading text (AC-1 header handling, AC-2 tag labels, AC-4 text
forms, AC-7 literal text) holds for spells unless this story says otherwise;
each criterion below still has its own example (SCAR-007), written with
invented names.

## The card

Inside the US-001 frame, 4 mm padding, top to bottom, sizes relative to the
card's text size S: **tags** (bold, 0.8 S, joined by ` · `), **title** (the
note's file name without `.md`, bold, 1.3 S), a **rule** (0.4 pt), the
**description** (S, line spacing 0.5 em, 0.6 em between paragraphs); 2 pt
after each element. No details row, no pictures.

## Settings

| Setting | Default | Allowed |
|---|---|---|
| Tags property (spell) | `tags` | a property name |
| Largest, smallest text size and step | those of the skill card (D2) | as US-002 |

## The example note used below (invented)

`Reed Whisper.md`:

```
---
tags:
  - Wizardry
  - ElementalMagic
---
A **thin breeze** carries your voice to one listener within sight.

The target hears you as a whisper, however far away. They can answer only
if they know [[Reed Whisper|this spell]].
```

## Acceptance criteria

- **AC-1 (reading).** The example gives: title `Reed Whisper`; tags
  `Wizardry`, `Elemental Magic`; no details; two paragraphs, the first with
  `thin breeze` bold, the second ending `...if they know this spell.`; no
  warnings. A note without front matter (`Just words.`) gives the title and
  one paragraph and no warning (1 of the 76 real spell notes is such a note).
  A note with front matter and no tags gives no tag line.
- **AC-2 (no details row).** Properties other than the tags property are
  ignored: the example with `timing: action` added shows exactly the same
  card; a `tags` value of one string is one tag (`tags: solo` shows `Solo`).
- **AC-3 (text forms).** As US-002 AC-4, each with its example:
  `[Stone Skin](Stone%20Skin.md)` shows `Stone Skin`;
  `[[Stone Skin|the skin spell]]` shows `the skin spell`; `[[Stone Skin]]`
  shows `Stone Skin`; a bullet list and a numbered list; an image
  `![](pics/breeze.png)` is left out with `SPELL_IMAGE_OMITTED` (detail
  `pics/breeze.png`); a table, HTML or a code block is shown as plain text
  lines with `SPELL_BLOCK_UNSUPPORTED` (detail `table`, `html`, `code`).
- **AC-4 (warnings).** The warnings of a spell are `SPELL_PROPERTIES_INVALID`
  (detail `yaml`), `SPELL_IMAGE_OMITTED`, `SPELL_BLOCK_UNSUPPORTED`,
  `SPELL_EMPTY` (nothing but a title), `SPELL_TEXT_OVERFLOW` (detail
  `5.5 pt`) and `SPELL_FIT_UNKNOWN`, each naming the note's path, in the
  order of US-002 AC-8. A spell never gives a `SKILL_` code and a skill never
  a `SPELL_` code: the example sheet of AC-7 with one overflowing skill and
  one overflowing spell lists `SKILL_TEXT_OVERFLOW` for the first and
  `SPELL_TEXT_OVERFLOW` for the second.
- **AC-5 (fit).** As US-002 AC-5 for a card without the details row. Measured
  2026-11-11 (the card above with two tags, invented words of 6.7 letters on
  average, paragraphs of 35 words; scope: this layout and this text, an
  independent spike run): 40, 80 and 120 words use 7 pt; 150 words 6.75 pt;
  174 words (the longest real spell) 6.25 pt; 200 words 6 pt; 230 words do not
  fit at 5.5 pt (overflow as US-002 AC-6: made at 5.5 pt, cut at the text
  area, `SPELL_TEXT_OVERFLOW`).
- **AC-6 (shared size settings, D2).** The skill and the spell card use one
  set of size settings. With the largest size 6, the smallest 5, the step 0.5
  the sizes tried are 6, 5.5, 5 for both; a 20-word skill and a 20-word spell
  are both made at 6 pt.
- **AC-7 (one sheet for both, composed with US-001 and US-002).** Three skill
  cards and seven spell cards in the order skill, spell, spell, skill, spell,
  spell, skill, spell, spell, spell fill two pages (9 and 1) in that order; every
  run of every card lies inside its text area, to 0.1 mm; frames and cut
  marks are as in US-001.
- **AC-8 (text is literal).** As US-002 AC-7: in a spell's title, tag and
  description each of `#`, `$`, `*`, `_`, `@`, `<x>`, `\`, `` ` ``, `//` and
  the line starts `=`, `-`, `+`, `/` appears literally.
- **AC-9 (deterministic).** As US-002 AC-11, with spell cards on the sheet.
- **AC-11 (one place for the codes, D4, SCAR-017).** The kind and the code
  are put together in one function: `cardCode('spell', 'IMAGE_OMITTED')` is
  `SPELL_IMAGE_OMITTED`, `cardCode('skill', 'TEXT_OVERFLOW')` is
  `SKILL_TEXT_OVERFLOW`; no other source file of `src/core` contains a
  literal `SKILL_` or `SPELL_` code. A card without a kind is a skill card
  (the US-002 cards keep working).
- **AC-10 (look, SCAR-025).** The sheet of AC-7 at printed size and one spell
  card at 4x.

## Decisions (owner, 2026-11-11: all proposals accepted)

- **D1** tags on top exactly as on the skill card (all tags, wrapping).
- **D2** one shared set of size settings for all text cards.
- **D3** warning codes carry the kind (`SPELL_...`).
- **D4** the shared code is generalised, not copied: the reader, the sheet
  emitter and the fit warnings take the kind; the US-002 tests stay green.

## Not covered

Selection of notes and the command (US-005), creature cards (US-004), vault
fonts, the missing-glyph warning (issue #5).
