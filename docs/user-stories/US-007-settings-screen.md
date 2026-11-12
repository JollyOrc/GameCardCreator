# US-007 — The settings screen

**Status:** Ready (G0 and G1 done 2026-11-12; the decisions D1 to D12 are the author's
answers of 2026-11-12, D13 follows from the measurement M03 by the rule written before the
run, D14 to D16 are the author's "all ok" to the proposals A1 to A3).

**As** a game master **I want** to set up the plugin on a screen in Obsidian instead of
editing `data.json` by hand, **so that** I can choose where the cards go, which notes are
which kind of card and how the sheet looks, and see at once what is wrong.

Until now the settings come from the plugin's `data.json` (US-008 AC-4); the plugin never
wrote it. This story adds the screen and, with it, the first writes of that file.

Reader of the output: the author at a keyboard; the screen is checked in Obsidian (M04).
English only (D9).

## Terms

- **Page**: the main page of the tab or one of its two sub pages (a Back control returns).
- **Commit**: a field's value becomes a setting, is checked and, when valid, is saved.
- **The checks**: the existing pure checks of US-001 to US-005 (`checkCardsSettings` and
  what it calls); the screen adds no rule of its own and shows their messages.

## The pages (D3: sensible groups on pages; no "Advanced" section: nothing odd is left)

1. **Main page "Game Card Creator":** the status line; *Output folder* (a text field and a
   `Choose folder…` button); *Which note is which card* (the kind rules); links to the two
   sub pages.
2. **"Note properties":** *Skill notes*: the property names for tags, timing, kind and
   requires, and the labels (`Time`, `Type`, `Requires`); *Spell notes*: the tags property.
   `Reset this page to defaults`.
3. **"Page and text size":** *Sheet*: card width, card height, margin, gap, cut marks, and
   a computed line `9 cards per A4 page (3 × 3)`; *Text size* (skill and spell): largest,
   smallest, step. `Reset this page to defaults`.

## Acceptance criteria

- **AC-1 (the tab).** A settings tab `Game Card Creator` with the three pages; sub pages are
  drawn in the same tab, with a `Back` control; the tab is desktop only and in English.
  The classic `Setting` API is used; `minAppVersion` stays 1.5.0 (D8).
- **AC-2 (the status line).** The main page starts with one status line made by the same
  checks the commands run (`checkCardsSettings` with the vault's folder): `Ready: 2 kind
  rules, output folder /path` when valid (`1 kind rule` for one); otherwise `Not ready:` and
  every problem on its own line starting with `- `, in the order of the checks, the messages
  of the checks, not new ones. A sheet on which no card fits the page (the layout function's
  message) is a problem too, because a run would refuse it. It is made again after every
  commit.
- **AC-3 (commit as you go, no Save button).** A valid value is saved at once; a text or
  number field commits on Enter and when it loses the focus, **not during an input-method
  composition** (SCAR-013) and not on every key; a toggle and a drop-down commit on change.
  An invalid value is not saved: its message is shown in red text **under that field**
  (D5), the last valid value stays saved, and the typed text stays in the field until it
  is fixed or the page is left (the page then shows the last valid value).
- **AC-4 (one path for every field, SCAR-017).** Every field commits through one function,
  `commitSetting`; a text check over the tab's sources finds that the number of fields
  equals the number of calls and that no field writes a setting another way.
- **AC-5 (the output folder, SCAR-033).** The text field and the `Choose folder…` button
  both give a path to `checkOutputFolder` before anything is saved; a refused path shows
  its message under the field. **A folder inside the vault is allowed and gets no warning**
  (D2). The button opens the **system's folder dialog** (D1) in one of two ways, tried in
  this order: `require('electron').remote.dialog.showOpenDialog` with `openDirectory`
  (candidate A), then `require('@electron/remote').dialog` (B); both measured in the author's
  Obsidian 1.15.0 (Electron 43.8.4) to give an absolute path for a folder with files and for
  an empty folder and `canceled: true` for a cancel (M03). **When neither is available the
  button is not shown** and the text field remains (the text field always works). A
  cancelled dialog changes nothing and shows nothing. **The dialog starts at the stored
  output folder when it exists, otherwise at the user's Documents folder** (the author's
  preference, M03); this is passed as Electron's `defaultPath` and **was measured in the
  author's Obsidian 1.15.0 (M04, build 0.1.0-m01.5, 2026-11-12): the dialog starts at the
  stored folder** (one observation; the Documents fallback for a missing folder was not tried). Not used: an `<input webkitdirectory>` (gives no path for
  an empty folder) and `showDirectoryPicker` (gives a name, no path).
- **AC-6 (the kind rules, D4).** A list of rows: a folder text field with the vault's
  folders suggested (the list is read when the field is used, not when the page was drawn,
  SCAR-016), a drop-down `skill` or `spell`, and a delete button; `Add rule` adds a row. A
  folder that does not exist in the vault shows a **warning** and is saved; an empty folder,
  a folder named by two rules and an unknown kind are refused with the messages of
  `checkKindRules` and not saved. The rules are saved in the order shown.
- **AC-7 (note properties).** The property names and labels commit as in AC-3; an empty
  name and two settings naming the same property (compared without case and surrounding
  spaces) are refused with the messages of `checkSkillSettings` and `checkSpellSettings`.
- **AC-8 (page and text size, SCAR-019).** Each number has its range and default; an example
  at the default, at both ends and one in the middle for each, and a value just outside each
  end (refused with the message of the check):

  | Setting | Range | Default | Examples that commit | Refused |
  |---|---|---|---|---|
  | card width (mm) | 30 to 200 | 62 | 30, 62, 100, 200 | 29, 201 |
  | card height (mm) | 30 to 200 | 88 | 30, 88, 120, 200 | 29, 201 |
  | margin (mm) | 0 to 50 | 10 | 0, 10, 25, 50 | -1, 51 |
  | gap (mm) | 0 to 10 | 0 | 0, 2, 5, 10 | -1, 11 |
  | largest size (pt) | 5.5 to 10 | 7 | 5.5, 7, 8.5, 10 | 5.4, 10.1 |
  | smallest size (pt) | 4 to 10 | 5.5 | 4, 5.5, 7, 10 | 3.9, 10.1 |
  | size step (pt) | 0.05 to 1 | 0.25 | 0.05, 0.25, 0.5, 1 | 0.04, 1.1 |

  "Largest below smallest" is refused once, with its own message. The line `N cards per A4
  page (C × R)` is made from the sheet settings by the layout function of US-001 and is made
  again after each commit; when no card fits the page it says so.
- **AC-9 (reset, SCAR-014, SCAR-013).** Each sub page has `Reset this page to defaults`; it
  asks first in a dialog that names the page, with `Reset` and `Cancel`, the focus on
  `Cancel`, Enter acting on the focused button, Escape and a close being `Cancel` (the
  dialog logic of US-005's `dialogKey`). Only the keys of that page are reset. The main
  page has no reset: the output folder and the kind rules are never reset by the screen.
  Deleting a kind rule asks nothing (D15).
- **AC-10 (the file, SCAR-018).** The first write by the screen first copies `data.json` to
  `data-before-settings-screen.json` in the plugin's folder (never overwritten once it
  exists; no copy when there was no file; a failed copy stops the write and says so); the
  screen keeps keys it does not know and writes no other file. The file is written by
  Obsidian's `saveData` (its own formatting: **not** controlled or measured here). `saveData`
  has exactly one call in the source tree, in `main.ts`, handing it to the settings store (a
  text check). US-008 AC-4's "never calls `saveData`" is superseded: the plugin saves only
  through the screen.
- **AC-11 (the open tab, SCAR-016).** Every commit loads the current file, changes the one
  key and saves (commits run one after the other, so two at once lose nothing), so a change
  made to the file while the tab is open is not silently lost;
  the page shows the file's values again when it is drawn. A handler never uses a value
  read when the control was drawn.
- **AC-12 (the refusal notice, D11).** The notice of a refused run (a setting missing or
  wrong; US-008 AC-4) is its message, then a new line `See Settings → Game Card Creator
  (file: <path>)`; text only. A run that makes no PDF, and a runner without the file's path,
  keep their notices as before.
- **AC-13 (checked in Obsidian).** The manual check M04 runs on a tab that stays open: it
  changes a value, changes the file by hand, comes back to the tab, and runs a command
  with the new settings.

## Decisions (author, 2026-11-12)

- **D1** The output folder can be chosen with the system's file picker (folder dialog).
- **D2** An output folder inside the vault is explicitly allowed.
- **D3** Settings that group sensibly get their own pages; an "Advanced" section only if a
  few odd ones remain (none do).
- **D4** Kind rules: a text field with the vault's folders suggested; a missing folder warns
  and does not block.
- **D5** An invalid value shows red text under the field.
- **D6** The first save backs up `data.json` once, keeps unknown keys and writes the
  canonical form.
- **D7** Reset per page with a confirmation; none for the output folder and the kind rules.
- **D8** The classic `Setting` API (minAppVersion stays 1.5.0).
- **D9** English only.
- **D10** No extra options (no open-after-create, no dates in names; the replace question
  stays).
- **D11** The refusal notice names `Settings → Game Card Creator` in text only.
- **D12** The real tab is measured by a manual check (M04).

- **D13 — the folder dialog (2026-11-12, by the rule written before the run).** A, then B
  as the fallback, then no button; the start folder as in AC-5. The measurements are in
  `docs/technical/manual-checks/M03.md`.

- **D14 (A1)** The backup file is `data-before-settings-screen.json` in the plugin's folder.
- **D15 (A2)** Deleting a kind rule asks no question: adding it again is the undo; nothing is
  lost beyond one folder name.
- **D16 (A3)** The status line reads `Ready: N kind rules, output folder <path>` or `Not
  ready:` with the problems, one per line; the page headings are `Game Card Creator`, `Note
  properties` and `Page and text size`.

## Open

- The Documents fallback of the dialog (no stored folder, or a missing one) was not tried in
  Obsidian; the stored-folder case was measured (M04).

## Interface used by the tests (G2)

- Modules under `src/plugin/settings/`: `fields.ts` (`FIELDS`, `fieldsOf(page)`, `valueOf`,
  `fieldKey`), `commit.ts` (`commitSetting`, the `SettingsStore` type, one queue for every
  change), `rules.ts` (`commitRule`: `set` and `delete`), `status.ts` (`statusLine`,
  `gridLine`), `reset.ts` (`resetPage`, `resetDialog`, `PAGE_TITLES`), `store.ts`
  (`createSettingsStore`: `loadData`, `saveData`, the backup), `folder-dialog.ts` and `tab.ts`
  (the only one that imports Obsidian, with `main.ts`); `ui.ts` gains `confirmDialogWith`.
- `src/plugin/settings/folder-dialog.ts`: `folderDialogAvailable(env)` (true when A or B has a
  dialog object; nothing is opened) and `chooseFolder(env, startAt)` answers `{kind: 'chosen', path}`,
  `{kind: 'cancelled'}` or `{kind: 'unavailable'}`; `env` is the page's `require`; A is tried
  first, then B; a throw of a dialog is `unavailable` for that way and the next is tried; the
  dialog is asked for `openDirectory` and `defaultPath: startAt`. `dialogStart(outputFolder, home, exists)`
  is the stored output folder when it is a non-empty text and `exists(path)` says so, else
  `<home>/Documents` (async; an existence check that throws counts as "does not exist");
  the separator of `home` is kept.

## Not covered

The creature card's settings (US-004), presets, a card preview, per-run options, mobile,
other languages.
