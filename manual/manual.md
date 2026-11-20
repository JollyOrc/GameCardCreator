# Game Card Creator manual

Game Card Creator turns notes of your Obsidian vault into print-ready game
cards: **skill**, **spell** and **creature** cards of 62 × 88 mm, laid out on
A4 sheets with cut marks, as one PDF. You keep writing your skills, spells and
creatures as ordinary notes; the plugin reads them and never changes them.

This manual describes version 0.7.0.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Ways to run the plugin](#ways-to-run-the-plugin)
- [What a run produces](#what-a-run-produces)
- [Which note is which card](#which-note-is-which-card)
- [The settings tab](#the-settings-tab)
- [What a card shows](#what-a-card-shows)
- [Guides for advanced topics](#guides-for-advanced-topics)

## Installation

The plugin runs on desktop Obsidian only (version 1.6.6 or later). It brings
its own [Typst](https://typst.app) compiler and fonts, so you do not need to
install Typst, and it works offline.

1.  Download `main.js`, `manifest.json` and `styles.css` from the
    [releases page](https://github.com/JollyOrc/GameCardCreator/releases).
2.  Create the folder `<your vault>/.obsidian/plugins/game-card-creator/` and
    copy the three files into it.
3.  In Obsidian, open **Settings → Community plugins**, reload the list and
    switch **Game Card Creator** on.

Skill and spell cards need nothing else. **Creature cards** need the plugin
[Obsidian2Typst](https://github.com/JollyOrc/Obsidian2Typst) 0.15.1 or newer,
installed and enabled, because it draws the creature's statblock. See
[Creature cards](creature-cards.md).

## Quick start

1.  Open **Settings → Game Card Creator**.
2.  In the section **Output**, type the absolute path of the folder for your
    PDFs, or click **Choose folder…** and pick it in the system dialog.
3.  In the section **Which note is which card**, click **Add rule** for each
    folder of card notes and choose its kind, for example `Skills` → `skill`,
    `Spells` → `spell`, `Creatures` → `creature`.
4.  The status line at the top of the tab now reads
    `Ready: 3 kind rules, output folder /Users/you/Cards`. If it reads
    `Not ready:`, the lines under it say what is missing.
5.  Click the grid icon (**Create cards…**) in the left ribbon. Tick the notes
    you want in the panel beside the dialog, then click **Create cards**.
6.  A notice says `✅ Created 12 cards on 2 pages, 3 warnings. Written to …`.
    The PDF and a warnings file are now in the output folder.

To print one fixed set of cards again and again, keep a
[deck note](choosing-notes.md#deck-notes): a note with a list of links to the
cards' notes.

## Ways to run the plugin

Only one run can go at a time; a second one is refused with the notice
`A run of cards is already in progress`.

### Commands

Open the command palette (`Ctrl/Cmd + P`) and type `Game Card Creator`.

| Command | What it does |
| --- | --- |
| Create cards… | Opens the [run dialog](#the-run-dialog). |
| Create cards from the saved selection | Makes the cards of the selection you saved in the run dialog, at once and without the dialog. With no saved selection it says `Nothing selected yet. Open "Create cards…" and choose notes.` |
| Create cards from this deck note | Makes the cards of the links in the active note, in the order of the links. Offered only when the active file is a Markdown note. |

### The ribbon icon

The grid icon (**Create cards…**) in the left ribbon opens the run dialog.

### The run dialog

The dialog **Create cards** holds, top to bottom:

- **The destination row:** the output folder, **Choose folder…** (where the
  system's folder dialog is available) and the **Create cards** button.
- **A red line** when the folder is refused, with the reason, for example
  `Output folder "relative/path" is not an absolute path`.
- **A grey line** that says what will happen at the destination:
  `Cards cards.pdf will be created.` or
  `Cards cards.pdf exists (from 2026-11-17 14:02) and will be replaced after a question.`
- **More options:** the gear opens the plugin's settings tab.

Beside the dialog, the **Notes** panel lists the Markdown notes of your vault
as a tree with check boxes. Each note shows its card kind as a tag; a note
that no kind rule covers is greyed out (`no card kind`) and cannot be ticked.
**Save selection** keeps the ticked notes for next time and for the command
**Create cards from the saved selection**.

**Create cards** is disabled while the folder is refused or nothing is
ticked. Enter runs it when it is enabled. Escape, the close button or a click
outside close the dialog and save nothing; the folder and the selection are
saved only when **Create cards** runs.

Details, including **Select all** and how a saved selection follows renamed
notes: [Choosing notes](choosing-notes.md#the-run-dialog).

### The file explorer menu

Right-click in the file explorer:

| You right-clicked | Menu items |
| --- | --- |
| one Markdown note | **Create cards** (a card of this note) and **Create cards from this deck note** (the cards of its links) |
| a folder, several items, or a file that is not a note | **Create cards** |

**Create cards** makes one card of each chosen note and of every note below a
chosen folder. Files that are not notes (images, PDFs) are skipped. The same
items appear in a note's tab menu and in the editor's **More options** menu.

These direct ways use the output folder and the kind rules from the settings
tab as they are; they open no dialog.

## What a run produces

A run writes two files to the output folder:

| File | Content |
| --- | --- |
| `<name> cards.pdf` | The A4 sheets with the cards, in the order of the run. |
| `<name> cards warnings.md` | Every warning of the run, one per line, or `No warnings.` It is written on every run. See [Warnings](warnings.md). |

`<name>` is:

- the deck note's name for a deck run (`Opening Deck cards.pdf`);
- the folder's name when you chose one folder in the file explorer;
- `Cards` otherwise (the run dialog, several items, one note).

Characters that cannot be in a file name (`/ \ : * ? " < > |`) and leading
dots are removed, and runs of spaces become one: `Reed / Hare: Opening`
gives `Reed Hare Opening cards.pdf`.

If either file already exists, the plugin asks first and names both files.
The buttons are **Cancel** and **Replace**; Cancel has the focus, so Enter or
Escape cancels. On Cancel nothing is read or written and the notice says
`❌ Card run cancelled.`

When the run is done, a notice says
`✅ Created 12 cards on 2 pages, 3 warnings. Written to /Users/you/Cards`.
A run that cannot make a PDF says `❌ Card run failed:` and the reason, and
writes nothing. With nothing to print it says `There are no cards to print`.

The output folder must be an **absolute** path. It is refused when it is
empty, relative (`out`, `~/out`), contains `..`, is the vault's own folder,
is `.obsidian` or below it, or is the root of a disk. A folder inside the
vault (`<vault>/Cards`) is allowed. A folder that does not exist is created.

The plugin never changes your notes, the scheme note or anything else in the
vault. It writes only these two files, only into the output folder.

## Which note is which card

The plugin decides the kind of each note from its folder. A **kind rule**
pairs a vault folder with a kind: `skill`, `spell` or `creature`. A note takes
the kind of the rule with the **longest** folder that contains it.

With the rules `Skills` → skill, `Skills/Magic` → spell and `Spells` → spell:

| Note | Kind |
| --- | --- |
| `Skills/Parry.md` | skill |
| `Skills/Magic/Ember Spark.md` | spell (the longer rule wins) |
| `Spells/Deep/Reed Whisper.md` | spell |
| `Skills Extra/Feint.md` | none: `Skills Extra` is not `Skills` |
| `skills/Feint.md` | none: the case must match |

A note without a kind gives no card and the warning `CARD_KIND_UNKNOWN`. In
the run dialog it is greyed out.

## The settings tab

Open **Settings → Game Card Creator**. The first row has the link
**Help: the README** and the **Copy debug info** button (bug icon). It copies the plugin's and
Obsidian's versions, the settings file and the list of enabled plugins to the
clipboard, for a bug report; nothing is sent anywhere.

Under it, the **status line** reads
`Ready: 2 kind rules, output folder /Users/you/Cards`, or `Not ready:`
followed by every problem on its own line. It uses the same checks as a run,
so a run works when the status line says `Ready`.

Below are five sections: **Output**, **Which note is which card**,
**Note properties**, **Page and text size** and **Titles**. Click a
section's heading to open or close it. When the tab opens, the first section
with a problem is open; when everything is ready, **Output** is.

A value is saved as soon as you change it: text and number fields when you
press Enter or leave the field, switches at once. There is no Save button. A
value that is not allowed is not saved: its reason is shown in red under the
field, and the last valid value stays in force.

The sections **Note properties**, **Page and text size** and **Titles** each
end with **Reset this section to defaults**. It asks first (**Cancel** /
**Reset**, Cancel has the focus) and resets only that section. The output
folder and the kind rules are never reset.

### Output

| Row | Default | Meaning |
| --- | --- | --- |
| Output folder | none | Where the PDF and the warnings file go; an absolute path (see [What a run produces](#what-a-run-produces)). **Choose folder…** opens the system's folder dialog at the current folder, or at your Documents folder. |

### Which note is which card

One row per [kind rule](#which-note-is-which-card): a folder field that
suggests the vault's folders, a drop-down `skill` / `spell` / `creature` and
a delete button. **Add rule** adds a row. A folder that is not in the vault
shows a warning but is kept, so you can add the folder later. An empty folder
and a folder named by two rules are refused. Deleting a rule asks nothing.

### Note properties

| Group | Row | Default | Meaning |
| --- | --- | --- | --- |
| Skill notes | Tags property | `tags` | The property holding the tags shown at the top of the card. |
| Skill notes | Timing property, Timing label | `timing`, `Time` | The first item of the details row, shown as `Time: action`. |
| Skill notes | Kind property, Kind label | `kind`, `Type` | The second item of the details row. |
| Skill notes | Requires property, Requires label | `requires`, `Requires` | The third item of the details row. |
| Spell notes | Tags property | `tags` | The property holding a spell's tags. |
| Creature notes | Instincts heading | `Behaviour` | The heading of the creature's behaviour section. |
| Creature notes | Actions heading | `Actions` | The heading of the creature's actions section. |
| Creature notes | Signs heading | `Signs` | The heading of the creature's signs section. |
| Scheme note | Scheme note | empty (off) | The vault path of the note with the colours and icons, for example `Tables/Branch Scheme.md`. A line under it says `Scheme note: not found` when the note does not exist. See [Colours and icons](colours-and-icons.md). |

Property names and headings must not be empty. Two skill settings naming the
same property (compared without case and surrounding spaces) are refused.

### Page and text size

| Group | Row | Default | Allowed | Guide |
| --- | --- | --- | --- | --- |
| Sheet | Card width (mm) | 62 | 30 to 200 | [The sheet](sheet-layout.md) |
| Sheet | Card height (mm) | 88 | 30 to 200 | [The sheet](sheet-layout.md) |
| Sheet | Margin (mm) | 10 | 0 to 50 | [The sheet](sheet-layout.md) |
| Sheet | Gap (mm) | 0 | 0 to 10 | [The sheet](sheet-layout.md#gap) |
| Sheet | Cut marks | on | on, off | [The sheet](sheet-layout.md#cut-marks) |
| Sheet | Bleed (mm) | 0 | 0 to 3, not above the margin; at most 1 while cut marks are on | [Colours and icons](colours-and-icons.md#bleed) |
| Text size | Largest size (pt) | 7 | 5.5 to 10 | [Skill and spell cards](skill-and-spell-cards.md#text-size) |
| Text size | Smallest size (pt) | 5.5 | 4 to 10, not above the largest | [Skill and spell cards](skill-and-spell-cards.md#text-size) |
| Text size | Size step (pt) | 0.25 | 0.05 to 1 | [Skill and spell cards](skill-and-spell-cards.md#text-size) |

Under the sheet rows a line shows the result, for example
`9 cards per A4 page (3 × 3)`, or says that no card fits the page. The text
sizes apply to all three kinds of card.

### Titles

One row per kind: **Skill titles**, **Spell titles** and **Creature titles**.
Each has the switch **Equal title bars**; while it is on, a gear opens the
two sizes of that kind.

| Row | Setting | Default | Allowed |
| --- | --- | --- | --- |
| Skill titles, Spell titles | Title size (pt) | 9.1 | 6 to 20 |
| Skill titles, Spell titles | Smallest title size (pt) | 7 | 4 to 20, not above the title size |
| Creature titles | Title size (pt) | 11.5 | 6 to 20 |
| Creature titles | Smallest title size (pt) | 7 | 4 to 20, not above the title size |

All switches are off by default. See [Equal title bars](equal-title-bars.md).

### The settings file

The settings are stored in `data.json` in the plugin's folder. The first time
the tab saves a value, the file as it was is copied to
`data-before-settings-screen.json` next to it (once; the copy is never
overwritten). The tab keeps keys it does not know.

## What a card shows

| Card | Top to bottom | Guide |
| --- | --- | --- |
| Skill | the note's tags, its title (the file name), a details row (`Time: action · Type: attack · Requires: Basket Knots`), a rule, the note's text | [Skill and spell cards](skill-and-spell-cards.md) |
| Spell | the note's tags, its title, a rule, the note's text | [Skill and spell cards](skill-and-spell-cards.md) |
| Creature | the statblock drawn by Obsidian2Typst, then the note's Behaviour, Actions and Signs sections | [Creature cards](creature-cards.md) |

The text is set in Libertinus Serif. It is fitted to the card: it shrinks from
7 pt towards 5.5 pt and is cut, with a warning, only when it still does not
fit. Bold, italic, lists, links (as their text), headings, callouts and rules
are shown. Pictures are left out with a warning, and so are embedded notes.
Tables, HTML and code blocks are shown as plain lines with a warning.
Dataview blocks are left out silently. Cards have no backs.

## Guides for advanced topics

| Guide | Topics |
| --- | --- |
| [Choosing notes](choosing-notes.md) | Deck notes and their links, the file explorer, the run dialog and its note tree, the saved selection, the order of the cards. |
| [Skill and spell cards](skill-and-spell-cards.md) | What the card shows, tags, the details row, which Markdown is shown, text size and fitting, characters no font has. |
| [Creature cards](creature-cards.md) | What Obsidian2Typst must provide, the statblock, the three sections, what is given up when the card is full, the credit line. |
| [Colours and icons](colours-and-icons.md) | The scheme note, coloured header bands and gradients, RPG Awesome icons, the icon credit, bleed. |
| [Equal title bars](equal-title-bars.md) | One title size and one header height for all cards of a kind; creature name bands. |
| [The sheet](sheet-layout.md) | Card size, margin, gap, how many cards fit, the order on the page, cut marks, the credit line at the foot. |
| [Warnings](warnings.md) | The warnings file, the order of the warnings, and a list of every warning. |
