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
