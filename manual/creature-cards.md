# Creature cards

[Back to the manual](manual.md)

A creature card shows one creature: its statblock at the top, then what it
does. The statblock is the one Obsidian2Typst draws for your book, so a card
and the book always agree.

## Contents

- [What you need](#what-you-need)
- [The card](#the-card)
- [The sections](#the-sections)
- [When the card is full](#when-the-card-is-full)
- [When there is no statblock](#when-there-is-no-statblock)
- [The credit line](#the-credit-line)

## What you need

- [Obsidian2Typst](https://github.com/JollyOrc/Obsidian2Typst) **0.15.1 or
  newer**, installed and enabled.
- In Obsidian2Typst, an **active preset with a statblock setup**. The
  statblock's look, icons and fonts come from that preset.
- A [kind rule](manual.md#which-note-is-which-card) that gives your creature
  folder the kind `creature`.

Without Obsidian2Typst, or with an older version, the run still makes every
skill and spell card, makes no creature card, and gives one warning
`CREATURE_API_UNAVAILABLE`.

## The card

Top to bottom, inside the card's frame with 4 mm padding:

1.  **The statblock**, drawn by Obsidian2Typst from the note's properties, with
    the note's file name in its band. Which properties it reads (stats,
    attacks, skills, tags) is described in Obsidian2Typst's manual, guide
    *Entries*.
2.  **Behaviour**: the note's section of that name.
3.  **Actions**: the note's section of that name.
4.  **Signs**: the note's section of that name.

Each section is shown with its heading as a small bold line. The paragraph
before the first heading and all other sections are not shown. There is no
picture on a creature card.

An example, `Fen Hare.md`:

```markdown
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

The card shows the statblock, then Behaviour, Actions and Signs, always in
that order, whatever their order in the note. `Fen hares are quick and shy.`
is not on the card.

The statblock grows and shrinks with the card's text size: at 7 pt it is
drawn at the size Obsidian2Typst gives it, at a smaller text size it is
scaled down with the text.

## The sections

The three headings are settings (**Settings → Note properties → Creature
notes**): `Behaviour`, `Actions` and `Signs` by default. Set them to the
headings your notes use.

- A section is found by its heading text without regard to case, at any
  heading level: `### behaviour` and `## Behaviour` both work.
- It ends at the next heading of the same or a higher level. A lower heading
  inside it is not shown, but the text under it is.
- Only headings at the top level of the note count, not a heading inside a
  callout or a list.
- If the same heading appears twice, the first section is used.
- The text inside a section follows the same rules as on a skill card (see
  [The text](skill-and-spell-cards.md#the-text)), with warnings that start
  with `CREATURE_`, for example `CREATURE_IMAGE_OMITTED`.

| Section missing | Result |
| --- | --- |
| Behaviour or Actions | the card without it, warning `CREATURE_SECTION_MISSING` with the heading |
| Signs | the card without it, no warning (Signs are optional) |
| a heading with no text under it | nothing shown, no warning |

## When the card is full

The parts of a creature card are not equally important. When everything does
not fit at the largest text size, the plugin gives up parts in this order,
trying the largest size again after each:

1.  the **Signs** section (no warning);
2.  the **Behaviour** section (warning `CREATURE_PART_DROPPED`, detail
    `Instincts`);
3.  the **Skills** line of the statblock (warning `CREATURE_PART_DROPPED`,
    detail `Skills`).

The statblock and the Actions section are always kept. Only when they alone
do not fit at the largest size does the text shrink, as on a skill card (see
[Text size](skill-and-spell-cards.md#text-size)). If they do not fit even at
the smallest size, the card is cut at the bottom and you get
`CREATURE_TEXT_OVERFLOW`.

So a long Behaviour section is dropped before the text gets smaller. Shorten
the sections you want to keep on the card.

## When there is no statblock

When Obsidian2Typst cannot give a statblock for a note, the card is made
without it: the creature's name as a bold title, then the sections. You get
`CREATURE_STATBLOCK_REFUSED` with Obsidian2Typst's reason. This happens when:

- Obsidian2Typst has no active preset with a statblock setup;
- the note has no stats and no attacks.

Obsidian2Typst's own warnings about the data (for example `STAT_SUM_MISMATCH`,
`TAG_UNMAPPED`, `STATBLOCK_ICON_MISSING`) are passed on with their own codes
and the note's path; the card is still made.

## The credit line

The icons of a statblock come with a credit text from the Obsidian2Typst
preset. It is printed once, small and centred, at the foot of every sheet that
has a creature card. If the sheet also shows
[scheme icons](colours-and-icons.md#the-icon-credit), both credits are printed
together on that line.

When the margin under the last row of cards is less than 3 mm high, there is
no room for the line: it is left out and you get `CREATURE_CREDIT_OMITTED`.
See [The sheet](sheet-layout.md#the-credit-line).
