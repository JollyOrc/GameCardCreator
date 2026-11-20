# Colours and icons

[Back to the manual](manual.md)

Skill and spell cards can carry the colour and icon of the branch or school
they belong to, so you can sort a hand of cards by their top edge. The colours
and icons are kept in a **scheme note** in your vault, not in the plugin's
settings, so other tools can read the same table.

Creature cards are not coloured.

## Contents

- [Switching it on](#switching-it-on)
- [The scheme note](#the-scheme-note)
- [Which branch a note has](#which-branch-a-note-has)
- [The band and the icons](#the-band-and-the-icons)
- [The icon credit](#the-icon-credit)
- [Bleed](#bleed)
- [Problems with the scheme](#problems-with-the-scheme)

## Switching it on

Write a scheme note (below), then enter its vault path in
**Settings → Note properties → Scheme note**, for example
`Tables/Branch Scheme.md`. A line under the field says
`Scheme note: not found` if the path is wrong.

The path is a vault path with `/`, ending in `.md`. It may not start with `/`,
contain a backslash, or contain a `..` folder. Empty the field to switch the
colours off; the cards then look exactly as without a scheme.

The note is read fresh at every run, so a change to it applies to the next run.

## The scheme note

An ordinary Markdown note with a table. Example, `Tables/Branch Scheme.md`:

```markdown
---
schemeVersion: 1
iconSet: rpg-awesome
credit: "Icons made by Lorc, Delapouite, sbed and other authors. Available on https://game-icons.net (CC BY 3.0), via RPG Awesome"
---
The colours of the branches.

| Tag | Label | Colour | Icon |
|---|---|---|---|
| Swordplay | Sword play | #F4D6B0 | sword |
| Stonework | Stone work | #CBD5E8 | anvil |
| Pyromancy | Pyromancy | #FFB4A2 | fire |
| Hexes | Hexes | #E4F0A8 | skull |
```

**The table.** The first table of the note (not inside a quote or a list)
whose header row has the columns `Tag`, `Colour` and `Icon` is the scheme.
Column order and case do not matter. Each row is one branch:

| Column | Content |
| --- | --- |
| `Tag` | The note tag of the branch, with or without `#` or backticks. Compared without case. |
| `Colour` | `#rrggbb`, for example `#F4D6B0`. Backticks are allowed. |
| `Icon` | The name of an icon of [RPG Awesome](https://nagoshiashumari.github.io/Rpg-Awesome/), for example `sword`. Backticks are allowed. |

Other columns, such as `Label` or `Group`, are allowed and ignored by this
plugin. Text before and after the table is allowed.

**The properties** are all optional:

| Property | Meaning |
| --- | --- |
| `schemeVersion` | `1`. Any other value is refused. |
| `iconSet` | `rpg-awesome`, the only set the plugin draws. Absent means the same. |
| `credit` | The credit line for the icons (see [below](#the-icon-credit)). |

## Which branch a note has

A note's branches are the rows whose tag the note has, **in the order of the
note's own tags**. Tags without a row are ignored for colour.

| Note | Tags | Branches |
| --- | --- | --- |
| `Parry.md` (skill) | `CombatSkill`, `Swordplay` | Swordplay |
| `Ember Spark.md` (spell) | `Pyromancy` | Pyromancy |
| `Scorch Hex.md` (spell) | `Pyromancy`, `Hexes` | Pyromancy, then Hexes |
| `Plain.md` (skill) | `Misc` | none |

A note with no branch gets a plain header (no band, no icon) and the warning
`SKILL_BRANCH_UNKNOWN` or `SPELL_BRANCH_UNKNOWN`, which lists its tags, so you
can spot a tag missing from the scheme. Without a scheme note there is no such
warning.

## The band and the icons

The header of the card (tags, title, details row) sits on a band of the
branch's colour. The band runs from the card's top edge across its full width
and ends 2 mm under the header, or at least 1 mm under the lowest icon. The
text of the card starts 2 mm under the band.

- **One branch:** the band is one colour.
- **Several branches:** the band is a gradient from left to right, from the
  first branch's colour to the last one's, in equal steps. `Scorch Hex.md`
  goes from `#FFB4A2` to `#E4F0A8`.
- **Icons:** each branch's icon is drawn in black at 18 pt at the right of the
  band, side by side in the order of the branches, so the last branch's icon
  is at the right edge, above its own colour.
- The title and tags wrap before they reach the icons; the band grows with
  them.
- The text stays black on every colour, so choose light colours.

The band takes a little room from the text. On cards with short texts this
costs nothing; a long text shrinks a little earlier (see
[Text size](skill-and-spell-cards.md#text-size)).

To make the bands of all cards of a kind the same height, see
[Equal title bars](equal-title-bars.md).

## The icon credit

The RPG Awesome icons are drawn from the designs of Game-icons.net, whose
licence (CC BY 3.0) asks for a credit. When a sheet shows an icon, the
scheme note's `credit` text is printed once, small and centred, at the foot
of that sheet.

- Without a `credit` property the plugin prints
  `Icons made by Lorc, Delapouite, sbed and other authors. Available on https://game-icons.net (CC BY 3.0), via RPG Awesome`.
- With `credit: ""` no line is printed.
- If the sheet also has a creature card, the creature credit comes first,
  then this one, on the same line.

## Bleed

A band that ends exactly at the card's edge can show a thin white line when
the cut is not perfect. **Settings → Page and text size → Bleed** lets the
band reach beyond the frame by that many millimetres, on the top, left and
right.

- Allowed: 0 to 3 mm, and not more than the margin.
- While cut marks are on, at most 1 mm, so the band does not cover the cut
  marks.
- Between two cards the band reaches at most half the gap, so neighbouring
  bands never overlap. With the default gap of 0, there is no bleed between
  cards, only on the outer edges of the block.

## Problems with the scheme

A problem with the scheme note never stops the run. The cards are made, with
plain headers where no valid row applies, and the problem is a warning with
the scheme note's path:

| Warning | When |
| --- | --- |
| `SCHEME_NOTE_UNREADABLE` | The note is missing or cannot be read. |
| `SCHEME_UNSUPPORTED` | `schemeVersion` is not 1, `iconSet` is not `rpg-awesome`, or the properties are not valid YAML (`front matter: yaml`; the table is still read). |
| `SCHEME_TABLE_MISSING` | No table has the columns `Tag`, `Colour` and `Icon`. |
| `SCHEME_ROW_INVALID` | A row has an empty tag, a colour that is not `#rrggbb`, an icon name RPG Awesome does not have, or a tag an earlier row already has (the earlier row is kept). The detail gives the line, for example `line 12: …`. |
