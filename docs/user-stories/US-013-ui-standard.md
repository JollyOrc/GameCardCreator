# US-013 — The UI standard: a run dialog, a ribbon icon and the settings in sections

**Status:** Done (tickets #51 to #58; M12 passed 2026-11-17, F1 fixed in #58 and re-checked). (G0 and G1 2026-11-17; O1 to O5 decided by the owner's "go" for the proposals;
measurements M1 to M3 made in M11, 2026-11-17)
**Introduced:** 0.7.0 (planned)
**Tickets:** #51 (T1 selection), #52 (T2 dialog rules), #53 (T3 sections and debug info), #54 (T4 notices), #55 (T5 settings tab), #56 (T6 run dialog, entry points, string table), #57 (T7 test build, M12), in this order (G3, 2026-11-17)
**Follows:** the preferred UI standard of Obsidian Knowledge (`ui-standard.md`, commit `d6660e2`), the
owner's decisions of 2026-11-17 (D1 to D10 of the control project's alignment note): a run dialog beside
today's direct actions (D2), collapsible sections instead of sub pages (D4), the selection tree in the run
dialog (D5), a "Copy debug info" button (D7), the ✅ / ❌ notices (D8), the progress tab only for runs over
about 2 s, measured first (D3).
**Amends:** US-005 (AC-9 the commands and the notice), US-007 (AC-1 the tab, AC-9 reset)

**As** a game master **I want** to start a card run from one dialog where I see and choose the notes and
the output folder, and to find every setting in one scrolling tab of sections, **so that** Game Card
Creator works like the other plugins I use for the book, and I do not need to prepare a deck note for a
quick run.

Reader of the output: the author at a keyboard, desktop only, English. All examples use invented names
(SCAR-035).

---

## What exists today (0.6.0) and what users rely on (SCAR-027)

- **Starting a run:** the command `Create cards from this deck note` (active note), the file explorer's
  `Create cards` (files, folders, several) and, for one Markdown note, `Create cards from this deck note`
  in the same menu (US-005 AC-9; `file-menu` and `files-menu`, fired by the explorer, the tab header menu
  and the editor's "more options", measured in M05). Every run uses the output folder and kind rules from
  the settings; there is no dialog except the replace question (US-005 AC-7).
- **Settings tab:** a main page (status line, output folder with `Choose folder…`, kind rules) and two sub
  pages with `Back`: *Note properties* (groups Skill notes, Spell notes, Creature notes, Scheme note) and
  *Page and text size* (Sheet, Text size, Skill titles, Spell titles, Creature titles), each with `Reset
  this page to defaults` (US-007, US-009, US-011, US-012).
- Kept unchanged by this story: every direct action above, the status line, commit on Enter or blur, the
  one commit path `commitSetting` (US-007 AC-4), the folder dialog (US-007 AC-5), the replace question,
  the warnings file, all card output.

## Acceptance criteria

- **AC-1 (entry points).** New: a ribbon icon `Create cards…` and a command `Create cards…`, both open the
  run dialog (AC-2) with the saved selection (AC-4). New: the command `Create cards from the saved
  selection` runs at once with the saved selection and the settings, without the dialog; with no saved
  selection it refuses with the notice `Nothing selected yet. Open "Create cards…" and choose notes.`
  Kept as they are: the three direct actions of US-005 AC-9 (they are the standard's "using previous
  settings" entries).
- **AC-2 (the run dialog).** A modal titled `Create cards` holds, top to bottom: the destination row
  (output folder text field, `Choose folder…` where the system dialog exists, and the button `Create
  cards` at the end of the row); under it a red line with the reason when the folder is refused
  (`checkOutputFolder`, SCAR-033) and a grey line saying what is there (AC-3); a row `More options` with a
  gear that opens the plugin's settings tab. Beside the dialog, the selection panel (AC-4). `Create cards`
  is disabled while the folder is refused or nothing is selected. Example: the folder `relative/path`
  gives the red line `Output folder "relative/path" is not an absolute path` (the check's own message,
  `src/core/run/output.ts`) and a disabled button.
- **AC-3 (what is at the destination).** The grey line says, for the run's `<name>` (US-005 AC-6:
  `Cards` for a selection, the folder's name for one folder): `Cards cards.pdf will be created.` or
  `Cards cards.pdf exists (from 2026-11-17 14:02) and will be replaced after a question.` It is made again
  on every change of the folder or the selection (SCAR-016).
- **AC-4 (the selection tree, D5).** The panel lists the vault's Markdown notes as a tree with
  checkboxes; folders start collapsed; checking a folder checks the notes below it; a `Select all` row at
  the top is saved as `all`, so notes added later are included. Each note shows its card kind as a tag
  when a kind rule gives it one (`skill`, `spell`, `creature`); a note without a kind is shown greyed and
  cannot be checked (it would give no card). The tree shows each folder's entries by name without case;
  the order of the cards is the notes' paths without case (US-005 AC-2's order), so `Skills/a.md`,
  `Skills/B.md`, `Skills/Sub/C.md` give the cards a, B, C. A `Save selection` button saves the checked
  notes; when every note with a kind is checked, the saved form is `all`. Example: with `Select all`
  saved, a new note `Skills/Reed Sweep.md` is checked the next time the dialog opens.
- **AC-5 (when values are saved).** The folder and the selection chosen in the dialog are saved **when
  `Create cards` runs** (and the selection also by `Save selection`); Enter runs when the button is
  enabled, Escape, the X and a click outside cancel and save nothing (SCAR-013, SCAR-016). The folder
  field commits on Enter or blur like every other field (US-007 AC-3), but in the dialog the commit is
  held until the run.
- **AC-6 (the saved selection stays valid).** When a selected note or folder is renamed or moved, the
  saved selection follows it (`vault.on("rename")`); a deleted note drops out without a warning. Example:
  `Skills/Reed Sweep.md` renamed to `Skills/Reed Sweep II.md` stays selected.
- **AC-7 (the settings tab in sections, D4).** The two sub pages and `Back` go away. The tab shows, top to
  bottom: a header row (AC-8), the status line (unchanged), then collapsible sections, each a `<details>`
  with a chevron and a heading with a description: *Output* (output folder), *Which note is which card*
  (kind rules), *Note properties* (the four groups as sub-headings), *Page and text size* (Sheet, Text
  size), *Titles* (AC-9). Sections start closed except the first one with a problem, or *Output* when all
  is ready. Example: with no output folder set, the status line says `Not ready:` and *Output* is open,
  all other sections closed; with every check passing, only *Output* is open. A divider separates
  sections. Styles in `styles.css` under `gcc-` classes, with Obsidian's
  colour variables; no inline style (standard 0.6).
- **AC-8 (header row and debug info, D7).** No heading with the plugin's name. A `Copy debug info` button
  (bug icon) copies, as plain text: the plugin's version, Obsidian's version (`apiVersion`), the settings
  file's content, the list of enabled plugins with their versions; then the notice `Debug info copied.`
  Nothing is sent anywhere.
- **AC-9 (feature rows for the equal title bars).** *Titles* has one row per kind (`Skill titles`,
  `Spell titles`, `Creature titles`): the toggle `Equal title bars` and a gear that opens a modal with
  that kind's `Title size` and `Smallest title size` (US-011, US-012). **Amended 2026-11-17 (#55, SCAR-027):** the gear
  appears only while the row's switch is on, as US-011 AC-10 shows the sizes only then. The modal's fields commit like the
  tab's (US-007 AC-3, AC-4). The toggle and the modal show the current values while the tab stays open
  (SCAR-016).
- **AC-10 (reset per section).** Each section with defaults has `Reset this section to defaults` behind
  the existing confirmation (`Reset` / `Cancel`, focus on `Cancel`, US-007 AC-9). The output folder and
  the kind rules are still never reset. Example: resetting *Page and text size* puts the card width back
  to 62 mm (the default, `src/core/sheet/layout.ts`) and leaves *Titles* as they are.
- **AC-11 (notices, D8).** A finished run: `✅ Created 12 cards on 2 pages, 3 warnings. Written to /out`
  (singulars as US-005 AC-9). A cancelled replace question: `❌ Card run cancelled.` A failed run: `❌
  Card run failed: <message>` (an exception and a run that gives no PDF alike). A refusal before the run
  keeps its text; its ending names the first section with a problem (AC-7's order): `See Settings → Output
  (file: …)` for a missing output folder, `See Settings → Which note is which card (file: …)` for no kind
  rule.
- **AC-12 (one string table).** Every user-facing text of the dialog, the tab and the notices comes from
  one module `src/plugin/strings.ts`; a text check finds no other string literal passed to `setName`,
  `setDesc`, `setButtonText`, `setTooltip`, `setText` or `Notice` in `src/plugin`.
- **AC-13 (no progress tab, D3).** A run reports by notice, as today, if M1 shows a whole run under 2 s;
  otherwise this AC is replaced by a progress tab before Ready.
- **AC-14 (checked in Obsidian).** A manual check on the scratch vault with a tab and the dialog that stay
  open: every entry point, Enter / Escape / IME in the dialog, the disabled button, the destination line
  changing while typing, the tree, `Save selection`, a rename, the sections, the feature-row modal, reset
  per section, debug info, all notices (SCAR-012, SCAR-015, SCAR-018, SCAR-045).

## Measurements (M11, 2026-11-17; M1 MacBook, macOS 27.0.1, Obsidian 1.15.0; decision rules written before the run)

- **M1, whole-run time** (spike build `0.6.0-m11.1`, from the click to the end of the run): 50 skill cards
  526 ms (first run, compiler start included), 100 cards 149 ms, 200 cards 274 ms. Under 2000 ms: **AC-13
  stands**, no progress tab. Creature runs not measured (they also call Obsidian2Typst per card).
- **M2, the side panel:** a second `.modal` element before the dialog shows beside it, scrolls, takes
  typing, and goes with the dialog on Escape, the X and a click outside: **AC-4's panel is used as
  written.** Obsidian's modal takes Escape before a field in the panel sees it (no line from the field's
  listener): the panel needs no Escape handling of its own; Enter in a panel field is **not measured** and
  the tree has no text field.
- **M3:** the icon `layout-grid` exists and shows in the ribbon; `app.setting.open()` then
  `app.setting.openTabById('game-card-creator')` (private, not in the typings: reached through a
  structural type, no `any`) opens the Game Card Creator tab: **AC-2's gear uses them**; the ribbon icon
  of AC-1 is `layout-grid`.

## Decisions (owner, 2026-11-17: "go" for the proposals)

- **O1:** the file explorer's menu stays as it is (no third item); the ribbon and the command reach the
  dialog.
- **O2:** notes without a kind are shown greyed and cannot be checked (AC-4).
- **O3:** the destination line names the existing PDF's date from its modification time (AC-3).
- **O4:** `minAppVersion` stays 1.6.6 unless a new API needs more (read at G2 from the pinned typings).
- **O5:** released as 0.7.0 (new features, no breaking change: every 0.6.0 settings file works).

## Interface used by the tests (G2)

Pure modules (no Obsidian import; `tab.ts`, the new `run-dialog/dialog.ts` and `main.ts` only call them,
SCAR-031):

- `src/plugin/run-dialog/selection.ts` (AC-4, AC-6, AC-1): `SavedSelection = 'all' | readonly string[]`;
  `readSelection(raw)` reads the file's `selection` value (`'all'`; a list keeps its strings in order,
  other entries dropped; an empty list or anything else is `null`); `TreeNode {name, path, isFolder, kind,
  children}`; `buildTree(paths, rules)` (Markdown notes only, `.md` in any case, and the folders holding
  them; children by name without case; a note's `kind` is `kindOf`, a folder's `null`; the root has name
  and path `''`); `checkable(tree)` (the notes with a kind, in path order without case); `initialChecked(tree,
  saved)`; `toggle(checked, node, on)` (a new set; a folder sets every note with a kind below it; a note
  without a kind is never added); `saveForm(checked, tree)`; `runItems(checked, tree)` (`SelectedItem`s in
  path order); `followRename(saved, from, to)` and `followDelete(saved, path)` (a note or a folder, by path
  segments; `'all'` and `null` unchanged); `plannedSavedRun(saved, tree)` (`{ok: true, items}` or `{ok: false,
  notice}` with AC-1's text when nothing would be made).
- `src/plugin/run-dialog/rules.ts` (AC-2, AC-3, AC-5): `destinationLine(pdfName, modified: Date | null)`
  (local time, `YYYY-MM-DD HH:MM`); `canRun(folder: {ok: boolean}, checked: number)`; `runDialogKey(event,
  enabled)` → `'run' | 'cancel' | 'none'` (IME composition and key code 229 → `none`; Escape → `cancel`;
  Enter → `run` when enabled, else `none`); `saveRunChoices({store, vaultRoot}, {outputFolder, selection})`
  (loads the file now, sets `outputFolder` in its normal form and `selection`, keeps every other key, one
  write, in the store's queue; a refused folder is not saved and answers the check's message).
- `src/plugin/commands.ts` (AC-1): `RIBBON = {icon: 'layout-grid', title: 'Create cards…'}`; the commands
  gain `dialogCommand` (`create-cards-dialog`, `Create cards…`) and `savedSelectionCommand`
  (`create-cards-from-saved-selection`, `Create cards from the saved selection`).
- `src/plugin/settings/sections.ts` (AC-7, AC-9, AC-10): `SectionId = 'output' | 'kinds' | 'properties' |
  'layout' | 'titles'`; `SECTIONS` (id, title, description, in that order: `Output`, `Which note is which
  card`, `Note properties`, `Page and text size`, `Titles`); `sectionOf(fieldId)`;
  `firstProblemSection(settings, vaultRoot)` (`null` when ready); `initiallyOpen(settings, vaultRoot)` (that
  section, else `output`); `RESETTABLE = ['properties', 'layout', 'titles']`; `resetSectionDialog(id)`
  (`Reset "<title>" to its defaults?\nYour values in this section will be lost.`, `Reset` / `Cancel`, focus
  `cancel`); `resetSection({store}, id)`; `FEATURE_ROWS` (one per kind: `title`, `toggle` field id, the two
  `fields` of the gear's modal).
- `src/plugin/debug-info.ts` (AC-8): `debugInfo({pluginVersion, obsidianVersion, settingsText, plugins})`
  → lines `Game Card Creator <v>`, `Obsidian <v>`, `Enabled plugins:`, one `- <id> <version>` per plugin
  sorted by id, `Settings file:`, then the file's text or `(no settings file)`; a line break ends it.
- `src/plugin/strings.ts` (AC-12): the user-facing texts of `src/plugin`.
- The runner's notices (AC-11) through `deps.notice`, as today.

Tests amended by this story (they pin today's texts or pages): `run-runner.test.ts` and the other runner
tests that pin the done, failure or refusal notice; `us-007-reset.test.ts` (`resetPage` gives way to
`resetSection`); `us-007-wiring.test.ts` (no `Back`, sections).

## Not covered

- Presets, an update banner, maintenance actions (the standard's run-dialog items 2 to 4): Game Card
  Creator has none of them.
- Obsidian2Typst and the Vault Compiler: their own stories (D10 order).
