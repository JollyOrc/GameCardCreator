# Architecture

- `src/core/**` is pure: no `obsidian`, Node or I/O (enforced by
  `eslint.config.mjs`); side effects live in `src/plugin`.
- `src/core/sheet/layout.ts` (US-001, ticket #1): the one place that knows
  the sheet geometry — settings and ranges, grid, card placement, cut marks.
  The engine ticket (#2) reads it and never copies a position.
