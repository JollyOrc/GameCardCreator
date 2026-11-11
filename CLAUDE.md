# CLAUDE.md — Game Card Creator

Game Card Creator is an **Obsidian plugin** that creates print-ready game
cards of 62 mm x 88 mm from notes in a vault and writes them as an A4 PDF,
as many cards per sheet as fit inside a 1 cm safe margin. Three card
templates: one skill, one spell, one creature. See `README.md`.

The project is at its start: no story is written yet. The first step is the
SCAR review (step 0) and the first story (step 1).

## Shared rules

The development process (steps 0 to 4), code style, function headers, agent
rules 1 to 15, documentation maintenance and versioning are shared with the
sibling plugins and live in the SCARs repository:

@scars/AGENT-RULES.md

What follows is specific to this project and refines the shared rules.

## Where things are

- `docs/state/*.md` — the working state (rules 9 and 10), git-ignored. Read it
  first.
- `docs/user-stories/README.md` — index of the user stories (`US-NNN-*.md`),
  the source of truth for behaviour.
- GitHub Issues (<https://github.com/JollyOrc/GameCardCreator/issues>) —
  tickets (label `ticket` plus `US-NNN`, form
  `.github/ISSUE_TEMPLATE/ticket.yml`), backlog (`backlog`), bug reports.
- `docs/technical/tests.md` (quality gates, AC-to-test map),
  `docs/technical/dependencies.md`, `docs/technical/architecture.md`.
- `docs/process/`: `scar-review-checklist.md`, `release.md`. The SCAR gate
  table is shared: `scars/GATES.md`.

## SCAR gates and bootloader

The gates of rule 9, recorded in `docs/state/30_scar_checks.md`: G0 before a
story is written; G1 story written, before tests; G2 tests written, before
tickets; G3 tickets written, before code; G4 before a ticket is done and
before every manual-test handover; G5 closing a story. Which SCARs are checked
again at G1, G2 and G4: `scars/GATES.md`. Bootloader (rule 10): read all of
`docs/state/*.md` first in every session and after every compaction.

## What the shared rules mean here

- Rule 2: the plugin never changes the user's notes or images; it only reads
  them. The PDF goes only to the configured output location. Test input is a
  generated fixture vault (`tests/fixtures/`, changed only by its generator);
  no real notes, names or book text go into this repository.
- Rule 6: the Typst (or other) source that is generated is valid; all user
  text passes through the one escaping function.
- Rule 7: same notes and settings give byte-identical output.
- Rule 8: a note that cannot be turned into a card (missing property, text
  that does not fit) is a warning with the note's path; the other cards are
  still made.

## Code

- Every function header names its story and AC.
- Architecture (to be written with the first story,
  `docs/technical/architecture.md`): `src/core/**` is pure — no `obsidian`,
  Node or I/O imports (enforced by `eslint.config.mjs`); side effects only in
  `src/plugin`.
- PDF engine: Typst (via typst.ts in the plugin, as Obsidian2Typst does);
  decided 2026-11-11.

## Quality gate

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run build       # esbuild bundle -> main.js
npm run lint        # eslint + prettier --check
npm test            # vitest: unit tests (pure core)
npm run test:integration   # compiles sheets with Typst, reads the PDFs back
```

All must pass. Versioning and release: `docs/process/release.md`.

## Ecosystem

This plugin is a sibling of the three plugins that serve the author's vault.
The control project `../roa-bestiary` (private) owns the vault conventions;
see `CLAUDE.local.md` (git-ignored) for the import. Nothing from there goes
into tracked files, issues or commits (SCAR-035).
