# The sheet

[Back to the manual](manual.md)

The cards are printed on A4 sheets (210 × 297 mm), upright, as many as fit,
with cut marks around them. All sheet settings are in
**Settings → Page and text size → Sheet**.

## Contents

- [Card size and margin](#card-size-and-margin)
- [How many cards fit](#how-many-cards-fit)
- [Gap](#gap)
- [Order on the sheet](#order-on-the-sheet)
- [Cut marks](#cut-marks)
- [The credit line](#the-credit-line)
- [Printing](#printing)

## Card size and margin

| Setting | Default | Allowed |
| --- | --- | --- |
| Card width (mm) | 62 | 30 to 200 |
| Card height (mm) | 88 | 30 to 200 |
| Margin (mm) | 10 | 0 to 50 |
| Gap (mm) | 0 | 0 to 10 |
| Cut marks | on | on, off |

The **margin** is kept free on all four sides of the sheet; most printers
cannot print to the edge. The cards are placed inside it, as a block centred
on the sheet. The sheet is always A4.

The text of a card keeps 4 mm from the card's edge on every side.

## How many cards fit

The plugin fits as many columns and rows as the room inside the margin holds.
Cards are never turned sideways to fit more.

| Card | Margin | Cards per sheet |
| --- | --- | --- |
| 62 × 88 mm | 0 or 10 mm | 9 (3 × 3) |
| 62 × 88 mm | 15 mm | 6 (2 × 3) |
| 62 × 88 mm | 20 mm | 4 (2 × 2) |
| 62 × 88 mm | 50 mm | 2 (1 × 2) |
| 30 × 30 mm | 10 mm | 54 (6 × 9) |
| 95 × 140 mm | 10 mm | 2 (2 × 1) |

The line under the sheet settings shows the result as you type, for example
`9 cards per A4 page (3 × 3)`. When not even one card fits (a 200 × 200 mm
card with a 10 mm margin), the line says so, the status line says
`Not ready:`, and a run is refused.

## Gap

With a gap, the cards stand that many millimetres apart. With a gap of 0 (the
default), the cards touch and one cut separates two cards. With the default
card and margin, a gap of 2 mm still gives 9 cards, a gap of 5 mm gives 6.

## Order on the sheet

The cards fill each sheet in reading order: left to right, then top to bottom,
in the order of the run (see [Choosing notes](choosing-notes.md)). Skill,
spell and creature cards can be mixed on one sheet. Ten cards at the defaults
give two sheets, nine and one; slots after the last card stay empty.

## Cut marks

With **Cut marks** on, short lines (3 mm long, starting 1 mm outside the block
of cards) in the margin mark where every card edge lies: above and below the
block for each vertical edge, left and right of it for each horizontal edge.
They never touch a card.

When the margin on one side is too narrow for its marks (they would come
closer than 3 mm to the sheet's edge), that side gets no marks; the other
sides keep theirs.

With a [bleed](colours-and-icons.md#bleed) and cut marks on, the bleed can be
at most 1 mm, so the coloured bands do not cover the marks.

## The credit line

When a sheet shows scheme icons or a creature card, a small credit line for
the icons is printed, centred, in the margin under the last row of cards. It
needs a margin band of at least 3 mm below the cards. If there is less room
(for example with cards nearly as tall as the sheet and a 1 mm margin), the
line is left out and you get `CREATURE_CREDIT_OMITTED`. See
[Colours and icons](colours-and-icons.md#the-icon-credit) and
[Creature cards](creature-cards.md#the-credit-line).

## Printing

Print the PDF at **100 %** ("actual size"), not "fit to page", or the cards
come out smaller than set. The cards have fronts only; there are no card
backs.

The same notes and settings always give exactly the same PDF, byte for byte,
so a reprint matches the cards you already have.
