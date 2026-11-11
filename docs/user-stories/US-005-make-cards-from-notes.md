# US-005 — Make cards from notes (the run, the commands, the output)

**Status:** Ready (G0 and G1 done 2026-11-12; D1 to D6 decided by the author
2026-11-12)

**As** a game master **I want** to choose notes in my vault and get the cards
of them as one PDF in a folder, with a list of what went wrong, **so that** I
can print the cards for a session.

This story is the **run**: from a list of notes to a PDF and a warnings file,
and the commands that start it. The settings screen is US-007; the compile
worker inside Obsidian and the release build are US-008; the creature card is
US-004. Skill and spell cards only here.

Reader of the output: a PDF viewer and an A4 printer (US-001). The notes are
only read (rule 2): nothing in the vault is changed, and the only files
written are the PDF and the warnings file in the output folder.

All examples use invented names and folders; the real ones are settings.

## Terms

- **Deck note**: a note whose links list the notes that become cards.
- **Kind rule**: a pair (folder, kind) in the settings; the kind is `skill` or
  `spell`. A note's kind is the kind of the rule with the longest folder that
  contains it.
- **Output folder**: an absolute folder on disk (desktop only) where the PDF
  and the warnings file are written.

## Settings of this story (defaults)

| Setting | Default | Allowed |
|---|---|---|
| Kind rules | none (the author adds theirs) | list of (folder, `skill` or `spell`) |
| Output folder | none (the commands refuse until it is set) | an absolute folder path |
| The card settings | those of US-001, US-002, US-003 | as there |

## Acceptance criteria

- **AC-1 (the deck note).** The cards are made in the order of the links of
  the deck note, in text order. A link is `[[Name]]`, `[[Name|alias]]`,
  `[[Folder/Name]]` or `[text](Name.md)`; its target loses a `#Heading` or
  `^block` part, a `.md` ending and URL escapes (`Folder%20X/Name.md` is
  `Folder X/Name`). Not links to cards: an embed `![[Name]]`, an image
  `![alt](x.png)`, a link with a scheme (`https://...`), a link to the same
  note (`[[#Heading]]`), anything in a code block or inline code, and the
  deck note's own front matter. A note linked twice gives two cards. Example:
  `Opening Deck.md` with `- [[Reed Sweep]]`, `- [[Reed Whisper|the whisper]]`
  and `- [[Reed Sweep]]` gives the targets `Reed Sweep`, `Reed Whisper`, `Reed
  Sweep`. Which note a target means is Obsidian's own answer through an
  injected `resolve(target, deckPath)` that gives `{path, isNote}` or nothing
  (the plugin calls `getFirstLinkpathDest`). A target that no note answers
  gives no card and `DECK_LINK_MISSING` (detail: the target); an answer that is
  not a note (a folder, an image) gives `DECK_LINK_NOT_A_NOTE` (detail: the
  target); a bare name (no `/`) that more than one note has gives the card of
  the answered note and `DECK_LINK_AMBIGUOUS` (detail: `dup; using a/dup.md`),
  as the Vault Compiler reports it. Warnings come in link order. *Not
  measured:* which note Obsidian answers for an ambiguous name; the tests use
  a stand-in (the smallest path) and AC-13 measures the real one.
- **AC-2 (notes or folders from the file explorer).** The chosen files and
  folders give the cards of their notes, in the order of the choices: a note
  is one card; a folder gives every note below it, sorted by path without
  case; a note that comes twice (by itself and by its folder) counts at its
  first place. Example: the choices `Z.md` and the folder `Skills` holding
  `Skills/B.md`, `Skills/a.md` and `Skills/Sub/C.md` give `Z`, `a`, `B`, `C`.
  Files that are not notes (images, PDFs) are skipped without a warning.
- **AC-3 (the kind of a note, D4).** The kind of a note is the kind of the
  longest kind rule whose folder contains it ("contains" means the folder and
  a `/`, never a bare prefix, SCAR-033). Rules `Skills` -> skill, `Skills/Magic`
  -> spell, `Spells` -> spell: `Skills/A.md` is a skill, `Skills/Magic/B.md` a
  spell, `Skills/Magic/Deep/C.md` a spell, `Spells/D.md` a spell,
  `Skills Extra/E.md` and `Other/Skills/F.md` have no kind, `skills/G.md` has
  none (case matters). A note without a kind gives no card and one warning
  `CARD_KIND_UNKNOWN` (detail: its path). Measured on the real vault
  2026-11-12: the tags of skills, spells and creatures are disjoint but no one
  tag marks all skills; the folders separate the kinds.
- **AC-4 (the run).** For the cards' notes in order: read the note (the text,
  not the metadata cache, so the one reader of US-002 sees it), read it as
  its kind (US-002, US-003), put the cards on the sheet (US-001, US-003
  AC-7), compile, read the fit facts (US-002 AC-5) and join the warnings in
  card order: reading warnings, then fit warnings. A note that cannot be read
  gives no card and one warning `NOTE_UNREADABLE` (detail: the reason); the
  other cards are still made (rule 8). The result is the PDF bytes, the number
  of cards and pages, and the warnings. A compile that gives no PDF gives no
  file and a message with the compiler's first diagnostic. Nothing to print (no
  cards) gives no file and the message `There are no cards to print`.
- **AC-5 (the output folder, SCAR-033).** The output folder is classified
  before anything is read or asked, from its text and the vault's folder:
  empty or only spaces, relative (`out`), `~/out`, a path with a `..` segment
  (`/a/../b`), the vault's own folder (also with a trailing slash), `.obsidian`
  or anything below it, and the filesystem root (`/`, `C:\`) are refused with
  a message naming the setting and the value. An absolute path is one that
  starts with `/` or with a drive letter and `:` followed by `\` or `/`. The
  accepted text is normalised: a trailing separator goes, `//` and `/./` become
  `/`: `/tmp//out/` is `/tmp/out`. A folder inside the vault (`/v/Cards`) is
  allowed. A folder that does not exist is created; a path that is a file is
  refused. All writes go through one writer that refuses a path that is not
  below the folder, never deletes, and a text check over the sources shows that
  no other write call exists.
- **AC-6 (the names).** The files are `<name> cards.pdf` and `<name> cards
  warnings.md`; `<name>` is the deck note's name, the chosen folder's name for
  a run from one folder, `Cards` for other choices. It loses `/ \ : * ? " < >
  |` and leading dots, and runs of spaces become one: `Reed / Hare: Opening`
  gives `Reed Hare Opening cards.pdf` and `Reed Hare Opening cards
  warnings.md`; `.hidden` gives `hidden cards.pdf`; `A  B` gives `A B
  cards.pdf`. A name that is empty after that is `Cards` (`Cards cards.pdf`).
- **AC-7 (an existing file, D3).** When either file exists, a
  confirmation names both and offers `Replace` and `Cancel` (focus on `Cancel`,
  Escape cancels, Enter acts on the focused button, SCAR-014); on `Cancel`
  nothing is read or written. The confirmation comes before the run starts.
- **AC-8 (the warnings file).** `<name> cards warnings.md` is written with
  every run, also without warnings, as exactly: the heading `# <name> cards:
  warnings`, an empty line, then one line `- CODE — path — detail` per warning
  in order (`- CODE — path` when the detail is empty), or `No warnings.`; a
  line break ends the file; no date (deterministic). Example for a skill with
  an omitted image: `# Opening Deck cards: warnings`, empty line, `-
  SKILL_IMAGE_OMITTED — skills/Reed Sweep.md — pics/reed.png`. The file of an
  earlier run is replaced (AC-7), never left.
- **AC-9 (the commands, SCAR-022, SCAR-016, SCAR-031).** `Create cards from
  this deck note` (command palette; offered only for a Markdown note), and
  `Create cards` in the file explorer's menu for one or several files and
  folders. The menu and command handlers only pass what they were given (the
  note, the chosen files) to the run; every read happens after the click
  (building the menu entry reads nothing). The settings are read when the
  command runs, not when the menu was built. A second run while one is running
  is refused with a notice. The result is a notice: `12 cards on 2 pages, 3
  warnings. Written to /out` (`1 card on 1 page, 1 warning.` in the singular).
  Without an output folder or a kind rule the command refuses with a notice
  that names the setting, before anything else happens. A run that gives no PDF
  writes nothing and shows its message.
- **AC-10 (no change to the vault, rule 2).** A run changes no file of the
  vault: the run's dependencies offer reading but no vault writing, and a
  text check over the sources shows that the plugin calls no vault write.
- **AC-11 (deterministic).** The same notes and settings give the same PDF
  bytes and the same warnings file, in two fresh processes.
- **AC-12 (composed).** The deck note `Mixed Deck.md` with `[[Gone]]`,
  `[[Loose]]`, `[[Reed Sweep]]`, `[[Reed Whisper]]`, `[[Long Drill]]`, in a
  vault with `skills/Reed Sweep.md` (the US-002 example with its image),
  `spells/Reed Whisper.md` (the US-003 example), `skills/Long Drill.md` (400
  words), `misc/Loose.md` and the rules `skills` -> skill, `spells` -> spell,
  gives one PDF of three cards in the order Reed Sweep, Reed Whisper, Long
  Drill (one
  page) and the warnings, in this order:
  `DECK_LINK_MISSING` (Gone), `CARD_KIND_UNKNOWN` (misc/Loose.md),
  `SKILL_IMAGE_OMITTED` (skills/Reed Sweep.md), `SKILL_TEXT_OVERFLOW`
  (skills/Long Drill.md); the order is: deck warnings in link order, then the
  reading warnings in card order, then the fit warnings.
- **AC-13 (manual check on a generated vault, SCAR-012, SCAR-018, SCAR-035).**
  On a generated scratch vault (a generator, no real notes) with the plugin
  built and installed (US-008): the commands run, the PDF and the warnings
  file appear, the vault is unchanged (checksums before and after). The check
  also measures Obsidian's answer for an ambiguous name (two notes `dup.md` in
  different folders, a deck link `[[dup]]`) and for a link with an alias, a
  heading and a folder name. Then once on the author's real vault with its own
  settings: read-only.

## Decisions

Decided by the author (2026-11-12, all proposals):

- **D1 — splitting and order.** US-005 (the run, this story), then US-008
  (compile worker, build, release), then US-007 (settings screen). The first
  installable version needs all three; real cards can be seen after US-008
  with a hand-edited settings file.
- **D2 — choosing notes.** A deck note (AC-1) and the file explorer's menu
  (AC-2), both feeding the same run.
- **D3 — an existing file.** Ask, then replace (AC-7).
- **D4 — the kind of a note.** Folder rules in the settings (AC-3).

Decided by the author (2026-11-12, after the first four):

- **D5 — settings without presets.** A plain settings tab (US-007) rather than
  preset notes as in Obsidian2Typst.
- **D6 — the compile worker.** The pattern of Obsidian2Typst copied (embedded
  WASM, lazy decode, a worker for the compile and the facts), recorded in
  `dependencies.md`, rather than a shared package.

## Not covered

The settings screen (US-007), the worker, bundling and release (US-008), the
creature card (US-004), the picture (US-006), vault fonts, the missing-glyph
warning (issue #5), a preview inside Obsidian.
