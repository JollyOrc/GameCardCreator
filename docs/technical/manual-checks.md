# Manual checks

Procedures a human runs, one file each, named by its id (SCAR-029). A new
check takes the next id, its file and its row here in the same change; a test
(`tests/tooling/manual-checks.test.ts`) guards the index against the files.

| Id | Check | Needs |
|---|---|---|
| [M01](manual-checks/M01.md) | Make cards from a deck note and from the file explorer on a generated vault (US-005 AC-13) | the plugin built and installed (US-008), the generated vault, a PDF viewer |
| [M02](manual-checks/M02.md) | The compile inside Obsidian: the spike (US-008 AC-1, AC-12): load, first compile time, memory, network, a second compile, unload | the spike build installed in a scratch vault (ticket #13) |
| [M03](manual-checks/M03.md) | Which way opens the system's folder dialog? The spike (US-007 G1): four candidates, a folder with files, an empty folder, a cancel | the spike build installed in a scratch vault (test build 0.1.0-m01.4) |
