// US-001: the Typst source of the card sheet. Pure text: the geometry comes
// from `layout.ts` (the one place that knows positions, SCAR-017); this file
// only writes it down. Card content (US-002 to US-004) is added here later.
import {
  cutMarks,
  placeCards,
  type PlacedCard,
  type SheetSettings,
} from './layout';

/** US-001 AC-9: stroke of a card frame and of a cut mark, in pt. */
const STROKE_PT = 0.2;

/** A millimetre value as Typst length text, rounded to 1e-4 mm, no `-0`. */
export function mm(value: number): string {
  const rounded = Math.round(value * 1e4) / 1e4;
  return `${Object.is(rounded, -0) ? 0 : rounded}mm`;
}

/** What a card shows besides its frame (US-002): set-up code and per-card code. */
export interface SheetContent {
  /** Typst code after the page set-up: set rules and helper definitions. */
  prelude?: string;
  /** Typst code for one card, placed inside the sheet; given its position. */
  card?: (card: PlacedCard) => string;
  /** Typst code for a whole page, given its number (from 0) and its cards (US-004 AC-9). */
  page?: (page: number, cards: readonly PlacedCard[]) => string;
}

/**
 * US-001 AC-5, AC-7, AC-9, AC-10: the Typst source of a sheet of `count`
 * card frames with cut marks; US-002: with the card content that `content`
 * gives (none: empty frames).
 *
 * A4 pages without margin (the safe margin is the geometry's job), one
 * `place` per frame and per cut mark, a page break between pages. The source
 * starts with `#set document(date: none)`: without it Typst writes the
 * current time into the PDF and two runs differ (measured, spike-typst.md).
 * 0 cards and invalid settings give a refusal with its message, not a source.
 */
export function sheetTypst(
  count: number,
  settings: SheetSettings,
  content: SheetContent = {},
): {ok: true; source: string} | {ok: false; message: string} {
  if (count === 0) return {ok: false, message: 'There are no cards to print'};
  const placed = placeCards(count, settings);
  if (!placed.ok) return placed;
  const marks = cutMarks(settings).marks;

  const lines = [
    '#set document(date: none)',
    '#set page(width: 210mm, height: 297mm, margin: 0pt)',
  ];
  if (content.prelude !== undefined) lines.push(content.prelude);
  for (let page = 0; page < placed.pages; page++) {
    if (page > 0) lines.push('#pagebreak()');
    for (const card of placed.cards.filter((c) => c.page === page)) {
      lines.push(
        `#place(top + left, dx: ${mm(card.x)}, dy: ${mm(card.y)}, ` +
          `rect(width: ${mm(settings.cardWidth)}, ` +
          `height: ${mm(settings.cardHeight)}, stroke: ${STROKE_PT}pt))`,
      );
      if (content.card !== undefined) lines.push(content.card(card));
    }
    if (content.page !== undefined) {
      const onPage = placed.cards.filter((c) => c.page === page);
      const code = content.page(page, onPage);
      if (code !== '') lines.push(code);
    }
    for (const t of marks) {
      lines.push(
        `#place(top + left, dx: ${mm(t.x1)}, dy: ${mm(t.y1)}, ` +
          `line(start: (0mm, 0mm), end: (${mm(t.x2 - t.x1)}, ` +
          `${mm(t.y2 - t.y1)}), stroke: ${STROKE_PT}pt))`,
      );
    }
  }
  return {ok: true, source: `${lines.join('\n')}\n`};
}
