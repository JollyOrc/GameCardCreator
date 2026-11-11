// US-001: cards on an A4 sheet. Pure geometry in millimetres, measured from
// the top-left corner of the sheet; no Obsidian, Node or I/O imports. Every
// function returns its problems as messages and reports nothing (SCAR-038).

/** US-001: the settings of the sheet (defaults and ranges: the story's table). */
export interface SheetSettings {
  /** Card width in mm, 30 to 200. */
  cardWidth: number;
  /** Card height in mm, 30 to 200. */
  cardHeight: number;
  /** Safe margin on all four sides in mm, 0 to 50. */
  margin: number;
  /** Gap between cards in mm, 0 to 10. */
  gap: number;
  /** Draw cut marks in the margins (D4). */
  cutMarks: boolean;
}

/** US-001 AC-1: the defaults, 62 x 88 mm cards, 10 mm margin, no gap. */
export const DEFAULT_SHEET: Readonly<SheetSettings> = Object.freeze({
  cardWidth: 62,
  cardHeight: 88,
  margin: 10,
  gap: 0,
  cutMarks: true,
});

/** US-001: the sheet is A4. */
const SHEET_WIDTH = 210;
const SHEET_HEIGHT = 297;

/** US-001 AC-7: tick length, distance from the block, least distance to the edge. */
const TICK_LENGTH = 3;
const TICK_OFFSET = 1;
const TICK_EDGE_MIN = 3;

/** Rounding that removes floating-point dust (1e-6 mm) from positions. */
const round = (value: number): number => Math.round(value * 1e6) / 1e6;

/**
 * US-001 AC-12: checks every setting against its allowed range.
 *
 * Returns one message per refused setting, naming the setting and its value;
 * an empty list means the settings are valid. A value that is not a finite
 * number is refused. Nothing is laid out here.
 */
export function checkSettings(settings: SheetSettings): string[] {
  const ranges: [string, number, number, number][] = [
    ['card width', settings.cardWidth, 30, 200],
    ['card height', settings.cardHeight, 30, 200],
    ['margin', settings.margin, 0, 50],
    ['gap', settings.gap, 0, 10],
  ];
  const issues: string[] = [];
  for (const [name, value, low, high] of ranges) {
    if (!Number.isFinite(value) || value < low || value > high) {
      issues.push(`${name} ${value} is outside ${low} to ${high} mm`);
    }
  }
  return issues;
}

/** US-001 AC-1: the grid of one page, or why there is none. */
export type SheetGrid =
  | {
      ok: true;
      columns: number;
      rows: number;
      /** Cards per page, columns x rows. */
      perPage: number;
      /** Top-left corner of the block of cards, in mm from the sheet corner. */
      originX: number;
      originY: number;
    }
  | {ok: false; message: string};

/**
 * US-001 AC-1, AC-2, AC-3, AC-4, AC-6: the grid of one page.
 *
 * Per direction the count is floor((usable + gap) / (card + gap)), cards are
 * never turned (D1), and the block of cards is centred in the usable area
 * (D2). Refuses invalid settings (AC-12) and settings where not one card fits
 * (AC-3), with a message naming the margin and the card size.
 */
export function sheetGrid(settings: SheetSettings): SheetGrid {
  const issues = checkSettings(settings);
  if (issues.length > 0) return {ok: false, message: issues.join('; ')};
  const {cardWidth, cardHeight, margin, gap} = settings;
  const usableWidth = SHEET_WIDTH - 2 * margin;
  const usableHeight = SHEET_HEIGHT - 2 * margin;
  const columns = Math.floor((usableWidth + gap) / (cardWidth + gap));
  const rows = Math.floor((usableHeight + gap) / (cardHeight + gap));
  if (columns < 1 || rows < 1) {
    return {
      ok: false,
      message:
        `No card of ${cardWidth} x ${cardHeight} mm fits on the sheet ` +
        `with margin ${margin} mm`,
    };
  }
  const blockWidth = columns * cardWidth + (columns - 1) * gap;
  const blockHeight = rows * cardHeight + (rows - 1) * gap;
  return {
    ok: true,
    columns,
    rows,
    perPage: columns * rows,
    originX: round(margin + (usableWidth - blockWidth) / 2),
    originY: round(margin + (usableHeight - blockHeight) / 2),
  };
}

/** US-001 AC-5: where one card sits. Counts from 0; x, y are its top-left corner. */
export interface PlacedCard {
  /** Position in the list of cards, from 0. */
  index: number;
  page: number;
  row: number;
  col: number;
  x: number;
  y: number;
}

/**
 * US-001 AC-5, AC-6: places `count` cards in reading order (left to right,
 * then top to bottom), page after page.
 *
 * 0 cards give 0 pages. Unused slots stay empty. Refuses what `sheetGrid`
 * refuses.
 */
export function placeCards(
  count: number,
  settings: SheetSettings,
):
  | {ok: true; pages: number; cards: PlacedCard[]}
  | {ok: false; message: string} {
  const grid = sheetGrid(settings);
  if (!grid.ok) return grid;
  const cards: PlacedCard[] = [];
  for (let index = 0; index < count; index++) {
    const slot = index % grid.perPage;
    const row = Math.floor(slot / grid.columns);
    const col = slot % grid.columns;
    cards.push({
      index,
      page: Math.floor(index / grid.perPage),
      row,
      col,
      x: round(grid.originX + col * (settings.cardWidth + settings.gap)),
      y: round(grid.originY + row * (settings.cardHeight + settings.gap)),
    });
  }
  return {ok: true, pages: Math.ceil(count / grid.perPage), cards};
}

/** US-001 AC-7: one cut mark, a straight line from (x1, y1) to (x2, y2). */
export interface CutMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** US-001 AC-7: the side of the block a group of ticks belongs to. */
export type MarkSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * US-001 AC-7: the cut marks of one page and the sides left without any.
 *
 * A vertical tick above and below the block at the x of every card edge, a
 * horizontal tick left and right of it at the y of every card edge; edges
 * that coincide (gap 0) give one tick. A tick is 3 mm long and starts 1 mm
 * outside the block; a side whose ticks would end closer than 3 mm to the
 * sheet edge gets none and is listed as omitted. Cut marks off, or settings
 * that make no grid, give no ticks and nothing omitted (the grid's own
 * refusal is reported by `sheetGrid`).
 */
export function cutMarks(settings: SheetSettings): {
  marks: CutMark[];
  omittedSides: MarkSide[];
} {
  const none = {marks: [], omittedSides: []};
  if (!settings.cutMarks) return none;
  const grid = sheetGrid(settings);
  if (!grid.ok) return none;

  const xs = new Set<number>();
  for (let c = 0; c < grid.columns; c++) {
    const left = grid.originX + c * (settings.cardWidth + settings.gap);
    xs.add(round(left));
    xs.add(round(left + settings.cardWidth));
  }
  const ys = new Set<number>();
  for (let r = 0; r < grid.rows; r++) {
    const top = grid.originY + r * (settings.cardHeight + settings.gap);
    ys.add(round(top));
    ys.add(round(top + settings.cardHeight));
  }
  const reach = TICK_OFFSET + TICK_LENGTH;
  const left = grid.originX;
  const top = grid.originY;
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);

  const marks: CutMark[] = [];
  const omittedSides: MarkSide[] = [];
  const fits = (distanceToEdge: number): boolean =>
    distanceToEdge >= TICK_EDGE_MIN - 1e-9;

  if (fits(top - reach)) {
    for (const x of xs)
      marks.push({
        x1: x,
        y1: round(top - reach),
        x2: x,
        y2: round(top - TICK_OFFSET),
      });
  } else omittedSides.push('top');
  if (fits(SHEET_HEIGHT - (bottom + reach))) {
    for (const x of xs)
      marks.push({
        x1: x,
        y1: round(bottom + TICK_OFFSET),
        x2: x,
        y2: round(bottom + reach),
      });
  } else omittedSides.push('bottom');
  if (fits(left - reach)) {
    for (const y of ys)
      marks.push({
        x1: round(left - reach),
        y1: y,
        x2: round(left - TICK_OFFSET),
        y2: y,
      });
  } else omittedSides.push('left');
  if (fits(SHEET_WIDTH - (right + reach))) {
    for (const y of ys)
      marks.push({
        x1: round(right + TICK_OFFSET),
        y1: y,
        x2: round(right + reach),
        y2: y,
      });
  } else omittedSides.push('right');
  return {marks, omittedSides};
}
