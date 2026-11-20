# Equal title bars

[Back to the manual](manual.md)

Normally every card gets the largest text size its own text allows, and its
header grows with its title. On a sheet that makes the titles differ in size
and the headers in height. **Equal title bars** gives all cards of one kind in
a run the same title size and the same header height, so the cards line up
when they lie side by side.

The switch is per kind, in **Settings → Titles**: **Skill titles**, **Spell
titles** and **Creature titles**. All are off by default. While a switch is
on, its gear opens two sizes:

| Setting | Skill and spell | Creature | Allowed |
| --- | --- | --- | --- |
| Title size (pt) | 9.1 | 11.5 | 6 to 20 |
| Smallest title size (pt) | 7 | 7 | 4 to 20, not above the title size |

"All cards of a kind" means all cards of that kind in one run, on every sheet
of it. Cards of other kinds are not affected.

## Contents

- [Skill and spell cards](#skill-and-spell-cards)
- [Creature cards](#creature-cards)
- [When a title is too long](#when-a-title-is-too-long)

## Skill and spell cards

**One title size.** The plugin tries the **Title size**, then smaller sizes by
the **Size step** (from **Page and text size**), down to the **Smallest title
size**. It uses the largest size at which **every** title of the kind fits on
one line. One long title therefore makes all titles of the kind smaller.

With the defaults, the titles `Parry`, `Feint` and
`Riverbank Ambush of the Reed Wardens` come out at 8.1 pt; `Parry` and
`Feint` alone stay at 9.1 pt. Next to icons there is less room, so the same
three titles on cards with a branch icon come out at 7 pt.

**One header height.** The whole header (tags, title, details row) is set from
the title size, whatever the size of the card's text. Every header of the
kind is then given the height of the tallest one, whether it is tall because
of a wrapping tags line, a long details row, or an icon. The lines stay at the
top; the room under a shorter header stays empty.

As a result, on every card of the kind:

- the coloured bands end at the same height;
- on cards without a band, the rule stands at that same height;
- the text starts at the same height.

The text under the header is still fitted per card (see
[Text size](skill-and-spell-cards.md#text-size)), in the room left under the
header. A card with much text gets smaller text, but keeps the common title.

## Creature cards

On a creature card the title is the name in the statblock's band. With the
switch on, every creature's name in the run gets the same size, chosen as
above: the largest size from **Title size** down to **Smallest title size**
at which every name fits on one line in its band. The bands then have the
same height on every card. The rest of the statblock still scales with the
card's text size.

A creature card without a statblock (see
[Creature cards](creature-cards.md#when-there-is-no-statblock)) sets its own
bold title at the same size, and that title counts when the size is chosen.

The sections under the statblock do not start at a common height, because the
statblocks differ in height.

## When a title is too long

When a title (or creature name) does not fit on one line even at the
**Smallest title size**, all titles of the kind are set at the smallest size,
that title wraps onto two lines, and you get **one** warning for the kind,
naming the note with the widest title:

```text
- SKILL_TITLE_WRAPPED — Skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md — 1 of 4 titles wrap at 7 pt
```

On skill and spell cards, every header of the kind then takes the height of
the wrapped one. On creature cards only the wrapped band is taller; the other
bands keep their height.

Shrinking a title to fit gives no warning. To avoid the wrap, shorten the
title, or lower the **Smallest title size**.
