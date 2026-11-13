# Game Card Creator

An [Obsidian](https://obsidian.md) plugin (desktop only) that turns notes into print-ready game
cards and writes them as an A4 PDF: cards of 62 mm x 88 mm, as many per page as fit, with cut
marks. The PDF is made by [Typst](https://typst.app), which is inside the plugin: nothing to
install and nothing is downloaded.

**Status:** version 0.2.0 makes **skill**, **spell** and **creature** cards. The creature card needs
the plugin [Obsidian2Typst](https://github.com/JollyOrc/Obsidian2Typst) 0.15.1 or newer.
Tested on Obsidian 1.15.0 on macOS only (see the release notes).

## What it does

- A **skill card** shows the tags of the note, its title (the note's file name), a details row
  (`Time`, `Type`, `Requires`, from the note's properties) and the text of the note. A **spell
  card** shows the tags, the title and the text.
- A **creature card** shows the statblock exactly as Obsidian2Typst draws it for a book (drawn by
  that plugin's own code, with its preset's icons and fonts), then the creature's **Behaviour**,
  **Actions** and **Signs** sections (the headings are settings). If it does not fit, the Signs
  section is given up first, then Behaviour, then the Skills line of the statblock, and only then
  does the text shrink; what is given up is reported. The icons' credit line is printed once at
  the foot of each sheet that has a creature card.
- Pictures are left out (with a warning). The text shrinks from 7 pt towards 5.5 pt to fit the card
  and is cut, with a warning, when it still does not.
- You choose the cards in two ways:
  - a **deck note**: a note with a list of links to the cards' notes; the cards come in the order
    of the links. Run the command **Create cards from this deck note**, or right-click the note and
    choose **Create cards from this deck note**;
  - the **file explorer**: right-click a note, several notes or a folder and choose **Create
    cards**.
- The result is `<name> cards.pdf` and `<name> cards warnings.md` in the output folder. If they
  already exist the plugin asks before it replaces them. The plugin never changes your notes.

## Set up

1. Copy `main.js`, `manifest.json` and `styles.css` from the release into
   `<your vault>/.obsidian/plugins/game-card-creator/` and enable **Game Card Creator** in
   Settings, Community plugins.
2. Open Settings, **Game Card Creator**:
   - **Output folder**: type an absolute path or choose it with the system's folder dialog (a
     folder inside the vault is allowed);
   - **Which note is which card**: add a rule for each folder (for example your skills folder is
     `skill`, your spells folder `spell`, your creatures folder `creature`); a note takes the kind of the longest matching folder;
   - **Note properties**: the names of the properties the plugin reads (tags, timing, kind,
     requires), the labels shown on the card and the three section headings of creature notes; **Page and text size**: the card size, margin,
     gap, cut marks and the text sizes.
3. The status line at the top says `Ready: ...` or what is still missing. Settings are saved as you
   change them; a value that is not valid is refused with the reason under the field.

## Limits

Creature cards need Obsidian2Typst 0.15.1 or newer, installed and enabled; no pictures on cards; no warning yet when a text has a character the font
lacks; desktop only; Windows, Linux and mobile are not tested. See `releases/v0.2.0.md`.

## Development

```bash
npm install
npm run typecheck && npm run build && npm run lint && npm test && npm run test:integration
npm run release:build   # a clean clone of HEAD and the full gate there; never tags or publishes
```

The process (SCAR review, user story, tests, tickets, code) is in `CLAUDE.md`; the stories are in
`docs/user-stories/`.

## Licence

MIT, see `LICENSE`. The bundled packages and the font are listed in `THIRD_PARTY_NOTICES.md`.
