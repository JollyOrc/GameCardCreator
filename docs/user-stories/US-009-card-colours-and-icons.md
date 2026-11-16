# US-009 — Colour-coded headers and icons on skill and spell cards

**Status:** Ready 2026-11-13 (G0 and G1 done; all decisions D1 to D14 answered by the owner and the five
points under "Please read" confirmed by "go"); tests written (G2), red by design; tickets #28 to #34 (G3).
**Introduced:** 0.3.0 (planned)

**As** a game master **I want** the header of a skill or spell card to carry the colour and the icon
of the branch or school it belongs to, **so that** I can sort a handful of cards on the table by
looking at their top edge.

Reader of the output, engine and font: as US-002. The colours and icons are the author's own scheme and
it is kept **in a note of the vault, not in this plugin's settings** (D6), so that other tools can use
the same scheme later (D14); this story makes the plugin read that note (AC-1) and print any scheme the
note holds. The author's own scheme is the content of that note (SCAR-035). All examples below use
invented names and colours.

## What the card looks like today and what changes

Today (US-002, US-003): inside the frame, 4 mm padding; a skill card shows its tags (small, bold), the
title (1.3 em, bold), the details row (skills only), a rule, then the note's text; a spell card shows
the tags, the title, a rule and the text. **New:** the header (tags, title, details row) sits on a
coloured band that runs from the card's top edge across its whole width; with several mapped branches the
band is a gradient from the first branch's colour to the last; the branches' icons stand on the right of
the band.

## Measured before the story (2026-11-13)

- **Room.** On a vault of 173 skill and spell notes every card fits at 7 pt today, and still fits at 7 pt
  with the card 10 mm lower (none below 7 pt, none cut): a header band of up to 10 mm costs no text size
  on that vault. (A fuller note would shrink earlier; the fit rules of US-002 AC-5 are unchanged.)
- **Icon set.** RPG Awesome (<https://nagoshiashumari.github.io/Rpg-Awesome/>), 496 icon names in one
  TrueType font of 149 kB, family `rpg-awesome`, drawn by Typst as text (`text(font: ..)` with the glyph's
  code point). Licences from its README: font SIL OFL 1.1, CSS MIT, documentation CC BY 3.0; the glyph
  designs are from Game-icons.net (CC BY 3.0; the README names the source but not the licence: to confirm
  at G2, AC-12).
- **Look.** A mock with the real font (Typst CLI 0.14.2): a band to the card edge, a two- and a
  three-colour gradient, one to three icons, a title that wraps beside three icons. The first draft
  listed the first branch's icon at the right edge, which put it on the wrong end of the gradient: AC-5 now
  runs the icons in the order of the colours. Black text on the 23 pastel colours of the author's scheme:
  contrast at least 11 : 1; the middle of a gradient between far-apart colours is greyish (D3a: accepted).

## The scheme note (AC-1) — the convention other tools can share

A Markdown note of the vault. **Front matter (all optional):** `schemeVersion: 1` (the format; any other
value is refused, AC-7), `iconSet: rpg-awesome` (the only set this plugin draws; absent means the same),
`credit: <text>` (the credit line for the icons, AC-10). **Body:** prose is allowed anywhere; the **first
table at the top level of the note** (not in a quote or a list item) whose header row has the cells `Tag`,
`Colour` and `Icon` (any case, any order, any number of spaces) is the scheme; each body row of it is one
branch. A column named `Label` or `Group` is allowed and any other column too: this plugin ignores them,
they are for other readers (a name for a legend, a group for a chapter). Cells: `Tag` the note tag the row
is for (with or without `#`, with or without backticks); `Colour` `#rrggbb` (backticks allowed); `Icon` an
RPG Awesome name such as `sword` (backticks allowed). The colour is the one the vault's hexmaps use (their
`fill`), so a later tool can write the maps' fills from the same table.

Invented example `Layouting/Branch Scheme.md`:

```
---
schemeVersion: 1
iconSet: rpg-awesome
credit: "Icons made by Lorc, Delapouite, sbed and other authors. Available on https://game-icons.net (CC BY 3.0), via RPG Awesome"
---
| Tag | Label | Colour | Icon |
|---|---|---|---|
| Swordplay | Sword play | #F4D6B0 | sword |
| Stonework | Stone work | #CBD5E8 | anvil |
| Pyromancy | Pyromancy | #FFB4A2 | fire |
| Hexes | Hexes | #E4F0A8 | skull |
```

## Settings (defaults)

`schemeNote`: the vault path of the scheme note, `Layouting/Branch Scheme.md` style, with `/`; default
**empty**: the feature is off and a card is exactly what it was before this story (AC-1, tested by comparing
the Typst source). `bleed`: millimetres the band reaches beyond the frame (AC-15), default 0, range 0 to 3,
not above the sheet's margin and, with cut marks, at most 1. No other setting: the colours, icons and the credit are the note's.

## The example used below (invented)

The scheme note above. `Parry.md` (skill): tags `CombatSkill`, `Swordplay`; `time: reaction`. `Ember
Spark.md` (spell): tags `Pyromancy`. `Scorch Hex.md` (spell): tags `Pyromancy`, `Hexes`. `Plain.md`
(skill): tags `Misc`.

## Acceptance criteria

- **AC-1 (the scheme note).** With `schemeNote` set, each run that has a skill or spell card reads that note
  from the vault (as the notes themselves are read: through the vault, never from the cache, never kept
  between runs, SCAR-016) and takes the mapping from it as under "The scheme note". The path is a vault path: it is refused (setting check, one message; the screen trims what is typed, so spaces only become empty and switch the feature off) when it is only spaces in the settings file, starts with `/`, contains a
  backslash or a path part `..` (`a..b.md` is fine), or does not end in `.md`. The header is removed once before anything is read (SCAR-034). Tags compare
  without case, a leading `#`, backticks and surrounding spaces (`#swordplay ` is `Swordplay`). With
  `schemeNote` empty the source of every card is the same text as before. The example note gives four
  branches in the order of its rows.
- **AC-2 (what counts as a branch).** The branches of a note are the rows whose tag the note has, **in the
  order of the note's tags**; a tag without a row is ignored for colour (D4). `Parry.md` has the branch
  `Swordplay` (`CombatSkill` has no row); `Scorch Hex.md` has `Pyromancy`, then `Hexes`.
- **AC-3 (the band).** The header of a card with one branch sits on a band filled with its colour. The band
  runs from the card's top edge to its left and right edges (the full card width, 62 mm at the default size)
  and is as high as 4 mm (the top padding) plus the header plus 2 mm; it ends 2 mm under the header's last
  line. The header's text keeps its place (4 mm from the left edge, as today) and stays black on every
  colour (D8); the tags line is kept (D2). The card's frame is drawn over the band, not under it. `Parry.md`:
  a band `#F4D6B0` from the top edge, its tags line, its title and its details row on it.
- **AC-4 (several branches).** With several branches the band is a horizontal linear gradient across the
  full band width, from the first branch's colour at the left edge to the last branch's colour at the right
  edge, in the order of AC-2, with equal steps between the colours (three branches: the second colour in the
  middle); the colours are mixed in Typst's default colour space (D3a). With one branch the band is one flat
  colour. `Scorch Hex.md`: a gradient from `#FFB4A2` to `#E4F0A8`.
- **AC-5 (the icons).** The icon of every branch is shown, at 18 pt in black (D7), on the right of the
  band, side by side in the order of the note's tags **from left to right, so that the last branch's icon is
  at the right edge** and every icon lies on the end of the gradient that is its own colour. The title and
  the tags line wrap before the icons (the room of the icons is kept free, 20 mm for three) and the band
  grows with the wrapped lines (AC-3). The glyph comes from the bundled font through a table from icon name
  to code point; no icon name or colour from the note is written into the Typst source unchecked (AC-7).
  `Ember Spark.md`: the `fire` glyph at the right end of its band; `Scorch Hex.md`: `fire` then `skull`,
  `skull` at the right edge.
- **AC-6 (no branch).** A note with no branch gets a plain header (no band, no icon) as before, and, **when
  the scheme has at least one valid row**, one warning of the run for that note: `SKILL_BRANCH_UNKNOWN` or
  `SPELL_BRANCH_UNKNOWN` (detail: the note's tags, comma separated, or empty when it has none) (D5). With no
  scheme (AC-1) or no valid row there is no such warning. `Plain.md` gives one warning with the detail `Misc`.
- **AC-7 (checks and failures; the run goes on).** Problems of the scheme note are warnings of the run, with
  the note's path, never a stop (rule 8): `SCHEME_NOTE_UNREADABLE` (detail: the reason; the note is missing
  or cannot be read), `SCHEME_UNSUPPORTED` (detail `schemeVersion: 2` or `iconSet: other`, as written; for a front matter that is not valid YAML the detail `front matter: yaml` and the table is still read),
  `SCHEME_TABLE_MISSING` (no table with the three columns), `SCHEME_ROW_INVALID` (detail `line <n>:
  <reason>`, with the line of the row in the note: an empty tag, a colour that is not `#` and six
  hexadecimal digits in either case, an icon name not in the list, or a tag already used by an earlier row:
  the earlier row stays). In each case the cards are made with plain headers for what has no valid row, and
  the plugin never changes the note. The colour is written into the Typst source in its normal (lower case)
  form; only a name from the list becomes a glyph (SCAR-033, rule 6).
- **AC-8 (the text room).** The band takes room from the text: the text of the card starts 2 mm under the
  band instead of under the 4 mm padding and ends where it did (bottom padding unchanged); the sizes tried,
  the drop and the cut rules of US-002 AC-5 are unchanged. On a vault note set where every card fitted at
  7 pt before (the 173 notes measured above), every card still fits at 7 pt (re-measured at the code
  ticket).
- **AC-9 (mixed deck, creature cards).** Skill, spell and creature cards on one sheet, in the given order:
  only skill and spell cards get a band; the creature card is unchanged (D11). Every run of every card lies
  inside its text area to 0.1 mm (the header's text inside its 4 mm padding); the band lies inside its card's
  frame plus the bleed (AC-15) to 0.1 mm.
- **AC-10 (credit).** When a card on a sheet shows an icon, the scheme note's `credit` text (absent: `Icons made by Lorc,
  Delapouite, sbed and other authors. Available on https://game-icons.net (CC BY 3.0), via RPG Awesome`; empty: no line) is printed once at the foot of that sheet as
  the creature credit of US-004 AC-9 is (5 pt, centred, at most two lines, in the bottom band, covering no
  card); when the same sheet also has a creature credit, both texts are printed together, the creature
  credit first and a full stop added after it when it has none, then a space (D10). With a bottom band too low for it, the warning of US-004 AC-9
  (credit omitted) is given.
- **AC-11 (settings screen).** The page `Note properties` gets a text field `Scheme note` (a vault path,
  AC-1; Enter commits, an invalid value is refused under the field, like the other text fields of US-007)
  and the page `Page and text size` a number field `Bleed` (mm, AC-15). The status line says
  `Scheme note: not found` when the path is set and the note is not in the vault (read when the page is
  drawn and at each change, SCAR-016). The settings are saved as the others are (US-007 AC-4).
- **AC-12 (the font and its licence).** The font file is inside `main.js` like Libertinus Serif (US-008
  AC-13: decoded in the worker), is added to the compiler's fonts, and its licence text and the CC BY 3.0
  notice of the glyph designs are in `THIRD_PARTY_NOTICES.md` and in the release files (SCAR-036). The
  glyph designs' licence is confirmed from Game-icons.net's own pages before the code ticket. A compile
  makes no network request.
- **AC-13 (deterministic).** As US-002 AC-11: the same notes and settings give the same PDF bytes in two
  fresh processes.
- **AC-14 (look, SCAR-025).** A sheet with one card per branch of a 23-row scheme at printed size and a
  header at 4x; and the author's own scheme on the author's vault (manual check, in Obsidian). The text
  contrast over the middle of every gradient of the author's scheme is measured.
- **AC-15 (bleed, D1a).** The band extends beyond the card's frame by `bleed` mm on its top, left and right
  sides when no card is on that side, and by `min(bleed, gap / 2)` when a card is there (so two bands never
  overlap; with gap 0 and a neighbour, nothing); the bottom of the band is inside the card and is not
  extended; the frame stays where it is; with bleed 0 nothing is drawn outside the frame (AC-3). The bleed
  is refused when it is outside 0 to 3 mm, above the sheet's margin, or, **while the cut marks are on,
  above 1 mm** (the cut marks start 1 mm from the block of cards, so a larger bleed would cover them; read
  from the layout's own constant, not measured). Examples (bleed 1): three cards in the top row, gap 0:
  the left card's band starts 1 mm above its top edge and 1 mm left of its left edge, ends at its right
  edge; the middle card's band starts 1 mm above its top edge and has no bleed left or right; the right
  card's band reaches 1 mm beyond its right edge; a card in the second row has no bleed on top. Gap 2: 1 mm
  on every side (half the gap is 1 mm). Gap 1: 0.5 mm on a side with a neighbour.

## Decisions (all answered by the owner, 2026-11-13)

- **D1:** the band runs to the card's frame on top, left and right. **D1a:** a `bleed` setting in mm (AC-15).
- **D2:** the tags line is kept. **D3:** a gradient and all icons. **D3a:** the grey middle is accepted.
- **D4:** only tags with a row are branches; a note may have several, a skill too.
- **D5:** a plain header (read as: with the warning when a scheme is set, AC-6: confirmed).
- **D6:** the scheme is kept in a **note of the vault**, read at each run (AC-1).
- **D7:** icon on the right, 18 pt, black. **D8:** black text on every colour.
- **D9:** two branches with the same colour are accepted as they are.
- **D10:** a credit line at the foot of each sheet that shows an icon, merged with the creature credit; its
  text is the note's (AC-10). **D11:** creature cards are not touched. **D12:** colour only, no switch.
- **D13:** the author's 23 icon choices stand for now (they are rows of the author's note, not the plugin's).
- **D14:** scope is skill and spell cards only, **but every decision keeps the scheme reusable later**:
  one note as the single home of tag, colour, icon, label and credit, a documented format, extra columns
  allowed, nothing in the plugin that only this plugin can read.

## Points confirmed by the owner ("go", 2026-11-13)

1. **D5:** I read "plain header" as the first proposal (plain header **and** a warning when a scheme is
   set). If you want no warning, AC-6 loses its warning.
2. **The note's format** (above): a pipe table with `Tag`, `Colour`, `Icon` (and free columns such as
   `Label`, `Group`), front matter `schemeVersion`, `iconSet`, `credit`. This is the convention other tools
   would read.
3. **Failures never stop a run** (AC-7): a missing note or a bad row gives a warning and plain headers.
4. **Bleed** (AC-15): default 0, range 0 to 3 mm; on the outer edges the full bleed, between cards at most
   half the gap.
5. **Where the real note lives** is the author's choice (the control project proposes
   `Layouting/Branch Scheme.md`); the plugin takes any vault path.

## Not covered

Pictures on cards (US-006), the creature card's look, other tools reading the scheme (each needs its own
story, pointing at the format above, SCAR-040), an icon set other than RPG Awesome, a colour per note
(a property) instead of per tag, writing the hexmaps' fills from the note.

**Amendment 2026-11-16 (owner's decision):** the default credit text names the authors, as Game-icons.net asks ("Icons made by {author}. Available on https://game-icons.net"): `Icons made by Lorc, Delapouite, sbed and other authors. Available on https://game-icons.net (CC BY 3.0), via RPG Awesome`. The authors were read from the Game-icons.net repository for the icons of the author's scheme whose names it has (15 of 23); the others are to be checked by the author, who can set their own `credit` in the scheme note.
