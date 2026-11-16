# Manual checks

Procedures a human runs, one file each, named by its id (SCAR-029). A new
check takes the next id, its file and its row here in the same change; a test
(`tests/tooling/manual-checks.test.ts`) guards the index against the files.

| Id | Check | Needs |
|---|---|---|
| [M01](manual-checks/M01.md) | Make cards from a deck note and from the file explorer on a generated vault (US-005 AC-13) | the plugin built and installed (US-008), the generated vault, a PDF viewer |
| [M02](manual-checks/M02.md) | The compile inside Obsidian: the spike (US-008 AC-1, AC-12): load, first compile time, memory, network, a second compile, unload | the spike build installed in a scratch vault (ticket #13) |
| [M03](manual-checks/M03.md) | Which way opens the system's folder dialog? The spike (US-007 G1): four candidates, a folder with files, an empty folder, a cancel | the spike build installed in a scratch vault (test build 0.1.0-m01.4) |
| [M04](manual-checks/M04.md) | The settings screen in Obsidian (US-007 AC-13): pages, commit as you go, invalid values, kind rules, the folder dialog and its start folder, reset, the file and its backup, a hand edit while the tab is open, a refused run, a run with new settings | the test build of ticket #19 installed in a scratch vault |
| [M05](manual-checks/M05.md) | The deck note in the context menu (US-005 AC-9, D7) and where Obsidian shows it; the re-check of M04 step 9 (a refused dialog path keeps its message) | the test build of ticket #20 installed in a scratch vault |
| [M06](manual-checks/M06.md) | The creature card with the real Obsidian2Typst 0.15.1 (US-004): the statblock with icons and fonts, the sections, the fit, the credit, the warnings, a missing plugin, the three headings on the settings screen | the test build of ticket #26 and Obsidian2Typst 0.15.1 installed in the scratch vault of Obsidian2Typst (passed 2026-11-13, build `0.2.0-m06.2`) |
| [M07](manual-checks/M07.md) | Colour-coded headers and icons (US-009): the scheme note and its field on the settings screen, flat and gradient bands, one to three icons, a wrapping title, a note with no branch, a bad row, a missing note, no scheme, the credit line, the bleed | the test build of ticket #33 (`0.3.0-m07.1`) and Obsidian2Typst 0.15.1 installed in the scratch vault of Obsidian2Typst (passed 2026-11-16, build `0.3.0-m07.1`) |
| [M08](manual-checks/M08.md) | The glyph check (US-010): the warnings for characters no font draws on a skills run, a creature run whose preset font draws some of them, the boxes in the PDF, a missing Obsidian2Typst | the test build of ticket #39 (`0.4.0-m08.1`) and Obsidian2Typst 0.15.2 installed in the scratch vault of Obsidian2Typst (passed 2026-11-17, build `0.4.0-m08.1`) |
| [M09](manual-checks/M09.md) | Equal title bars (US-011): today's headers, the switch and its fields on an open tab, a refused size, one title size and one header height per kind, a title too long even at the smallest size, a hidden value kept, spells, off again equal to today | the test build of ticket #43 (`0.5.0-m09.1`) installed in the scratch vault of Obsidian2Typst |
| [M10](manual-checks/M10.md) | Equal title bands on creature cards (US-012): today's bands, the switch and its fields on an open tab, a refused size, one name size for a run, a card without a statblock, a name too long even at the smallest size, a hidden value kept, a deck with skill cards and a non-default size, off again equal to today | the test build of ticket #49 (`0.6.0-m10.1`) and Obsidian2Typst 0.15.2 installed in the scratch vault of Obsidian2Typst |
