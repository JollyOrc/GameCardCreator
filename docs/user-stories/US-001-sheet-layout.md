# US-001 — Cards on an A4 sheet

**Status:** Ready (G0 and G1 done 2026-11-11; decisions D1 to D5 made by the owner 2026-11-11)

**As** a game master **I want** the cards laid out on A4 sheets, as many as
fit inside a safe margin, **so that** I can print and cut them.

Reader of the output: any PDF viewer and printer (A4). Engine: Typst, version
pinned in `docs/technical/dependencies.md` (measured at step 2, SCAR-024).
This story knows nothing about what is on a card; card content is US-002
(skill), US-003 (spell), US-004 (creature); selecting notes and the command is
US-005.

## Terms and defaults

| Setting | Default | Allowed |
|---|---|---|
| Card width x height | 62 x 88 mm | 30 to 200 mm each |
| Sheet | A4, 210 x 297 mm | fixed |
| Safe margin (all four sides) | 10 mm | 0 to 50 mm |
| Gap between cards | 0 mm | 0 to 10 mm (D3) |

Usable area = sheet minus margin on each side (default 190 x 277 mm).

## Acceptance criteria

- **AC-1 (default grid).** With the defaults, columns = floor(190 / 62) = 3,
  rows = floor(277 / 88) = 3: nine cards per page. The block of cards is
  186 x 264 mm and is centred in the usable area (D2): its top-left corner is
  at x = 10 + (190 - 186) / 2 = 12 mm, y = 10 + (277 - 264) / 2 = 16.5 mm.
  Card (col c, row r), counted from 0 from the top-left, starts at
  x = 12 + 62c mm, y = 16.5 + 88r mm.
- **AC-2 (margin range).** Cards per page, upright, card 62 x 88:
  margin 0: usable 210 x 297 gives 3 x 3 = 9; margin 10 (default): 9;
  margin 20: usable 170 x 257 gives 2 x 2 = 4; margin 50: usable 110 x 197
  gives 1 x 2 = 2.
  A margin above 50 mm is outside the range (AC-12); "no card fits" can
  therefore only come from the card size (AC-3).
- **AC-3 (card size range).** Margin 10: card 30 x 30 gives 6 x 9 = 54;
  card 62 x 88 gives 9; card 95 x 140 gives 2 x 1 = 2; card 200 x 200 gives
  0 columns (usable 190 wide, 277 high gives 1 row): the layout is refused with
  a message naming the margin (10) and the card size (200 x 200); no PDF is
  written.
- **AC-4 (upright only, D1).** Cards are never turned. Margin 15: usable
  180 x 267, upright 180 / 62 = 2, 267 / 88 = 3 gives 6 cards (turning them
  would give 8; that is not done). Margin 10 gives 9.
- **AC-5 (pages and order).** n cards fill pages in reading order, left to
  right, then top to bottom, nine per page at the defaults: 1 card gives 1
  page, 9 give 1, 10 give 2 (9 and 1), 20 give 3 (9, 9, 2). 0 cards write no
  PDF and say so. Unused slots stay empty.
- **AC-6 (gap, D3).** With a gap g between cards the count per direction is
  floor((usable + g) / (card + g)). Margin 10, g = 2 mm: columns
  floor(192 / 64) = 3, rows floor(279 / 90) = 3, nine cards; the block is
  3 x 62 + 2 x 2 = 190 mm wide and 3 x 88 + 2 x 2 = 268 mm high, at x = 10 mm,
  y = 10 + (277 - 268) / 2 = 14.5 mm. Card (c, r) starts at
  x = 10 + 64c, y = 14.5 + 90r. g = 5 mm: columns floor(195 / 67) = 2, rows
  floor(282 / 93) = 3, six cards; the block is 129 x 274 mm at x = 40.5 mm,
  y = 11.5 mm. g = 0 is the default (AC-1).
- **AC-7 (cut marks, D4).** With cut marks on (the default), each card edge
  line gets a tick in the margin bands around the block: a vertical tick above
  and below the block at the x of every card's left and right edge, and a
  horizontal tick left and right of the block at the y of every card's top
  and bottom edge. A tick is 3 mm long and starts 1 mm outside the block. A
  side whose ticks would end closer than 3 mm to the sheet edge gets none, and
  the result lists the omitted side. Defaults (block 12..198 x 16.5..280.5):
  vertical ticks at x = 12, 74, 136, 198 (with gap 0 a left and a right edge
  coincide, one tick each); top ticks run y = 12.5 to 15.5, bottom ticks
  y = 281.5 to 284.5; horizontal ticks at y = 16.5, 104.5, 192.5, 280.5; left
  ticks run x = 8 to 11, right ticks x = 199 to 202: 16 ticks, none omitted.
  Omission (the centred block makes margin 0 and 10 give the same block for
  62 x 88, so the examples use wider cards): card 100 x 140, margin 0: two
  columns (200 mm) and two rows (280 mm), block at x = 5, y = 8.5; left and
  right ticks would start at x = 5 - 4 = 1 mm from the edge, so the left and
  right sides are omitted; top and bottom ticks start at 8.5 - 4 = 4.5 mm, kept.
  Card 98 x 140, margin 0: block at x = 7, left ticks start at 7 - 4 = 3 mm
  from the edge: kept (3 is not closer than 3). Card 62 x 143,
  margin 0: two rows (286 mm), block at y = 5.5; top and bottom ticks would
  start at 5.5 - 4 = 1.5 mm from the edge: the top and bottom sides are omitted, left
  and right (block at x = 12) are kept. Cut marks off: no ticks, nothing
  omitted. Ticks never overlap a card.
- **AC-12 (settings checked).** A setting outside its allowed range is refused
  before anything is laid out, with a message naming the setting and the value:
  card width 29 or 201, card height 29 or 201, margin -1 or 51, gap -1 or 11,
  a value that is not a number (NaN, infinity). The ends (30, 200, 0, 50, 10)
  are accepted.
- **AC-8 (sweep).** For 0 to 20 cards, margins 0 / 10 / 15 / 50 and gaps 0 / 2
  (168 combinations, the test asserts that number), each result has the page
  count of AC-5, no card outside the usable area and no two cards on one page
  overlapping.
- **AC-9 (output read back, SCAR-015, SCAR-023).** The PDF's pages are
  A4 (595.28 x 841.89 pt, read from the file); the cards' frames are
  located in the PDF (marker rectangles, checked to be no instrument effect,
  SCAR-028) and equal AC-1's positions to 0.1 mm; the page count equals AC-5.
- **AC-10 (deterministic, rule 7).** The same cards and settings give a
  byte-identical PDF in two separate processes.
- **AC-11 (look, SCAR-025).** The sheet of nine is looked at full page width
  and the card joins at 4x before the handover.

## Decisions (owner, 2026-11-11)

- **D1** upright only. **D2** the block is centred. **D3** gap default 0,
  adjustable (0 to 10 mm). **D4** cut marks in the margins, switchable,
  default on. **D5** fronts only; card backs are a later story.

## Ledger of what this story does not cover

Card content, text fitting, selection, settings screen and file location:
US-002 to US-005.
