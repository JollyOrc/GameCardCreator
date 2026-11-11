# US-002 — Skill card

**Status:** Ready (G0 and G1 done 2026-11-11; decisions D1 to D5 made by the owner 2026-11-11)

**As** a game master **I want** one skill per card — its tags on top and the
whole description text, no pictures — **so that** I can hand a player a card
instead of a rulebook page.

Reader of the output: a PDF viewer and an A4 printer, via the sheet of US-001.
Engine: Typst 0.14.2 through typst.ts 0.7.0 (`docs/technical/spike-typst.md`).
Font: Libertinus Serif (SIL OFL 1.1), as in Obsidian2Typst (D4).

All examples use invented names. The property names below are the
**defaults** of settings (AC-10); the author maps them to the names of their
own notes in the settings, so the vault's real names are not in this
repository (SCAR-035).

## The card

Inside the US-001 frame (62 x 88 mm), with 4 mm padding (text area 54 x 80
mm), top to bottom, all sizes relative to the card's text size S (the
description's size, AC-5):

1. **Tags**: bold, 0.8 S, joined by ` · `, wrapping.
2. **Title**: the note's file name without `.md`, bold, 1.3 S, wrapping.
3. **Details row**: 0.9 S, `Label: value` items joined by ` · `, wrapping.
4. A rule, 0.4 pt, the full text width.
5. **Description**: S, line spacing 0.5 em, 0.6 em between paragraphs.

Each element is followed by 2 pt, the rule by 2 pt more. Font Libertinus
Serif; no fills, no images (the card draws only text and the rule).

## Settings (defaults)

| Setting | Default | Allowed |
|---|---|---|
| Tags property | `tags` | a property name |
| Timing property, label | `timing`, `Time` | a name, a label |
| Kind property, label | `kind`, `Type` | a name, a label |
| Requires property, label | `requires`, `Requires` | a name, a label |
| Largest text size | 7 pt | 5.5 to 10 pt |
| Smallest text size | 5.5 pt | 4 to the largest |
| Size step | 0.25 pt | 0.05 to 1 pt |

## The example note used below (invented)

```
---
tags:
  - FieldCraft
  - Melee
timing: action
kind: attack
requires: "[[Basket Knots]]"
---
```dataviewjs
await dv.view("views/card-details")
```

You sweep a **reed staff** low. Spend a success to knock an adjacent enemy
*prone*.

- Works only with a staff.
- Costs [one stamina](Stamina.md).

![](pics/reed.png)
```

named `Reed Sweep.md`.

## Acceptance criteria

- **AC-1 (reading, SCAR-034).** The front matter is removed once, at read
  time, before any rule; a fenced block whose language is `dataview` or
  `dataviewjs` is dropped without a warning. The example gives: title
  `Reed Sweep`; tags `FieldCraft`, `Melee`; timing `action`; kind `attack`;
  requires `[[Basket Knots]]`; description blocks: a paragraph, a bullet list
  of two items, an image. A `---` line in the middle of the description is
  content (a rule), not a second header; a front matter without its closing
  `---` line is content too.
- **AC-2 (tags).** Each tag is shown with a space inserted before an
  upper-case letter that follows a lower-case letter or digit, a leading `#`
  removed, and the first letter upper-cased: `FieldCraft` shows `Field Craft`,
  `melee` shows `Melee`, `Two-Hand` stays `Two-Hand`, `#Ward2Off` shows
  `Ward2 Off`. No tags: no tag line. Five tags wrap onto a second line.
  A tag containing `/` is shown as written, without the capital (not
  measured: no real note has one). A `tags` value that is one string is one
  tag (`tags: solo` shows `Solo`); not measured: all real notes use a list.
- **AC-3 (details row, D2).** Each present property is `Label: value`;
  absent or empty ones are left out; order timing, kind, requires; all absent:
  no row. A link `[[Basket Knots]]` shows `Basket Knots`;
  `[[Basket Knots|knots]]` shows `knots`. The example shows
  `Time: action · Type: attack · Requires: Basket Knots`. A value that is a
  list or a map is left out with the warning `SKILL_VALUE_NOT_TEXT`; a
  number or boolean is shown as written (`2`, `true`). Values are never
  interpreted (`none` stays `none`).
- **AC-4 (description text).** Shown: paragraphs; `**bold**`, `*italic*`;
  bullet and numbered lists (one nesting level inside another list included);
  links as their text (`[one stamina](Stamina.md)` shows `one stamina`,
  `[[Stamina|stamina]]` shows `stamina`, `[[Stamina]]` shows `Stamina`);
  a heading as a bold line (its `#`s removed); a callout (`> [!note] Title`)
  as a paragraph whose first words are the callout's title in bold; a rule.
  Not shown: images and embeds (`![](...)`, `![[...]]`): each gives the
  warning `SKILL_IMAGE_OMITTED` naming the note (D3). Anything else (a table,
  HTML, another code block) is shown as its plain text lines (a table row is
  one line, its cells joined by ` | `, the separator row left out), with the warning
  `SKILL_BLOCK_UNSUPPORTED` naming the note and the kind. The example
  description reads: `You sweep a reed staff low. Spend a success to knock an
  adjacent enemy prone.` then the two list items, with `reed staff` bold and
  `prone` italic, and one `SKILL_IMAGE_OMITTED` warning. A heading and a
  callout become paragraphs (all runs bold; the callout's title bold first),
  so the description is a list of paragraphs, lists (items hold paragraphs
  and lists) and rules.
- **AC-5 (fit, D4).** All text of the card (tags, title, row, description)
  scales together from the largest size (7 pt) down in steps of 0.25 pt; the
  largest size at which everything fits the text area is used (measured in
  Typst with `measure`, one compile; the size and whether it fits are read
  back from the compile, label `gcc-fit`). Measured 2026-11-11 with the layout
  above, invented words of 6.7 letters on average (harsher than the real
  notes), paragraphs of 35 words: 40, 80, 115 and 140 words use 7 pt; 160
  words use 6.25 pt; 200 words use 5.75 pt; 250 words do not fit at 5.5 pt
  (AC-6). The sizes tried at the defaults are 7, 6.75, 6.5, 6.25, 6, 5.75,
  5.5. Scope: this layout and this text; a note with longer paragraphs or
  lists may differ (the tests use the same fixture).
- **AC-6 (overflow, D4).** When the text does not fit at the smallest size,
  the card is still made at that size, the text is cut at the card's inner
  edge, and the warning `SKILL_TEXT_OVERFLOW` names the note and the size.
  Every word that is shown is shown whole; nothing is lost without the warning.
  A test with more text than the card holds checks both (SCAR-015).
- **AC-7 (text is literal, rule 6).** Every piece of user text passes through
  the one escaping function of the emitter. Each of these appears literally in
  the PDF, in the title, a tag, the details row, a paragraph, a list item,
  bold text and link text: `#`, `$`, `*`, `_`, `@`, `<x>`, `\`, `` ` ``, `//`,
  `"`, `[`, `]`, and, at the start of a paragraph or item, `=`, `-`, `+`, `/`.
- **AC-8 (problems are warnings, rule 8).** Each warning above names the
  note's path, and a note's warnings are in the order of its text: the
  properties first (in the order they are written), then the description; a
  front matter that is not valid YAML gives `SKILL_PROPERTIES_INVALID` (detail
  `yaml`), is not shown, and the card is made from the description; one failing
  card does not stop the others; the list of
  warnings is returned with the sheet, in card order. A note with nothing but a title (no tags, no
  details, no description) gives a card with its title only and
  `SKILL_EMPTY`. A card for which the compile reports no fit fact gets
  `SKILL_FIT_UNKNOWN` (the fit is never assumed). Warning details: the image
  target as written (`pics/reed.png`), the block kind (`table`, `html`,
  `code`), the property name (`kind`), the size (`5.5 pt`).
- **AC-9 (empty parts).** No description: a card of tags, title and row. No
  properties: title and description. Nothing at all: title only.
- **AC-10 (settings, SCAR-019, SCAR-037).** Property names and labels come
  from the settings. With the timing property set to `pace` and its label to
  `Speed`, the example note (which has `timing`, not `pace`) shows no timing
  and a note with `pace: slow` shows `Speed: slow`. Two settings naming the
  same property are refused with a message before anything is made. Sizes: at
  the largest 5.5 pt, smallest 4 pt, step 1 pt, the sizes tried are 5.5, 4.5
  and 4 (the smallest is always the last one tried), so a 400-word text is
  made at 4 pt with the overflow warning when it still does not fit. Largest below smallest is refused.
- **AC-11 (deterministic).** The same notes and settings give the same PDF
  bytes (two fresh processes), as US-001 AC-10.
- **AC-12 (on the sheet, composed with US-001).** Ten skill cards give two
  pages (9 and 1); every drawn element of a card lies inside its frame
  (read back from the PDF, to 0.1 mm); cut marks and frames are as in US-001.
- **AC-13 (look, SCAR-025).** The card at printed size and at 4x: the tags,
  the title, the row, a long and a short description.

## Decisions (owner, 2026-11-11)

- **D1** property names are settings with invented defaults.
- **D2** labelled details row (`Time: action · Type: attack · Requires: ...`).
- **D3** images in a description are left out, with `SKILL_IMAGE_OMITTED`.
- **D4** shrink from 7 to 5.5 pt, then cut and warn; a continuation card is
  not made. Font: Libertinus Serif bundled (SIL OFL 1.1, notice kept); vault
  fonts in a later settings story.
- **D5** the title is the note's file name.

## Known limitation (found at G2, not decided)

A character that Libertinus Serif does not have (an emoji, many symbols) is
not drawn and Typst gives no warning for it (Obsidian2Typst's spike S4,
measured there; not measured again here). Rule 8 asks for a warning. A
coverage check from the font's own character map is a candidate for a
follow-up story; the owner decides whether it belongs in US-002.

## Not covered

Spell and creature cards (US-003, US-004), selection and the command
(US-005), vault fonts, icons in the row, card colours.
