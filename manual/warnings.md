# Warnings

[Back to the manual](manual.md)

When a note cannot be turned into a card exactly as written (a picture that
does not fit on a card, a text that is too long, a link to a note that does
not exist), the plugin does not stop and does not hide it: it makes every card
it can and reports a **warning** with the note's path.

## Contents

- [The warnings file](#the-warnings-file)
- [The order of the warnings](#the-order-of-the-warnings)
- [List of warnings](#list-of-warnings)
- [When a run is refused](#when-a-run-is-refused)

## The warnings file

Every run writes `<name> cards warnings.md` next to the PDF, also when there
are no warnings. It replaces the file of the previous run, so it never shows
problems you have already fixed. The notice at the end of the run gives the
count: `✅ Created 12 cards on 2 pages, 3 warnings. Written to …`.

The file has a heading and one line per warning: the code, the note's path
and a detail.

```markdown
# Opening Deck cards: warnings

- DECK_LINK_MISSING — Opening Deck.md — Gone
- CARD_KIND_UNKNOWN — Misc/Loose.md
- SKILL_IMAGE_OMITTED — Skills/Reed Sweep.md — pics/reed.png
- SKILL_TEXT_OVERFLOW — Skills/Long Drill.md — 5.5 pt
```

Without warnings the file holds the heading and `No warnings.` A warning that
belongs to no note (for example `CREATURE_API_UNAVAILABLE`) has an empty path.
The file has no date, so two runs of the same cards give the same file.

Warnings are never printed into the PDF.

## The order of the warnings

1.  the deck note's warnings, in the order of its links;
2.  each card's reading warnings (properties first, then the text), in card
    order;
3.  missing characters, in card order;
4.  wrapped titles, skill before spell before creature;
5.  the fit warnings (text cut, parts given up), in card order.

## List of warnings

Many codes start with the card's kind: `SKILL_`, `SPELL_` or `CREATURE_`.
Below, `<KIND>` stands for that prefix.

### Choosing notes

| Code | Meaning | What to do |
| --- | --- | --- |
| `DECK_LINK_MISSING` | A link of the deck note leads to no note. Detail: the link. | Fix the link or create the note. |
| `DECK_LINK_NOT_A_NOTE` | A link leads to a folder or an image. | Link to a note. |
| `DECK_LINK_AMBIGUOUS` | Several notes have the linked name; the detail names the one used. | Write the folder into the link: `[[Skills/Parry]]`. |
| `CARD_KIND_UNKNOWN` | No kind rule covers the note's folder; no card. | Add a kind rule, or leave the note out. |
| `NOTE_UNREADABLE` | The note could not be read; no card. Detail: the reason. | Check that the note still exists. |

### Reading a note

| Code | Meaning |
| --- | --- |
| `<KIND>_PROPERTIES_INVALID` | The properties at the top are not valid YAML; the card is made from the text alone. |
| `SKILL_VALUE_NOT_TEXT` | A details-row property holds a list or a map; it is left out. Detail: the property. |
| `<KIND>_IMAGE_OMITTED` | A picture or embed is left out. Detail: its target. |
| `<KIND>_BLOCK_UNSUPPORTED` | A table, HTML or code block is shown as plain lines. Detail: `table`, `html` or `code`. |
| `SKILL_EMPTY`, `SPELL_EMPTY` | The note has nothing but its title. |
| `CREATURE_SECTION_MISSING` | The Behaviour or Actions section is missing. Detail: the heading as set. |

### Fitting the card

| Code | Meaning |
| --- | --- |
| `<KIND>_TEXT_OVERFLOW` | The text does not fit even at the smallest size; the card is cut. Detail: the size. See [Text size](skill-and-spell-cards.md#text-size). |
| `CREATURE_PART_DROPPED` | A creature card gave up its Behaviour section (detail `Instincts`) or its Skills line (`Skills`) to fit. See [Creature cards](creature-cards.md#when-the-card-is-full). |
| `<KIND>_FIT_UNKNOWN` | The compiler did not report whether the card fits. Please report it as a bug, with **Copy debug info**. |
| `<KIND>_TITLE_WRAPPED` | With [equal title bars](equal-title-bars.md), titles wrap even at the smallest title size. Detail: `1 of 4 titles wrap at 7 pt`. |
| `<KIND>_GLYPH_MISSING` | Characters no font has; they stay blank. Detail: up to ten characters with their code points. See [Characters no font has](skill-and-spell-cards.md#characters-no-font-has). |
| `GLYPH_CHECK_UNAVAILABLE` | The character check could not run; the cards are made without it. |

### Colours and icons

| Code | Meaning |
| --- | --- |
| `SKILL_BRANCH_UNKNOWN`, `SPELL_BRANCH_UNKNOWN` | None of the note's tags has a row in the scheme; plain header. Detail: the note's tags. |
| `SCHEME_NOTE_UNREADABLE` | The scheme note is missing or cannot be read. |
| `SCHEME_UNSUPPORTED` | `schemeVersion` or `iconSet` has a value the plugin does not know, or the properties are not valid YAML. |
| `SCHEME_TABLE_MISSING` | No table with `Tag`, `Colour` and `Icon`. |
| `SCHEME_ROW_INVALID` | A row of the scheme is not valid. Detail: the line and the reason. |

See [Colours and icons](colours-and-icons.md#problems-with-the-scheme).

### Creature cards

| Code | Meaning |
| --- | --- |
| `CREATURE_API_UNAVAILABLE` | Obsidian2Typst 0.15.1 or newer is not installed and enabled; no creature cards in this run. |
| `CREATURE_STATBLOCK_REFUSED` | Obsidian2Typst gave no statblock (no active preset with a statblock setup, or no stats and no attacks); the card is made without it. |
| `CREATURE_ICON_CONFLICT` | Two statblocks bring different icon files under one name; the later card is made without its statblock, so a wrong icon is never drawn. Please report it as a bug, with **Copy debug info**. |
| `CREATURE_CREDIT_OMITTED` | The margin under the cards is too low (under 3 mm) for the credit line. Detail: its height. |
| Obsidian2Typst's own codes | Warnings about the statblock data, such as `STAT_SUM_MISMATCH`, `TAG_UNMAPPED`, `HTML_UNSUPPORTED` or `STATBLOCK_ICON_MISSING`, passed on unchanged. See Obsidian2Typst's manual. |

## When a run is refused

Some problems stop a run before it starts, because no PDF could be right. They
are notices, not warnings, and nothing is written:

- no output folder, one that is refused, or a path that is a file;
- no kind rule;
- a setting outside its range, or a sheet on which no card fits.

The notice names the problem and the section of the settings tab to fix it in,
for example:

```text
Cannot make cards: …
See Settings → Output (file: …/data.json)
```

The status line at the top of the settings tab lists the same problems.
