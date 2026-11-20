# Game Card Creator

An [Obsidian](https://obsidian.md) plugin (desktop only) that turns notes into print-ready game
cards and writes them as an A4 PDF: cards of 62 mm x 88 mm, as many per page as fit, with cut
marks. The PDF is made by [Typst](https://typst.app), which is inside the plugin: nothing to
install and nothing is downloaded.

**Status:** version 0.7.0 makes **skill**, **spell** and **creature** cards, chosen in a run dialog,
from a deck note or from the file explorer. The creature card needs the plugin
[Obsidian2Typst](https://github.com/JollyOrc/Obsidian2Typst) 0.15.1 or newer. Tested on Obsidian
1.15.0 on macOS only (see the release notes).

## Manual

How to install and use the plugin: [`manual/manual.md`](manual/manual.md).

## What it does

- A **skill card** shows the tags of the note, its title (the note's file name), a details row
  (`Time`, `Type`, `Requires`, from the note's properties) and the text of the note. A **spell
  card** shows the tags, the title and the text.
- A **creature card** shows the statblock exactly as Obsidian2Typst draws it for a book (with its
  preset's icons and fonts), then the creature's **Behaviour**, **Actions** and **Signs** sections
  (the headings are settings). If it does not fit, the Signs section is given up first, then
  Behaviour, then the Skills line of the statblock, and only then does the text shrink; what is
  given up is reported.
- The text shrinks from 7 pt towards 5.5 pt to fit the card and is cut, with a warning, when it
  still does not. Pictures are left out (with a warning).
- **Colours and icons (optional).** A **scheme note** in your vault, a table of `Tag`, `Colour` and
  `Icon` (from [RPG Awesome](https://nagoshiashumari.github.io/Rpg-Awesome/)), puts the header of a
  skill or spell card on a band in the colour of its branch, with the branch's icon; several
  branches make a gradient. Optional bleed for the band. The icons' credit is printed at the foot
  of each sheet that shows one.
- **Equal title bars (optional, per kind).** All cards of a kind in a run get one title size and
  one header height, so the cards line up; for creatures, one name size in the statblock band.
- **A warning for a character no font draws**, one per note, listing the characters with their
  code points (`漢 U+6F22, 😀 U+1F600`).
- **Choosing the cards:**
  - the **run dialog** (ribbon icon or command **Create cards…**): the output folder and a tree of
    the vault's notes with their card kinds; the selection can be saved and run again with
    **Create cards from the saved selection**;
  - a **deck note**: a note with a list of links to the cards' notes, run with **Create cards from
    this deck note** (command or right-click);
  - the **file explorer**: right-click notes or folders and choose **Create cards**.
- The result is `<name> cards.pdf` and `<name> cards warnings.md` in the output folder. If they
  already exist the plugin asks before it replaces them (Cancel is the default). The plugin never
  changes your notes.

## Set up

1. Copy `main.js`, `manifest.json` and `styles.css` from the
   [release](https://github.com/JollyOrc/GameCardCreator/releases) into
   `<your vault>/.obsidian/plugins/game-card-creator/` and enable **Game Card Creator** in
   Settings, Community plugins.
2. Open Settings, **Game Card Creator**. The settings are in collapsible sections:
   - **Output**: the output folder, an absolute path, typed or chosen with **Choose folder…** (a
     folder inside the vault is allowed);
   - **Which note is which card**: a rule for each folder (for example your skills folder is
     `skill`, your spells folder `spell`, your creatures folder `creature`); a note takes the kind
     of the longest matching folder;
   - **Note properties**: the property names the plugin reads, the labels shown on the card, the
     three section headings of creature notes and the **Scheme note** (optional);
   - **Page and text size**: card size, margin, gap, cut marks, bleed and the text sizes;
   - **Titles**: the **Equal title bars** switch per kind, with its sizes behind a gear.
3. The status line at the top says `Ready: ...` or what is still missing. Settings are saved as you
   change them; a value that is not valid is refused with the reason under the field.

The manual describes every setting, card and warning.

## Limits

Creature cards need Obsidian2Typst 0.15.1 or newer, installed and enabled; no pictures on cards;
no card backs; desktop only; Windows, Linux and mobile are not tested. See `releases/v0.7.0.md`.

## Development

```bash
npm install
npm run typecheck && npm run build && npm run lint && npm test && npm run test:integration
npm run release:build   # a clean clone of HEAD and the full gate there; never tags or publishes
```

The process (SCAR review, user story, tests, tickets, code) is in `CLAUDE.md`; the stories are in
`docs/user-stories/`.

## Licence

MIT, see `LICENSE`. The bundled packages and the fonts are listed in `THIRD_PARTY_NOTICES.md`.
