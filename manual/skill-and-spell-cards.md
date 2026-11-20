# Skill and spell cards

[Back to the manual](manual.md)

A skill card and a spell card are made from one note each. They look alike;
the spell card has no details row.

## Contents

- [The card](#the-card)
- [Tags](#tags)
- [The details row](#the-details-row)
- [The text](#the-text)
- [Text size](#text-size)
- [Characters no font has](#characters-no-font-has)

## The card

Inside the card's frame, with 4 mm padding, top to bottom:

| Part | Skill | Spell | Look |
| --- | --- | --- | --- |
| Tags | yes | yes | bold, small, joined by ` · ` |
| Title | yes | yes | the note's file name without `.md`, bold, larger |
| Details row | yes | no | `Time: action · Type: attack · Requires: Basket Knots` |
| Rule | yes | yes | a thin line across the card |
| Text | yes | yes | the note's text |

A part with nothing in it is left out: a note without tags has no tag line, a
note with only a title gives a card with only its title (and the warning
`SKILL_EMPTY` or `SPELL_EMPTY`).

With a [scheme note](colours-and-icons.md), the tags, title and details row
sit on a coloured band with icons instead of above a rule.

An example skill note, `Reed Sweep.md`:

```markdown
---
tags:
  - FieldCraft
  - Melee
timing: action
kind: attack
requires: "[[Basket Knots]]"
---
You sweep a **reed staff** low. Spend a success to knock an adjacent enemy
*prone*.

- Works only with a staff.
- Costs [one stamina](Stamina.md).
```

Its card shows the tags `Field Craft · Melee`, the title `Reed Sweep`, the
row `Time: action · Type: attack · Requires: Basket Knots`, a rule, then the
paragraph with `reed staff` in bold and `prone` in italic, and the list.

## Tags

The tags come from the **Tags property** (`tags` by default; one for skills,
one for spells, in **Settings → Note properties**). Each tag is shown in a
readable form:

| In the note | On the card |
| --- | --- |
| `FieldCraft` | Field Craft |
| `melee` | Melee |
| `Two-Hand` | Two-Hand |
| `#Ward2Off` | Ward2 Off |

A space is put before an upper-case letter that follows a lower-case letter
or a digit, a leading `#` is removed, and the first letter is made upper-case.
A tag with `/` is shown as written. A property with a single text value
(`tags: solo`) is one tag. Many tags wrap onto a second line.

## The details row

Skill cards only. The row shows up to three items, in this order:

| Setting (property, label) | Default | Shown as |
| --- | --- | --- |
| Timing | `timing`, `Time` | `Time: action` |
| Kind | `kind`, `Type` | `Type: attack` |
| Requires | `requires`, `Requires` | `Requires: Basket Knots` |

Change the property names to those your notes use, and the labels to the
words you want on the card, in **Settings → Note properties → Skill notes**.
With the timing property set to `pace` and its label to `Speed`, a note with
`pace: slow` shows `Speed: slow`.

- A property that is missing or empty is left out; with none of the three
  there is no row.
- A link shows its text: `[[Basket Knots]]` shows `Basket Knots`,
  `[[Basket Knots|knots]]` shows `knots`.
- A number or `true` / `false` is shown as written. Values are never
  interpreted: `none` is shown as `none`.
- A list or a map is left out with the warning `SKILL_VALUE_NOT_TEXT`.

A spell card ignores every property except its tags.

## The text

Everything after the properties is the card's text.

| In the note | On the card |
| --- | --- |
| paragraphs, `**bold**`, `*italic*` | as written |
| bullet and numbered lists, one level nested inside another | as lists |
| `[one stamina](Stamina.md)`, `[[Stamina\|stamina]]`, `[[Stamina]]` | the link's text: `one stamina`, `stamina`, `Stamina` |
| a heading | a bold line, without the `#` |
| a callout `> [!note] Title` | a paragraph that starts with its title in bold |
| a `---` line in the text | a rule |
| a ` ```dataview ` or ` ```dataviewjs ` block | left out, no warning |
| a picture or embed (`![](pics/reed.png)`, `![[Other note]]`) | left out, warning `SKILL_IMAGE_OMITTED` / `SPELL_IMAGE_OMITTED` |
| a table, HTML, another code block | its plain text lines (table cells joined by ` \| `), warning `SKILL_BLOCK_UNSUPPORTED` / `SPELL_BLOCK_UNSUPPORTED` |

Every character of your text appears on the card as you typed it, including
characters that mean something to Typst, such as `#`, `$`, `*`, `_`, `@` and
`\`.

If the properties at the top of the note are not valid YAML, the card is made
from the text alone and you get `SKILL_PROPERTIES_INVALID` or
`SPELL_PROPERTIES_INVALID`.

## Text size

All the text of a card (tags, title, details row and text) shrinks together
until it fits. The plugin tries the **Largest size** first, then smaller sizes
by the **Size step**, down to the **Smallest size**, and uses the largest size
at which everything fits. With the defaults the sizes tried are 7, 6.75, 6.5,
6.25, 6, 5.75 and 5.5 pt.

As a rough guide at the defaults: a card with about 140 words of text stays at
7 pt, about 200 words come out at 6 pt, and about 250 words no longer fit.

When the text does not fit even at the smallest size, the card is made at that
size and cut at the bottom of the card, and you get `SKILL_TEXT_OVERFLOW` or
`SPELL_TEXT_OVERFLOW` with the size. Every word that is shown is shown whole.
The plugin does not make a continuation card: shorten the note or lower the
**Smallest size**.

The sizes are in **Settings → Page and text size → Text size** and apply to
skill, spell and creature cards alike. The largest size can be 5.5 to 10 pt,
the smallest 4 to 10 pt (not above the largest), the step 0.05 to 1 pt. The
smallest size is always tried last, even when the steps skip it.

The title size can also be fixed for all cards of a kind: see
[Equal title bars](equal-title-bars.md).

## Characters no font has

The card's text is set in Libertinus Serif, which covers Latin, Greek and
Cyrillic letters, arrows and many symbols, but no Chinese, Japanese or Korean
characters and no emoji. A character that no font of the plugin has would be
printed as an empty space, silently.

The plugin checks the text of every card, and gives **one warning per note**
that lists the missing characters with their code points, for example:

```text
- SKILL_GLYPH_MISSING — Skills/Parry.md — 漢 U+6F22, 😀 U+1F600
```

At most ten characters are listed, then `and 2 more`. The PDF is made all the
same; the character stays blank. Replace the character in the note, or accept
the blank.

Checked are the title, tags, details row and text of skill and spell cards,
and the title, section headings and section texts of creature cards. Not
checked are a creature's statblock (Obsidian2Typst's text) and the credit
lines at the foot of a sheet. A character that any font of the compile has
counts as drawn: on a sheet with creature cards that includes the fonts of
Obsidian2Typst's preset.

If the check itself cannot run, the cards are made without it and you get one
`GLYPH_CHECK_UNAVAILABLE`.
