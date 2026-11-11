// Test support: text cards of any kind put on a sheet, compiled and read back
// (US-003). The helper `makeSheet` is the one place the spell and mixed-sheet
// tests compile cards and cut the PDF's text runs by card.
import {
  placeCards,
  type SheetSettings,
  DEFAULT_SHEET,
} from '../../src/core/sheet/layout';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {FIT_LABEL} from '../../src/core/skill/fit';
import type {SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SIZES, type CardSizes} from '../../src/core/skill/settings';
import {runsIn, textOf} from './card-pdf';
import {openPdf} from './pdf/reader';
import {pageRuns, type TextRun} from './pdf/text';
import {compileWithFacts} from './typst-node';

/** Compiles `cards` onto a sheet; returns pages' runs, the facts and helpers. */
export async function makeSheet(
  cards: SkillCard[],
  sheet: SheetSettings = DEFAULT_SHEET,
  sizes: CardSizes = DEFAULT_SIZES,
) {
  const typst = cardSheetTypst(cards, sheet, sizes);
  if (!typst.ok) throw new Error(typst.message);
  const {pdf, facts, diagnostics} = await compileWithFacts(
    typst.source,
    FIT_LABEL,
  );
  const placed = placeCards(cards.length, sheet);
  if (!placed.ok) throw new Error(placed.message);
  const pages = pageRuns(openPdf(pdf));
  const runsOf = (i: number): TextRun[] => {
    const c = placed.cards[i]!;
    return runsIn(pages[c.page] ?? [], {
      x: c.x,
      y: c.y,
      w: sheet.cardWidth,
      h: sheet.cardHeight,
    });
  };
  return {
    pdf,
    facts,
    diagnostics,
    pages,
    placed: placed.cards,
    runsOf,
    textOf: (i: number) => textOf(runsOf(i)),
  };
}
