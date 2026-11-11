// US-005 AC-4: the run from a list of notes to PDF bytes and warnings. Pure: the
// notes are read and the Typst compiled through injected dependencies. This is
// the one place that turns notes into cards (SCAR-017): it calls the readers of
// US-002 and US-003, the sheet of US-003 and the fit warnings.
import {cardSheetTypst} from '../card/sheet';
import {placeCards} from '../sheet/layout';
import {fitWarnings} from '../skill/fit';
import {readSkill, type CardWarning, type SkillCard} from '../skill/read';
import {readSpell} from '../spell/read';
import {kindOf} from './kinds';
import {checkCardSettings, type CardsSettings} from './settings';

/** US-005 AC-4: what a run needs from the outside. */
export interface RunDeps {
  /** The text of a note; rejects when it cannot be read. */
  read(path: string): Promise<string>;
  /** Compiles Typst: the PDF (null when there is none), the `gcc-fit` facts, a message. */
  compile(source: string): Promise<{
    pdf: Uint8Array | null;
    facts: unknown[];
    message?: string;
  }>;
}

/** US-005 AC-4: the result of a run. */
export type RunResult =
  | {
      ok: true;
      pdf: Uint8Array;
      cards: number;
      pages: number;
      warnings: CardWarning[];
    }
  | {ok: false; message: string; warnings: CardWarning[]};

/** The compiler's message cut at its first line (a diagnostic can carry a trace). */
const firstLine = (text: string): string => text.split('\n')[0] ?? '';

/**
 * US-005 AC-4: makes the cards of `notes`, in order, and compiles the sheet.
 *
 * A note without a kind (`CARD_KIND_UNKNOWN`) is not read; a note that cannot
 * be read gives `NOTE_UNREADABLE` (detail: the reason); the other cards are
 * still made (rule 8). The warnings are the notes' own in note order, then the
 * fit warnings in card order. No card gives `There are no cards to print` (the
 * sheet's own refusal) without a compile; a compile without a PDF gives its first diagnostic and no
 * PDF. Invalid card settings are refused before any note is read.
 */
export async function runCards(
  notes: readonly string[],
  settings: CardsSettings,
  deps: RunDeps,
): Promise<RunResult> {
  const issues = checkCardSettings(settings);
  if (issues.length > 0)
    return {ok: false, message: issues.join('; '), warnings: []};

  const warnings: CardWarning[] = [];
  const cards: SkillCard[] = [];
  for (const path of notes) {
    const kind = kindOf(path, settings.kindRules);
    if (kind === null) {
      warnings.push({code: 'CARD_KIND_UNKNOWN', path, detail: ''});
      continue;
    }
    let text: string;
    try {
      text = await deps.read(path);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      warnings.push({code: 'NOTE_UNREADABLE', path, detail: reason});
      continue;
    }
    const read =
      kind === 'skill'
        ? readSkill(path, text, settings.skill)
        : readSpell(path, text, settings.spell);
    cards.push(read.card);
    warnings.push(...read.warnings);
  }
  const sheet = cardSheetTypst(cards, settings.sheet, settings.skill);
  if (!sheet.ok) return {ok: false, message: sheet.message, warnings};
  const compiled = await deps.compile(sheet.source);
  if (compiled.pdf === null) {
    return {
      ok: false,
      message: firstLine(compiled.message ?? 'The compiler gave no PDF'),
      warnings,
    };
  }
  warnings.push(...fitWarnings(compiled.facts, cards));

  const placed = placeCards(cards.length, settings.sheet);
  return {
    ok: true,
    pdf: compiled.pdf,
    cards: cards.length,
    pages: placed.ok ? placed.pages : 0,
    warnings,
  };
}
