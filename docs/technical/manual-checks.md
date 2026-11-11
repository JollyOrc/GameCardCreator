# Manual checks

Procedures a human runs, one file each, named by its id (SCAR-029). A new
check takes the next id, its file and its row here in the same change; a test
(`tests/tooling/manual-checks.test.ts`) guards the index against the files.

| Id | Check | Needs |
|---|---|---|
| [M01](manual-checks/M01.md) | Make cards from a deck note and from the file explorer on a generated vault (US-005 AC-13) | the plugin built and installed (US-008), the generated vault, a PDF viewer |
