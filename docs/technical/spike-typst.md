# Spike — Typst for the card sheet (ticket #2)

**Date:** 2026-11-11. **Scope:** Node, offline, no fonts, a sheet of empty
card frames (62 x 88 mm, stroke 0.2 pt) on A4, 0 to 20 cards. Not measured:
text on cards, images, fonts, Obsidian's worker (US-002 to US-005).
Throw-away code: `spikes/typst-sheet/` (git-ignored).

## Pinned versions

| Component | Version | Licence |
|---|---|---|
| `@myriaddreamin/typst.ts` | 0.7.0 | Apache-2.0 |
| `@myriaddreamin/typst-ts-web-compiler` | 0.7.0 | Apache-2.0 |
| `@myriaddreamin/typst-ts-renderer` | 0.7.0 | Apache-2.0 |
| Typst compiler inside (PDF `/Creator`) | 0.14.2 | not re-verified |

Licences read from the registry 2026-11-11 and from the installed
`package.json` files. Same versions as Obsidian2Typst, whose spike measured
size, offline behaviour and Obsidian's worker.

## Results

| Check | Result |
|---|---|
| Compile | 9 cards in about 100 ms including initialisation; no diagnostics |
| Page size | every page `/MediaBox [0 0 595.2756 841.8898]` = A4 |
| Frame positions | first frame: matrix `1 0 0 -1 34.015747 795.1181`, path 175.74803 x 249.44882 pt = x 12.000 mm, y 841.8898 - 795.1181 = 46.7717 pt = 16.500 mm, 62.000 x 88.000 mm: equal to US-001 AC-1 |
| Page counts | 0 cards 1 page (Typst always writes one), 1 gives 1, 9 gives 1, 10 gives 2, 20 gives 3 |
| Determinism | **two fresh processes 2 s apart: different bytes** (the PDF carries the current time as `CreationDate` and `xmp:CreateDate`); with `#set document(date: none)` the two PDFs are byte-identical |

A frame is a q-block: `1 0 0 -1 x y cm`, then the path `0 0 m / w 0 l / w h l
/ 0 h l / h`, then `S`. The y axis is flipped (PDF origin bottom left).

## Consequences

- The emitter writes `#set document(date: none)` (US-001 AC-10).
- 0 cards: the emitter refuses (US-001 AC-5: no PDF), because Typst would
  write an empty page.
- Not measured: whether another operating system or a Typst version other
  than 0.14.2 writes other bytes (AC-10 holds for this one pinned build).
