# Architecture

- `src/core/**` is pure: no `obsidian`, Node or I/O (enforced by
  `eslint.config.mjs`); side effects live in `src/plugin`.
- `src/core/sheet/layout.ts` (US-001, ticket #1): the one place that knows
  the sheet geometry — settings and ranges, grid, card placement, cut marks.
  The engine ticket (#2) reads it and never copies a position.

- `src/core/card/` (US-003, D4): what every kind of text card shares:
  `warning.ts` (`cardCode`, the one place the kind and a problem become a
  warning code), `escape.ts` (the one escaping function), `sheet.ts`
  (`cardSheetTypst`, the layout, the size loop and the fit facts for cards of
  any kind). `src/core/skill/` holds the reader of a note (`readText`, the one
  reader; `readSkill` is its skill entry), the shared size settings
  (`CardSizes`) and the fit warnings; `skillSheetTypst` is the skill entry of
  the sheet. The spell side (`src/core/spell/`) is ticket #7.

- `src/core/run/` (US-005, ticket #8): the pure part of a run: `deck.ts` (the
  links of a deck note and the plan of notes with an injected resolver),
  `kinds.ts` (a note's kind by folder rules), `select.ts` (the notes of a
  selection), `names.ts` (file names), `output.ts` (the output folder),
  `report.ts` (the warnings file's text). The one reader of a note's header is
  `splitHeader` in `skill/read.ts`, used by the note reader and by `deckLinks`.
  Ticket #9 adds `settings.ts` (`CardsSettings`: kind rules, output folder and
  the card settings; `checkCardSettings` for the card part, `checkCardsSettings`
  for a command) and `run.ts` (`runCards`: the one place that turns notes into
  cards and a PDF).
  Ticket #10 adds `confirm.ts` (the replace dialog's text and `dialogKey`, the
  key rule) and, in `src/plugin/`, `disk-writer.ts` (the one writer),
  `runner.ts` (every decision of a run, with injected dependencies) and
  `commands.ts` (the deck command and the menu entry as plain objects over the
  runner). `main.ts` (US-008) only builds the dependencies and registers them.

- `src/core/scheme/` (US-009): the scheme note of the vault. `read.ts` (`readScheme`: front matter and the first
  top-level table with `Tag`, `Colour`, `Icon`, as warnings, never a throw), `branches.ts` (`branchesOf`, `tagKey`:
  the one place a tag is compared with a row), `icons.ts` (generated from the font's CSS by `build/gen-icons.mjs`:
  icon name to code point, the only way a glyph reaches the Typst source), `settings.ts` (the path check). The run
  (`run/run.ts`) reads the note once per run through the vault and gives each skill and spell card its `branches`;
  `card/sheet.ts` draws the band (`gcc-fit-b`: header and body as two builders, the band follows the chosen size),
  and `joinCredits` makes the one credit line of a sheet for the icons and the creature statblock. The icon font
  (RPG Awesome, `assets/fonts`) is embedded in `main.js` with Libertinus Serif (`fontFiles` in the build).

- `src/core/glyph/` (US-010): the glyph check. `coverage.ts` (`decodeCoverage`, `createCoverage`: what the faces of a
  compile cover, from the compiler's own font information), `check.ts` (`cardCodePoints`: the text the plugin sets on a
  card, read from the places the sheet writes user text through `typstString`, guarded by `card-escape`; `glyphDetail`,
  `glyphWarnings`: one warning per note, the kind's code). `run/run.ts` asks `RunDeps.coverage` once per run with the
  fonts the compile will have (the sheet's extra fonts from the other plugin's answer) and puts the glyph warnings
  after the notes' own and before the fit warnings; an unreadable coverage is one `GLYPH_CHECK_UNAVAILABLE`. The compile
  worker answers the coverage (`font-info`, `getFontInfo` of typst.ts, never on the main thread); the compile service
  has `coverage(fonts?)`; the runner hands it to the run; `main.ts` hands the service over in one statement.

