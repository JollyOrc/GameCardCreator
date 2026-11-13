// US-005 AC-4, US-004 AC-3, AC-11, AC-12, AC-12a: the run from a list of notes to
// PDF bytes and warnings. Pure: the notes are read, Obsidian2Typst's statblock
// API is fetched and the Typst compiled through injected dependencies. This is
// the one place that turns notes into cards (SCAR-017): it calls the readers of
// US-002, US-003 and US-004, the statblock contract, the sheet and the fit
// warnings.
import {cardSheetTypst} from '../card/sheet';
import {cardCode} from '../card/warning';
import {readCreature, type CreatureCard} from '../creature/read';
import {
  checkStatblockApi,
  forwardWarnings,
  mergeFiles,
  parseAnswer,
  refusedWarning,
  unavailableWarning,
  type StatblockApi,
} from '../creature/statblock';
import {placeCards} from '../sheet/layout';
import {fitWarnings} from '../skill/fit';
import {readSkill, type CardWarning, type SkillCard} from '../skill/read';
import {readSpell} from '../spell/read';
import {kindOf} from './kinds';
import {checkCardSettings, type CardsSettings} from './settings';

/** US-004 AC-12: what one compile takes besides its source. */
export interface CompileExtra {
  files: {path: string; bytes: Uint8Array}[];
  fonts: Uint8Array[];
}

/** US-005 AC-4: what a run needs from the outside. */
export interface RunDeps {
  /** The text of a note; rejects when it cannot be read. */
  read(path: string): Promise<string>;
  /**
   * US-004 AC-3: the API object of Obsidian2Typst as the plugin has it now, or
   * anything else when there is none. Read at each run that has a creature note,
   * never kept (SCAR-016). Without it every creature card is refused.
   */
  statblockApi?(): unknown;
  /**
   * Compiles Typst: the PDF (null when there is none), the `gcc-fit` facts, a
   * message. `extra` is given only for a sheet with creature statblocks (AC-12).
   */
  compile(
    source: string,
    extra?: CompileExtra,
  ): Promise<{
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
 * US-004 AC-3, AC-11, AC-12a: gives `card` its statblock. Asks the API with the
 * note's properties and the file name; a throw or a refusal leaves the card
 * without statblock and warns once (rule 8); the answer's warnings are
 * forwarded; files that clash with those of an earlier card (one path, other
 * bytes) leave this card without statblock and warn.
 */
async function withStatblock(
  card: CreatureCard,
  api: StatblockApi,
  files: Map<string, Uint8Array>,
  warnings: CardWarning[],
): Promise<void> {
  let raw: unknown;
  try {
    raw = await api.statblockTypst(card.properties, {heading: card.name});
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warnings.push(refusedWarning(card.path, reason));
    return;
  }
  const answer = parseAnswer(raw);
  if (!answer.ok) {
    warnings.push(refusedWarning(card.path, answer.message));
    return;
  }
  const conflict = mergeFiles(files, answer, card.path);
  if (conflict !== null) {
    warnings.push(conflict);
    return;
  }
  warnings.push(...forwardWarnings(answer, card.path));
  card.statblock = answer;
}

/**
 * US-005 AC-4, US-004: makes the cards of `notes`, in order, and compiles the
 * sheet.
 *
 * A note without a kind (`CARD_KIND_UNKNOWN`) is not read; a note that cannot
 * be read gives `NOTE_UNREADABLE` (detail: the reason); the other cards are
 * still made (rule 8). A creature note asks the statblock API (fetched at the
 * first creature note); a missing or too old plugin refuses every creature
 * card once (the plugin-unavailable warning, empty path) and the other kinds are
 * made. The warnings are the notes' own in note order, then the fit warnings in
 * card order. No card gives `There are no cards to print` (the sheet's own
 * refusal, with the reason when it is a missing plugin) without a compile; a compile without a PDF gives its first
 * diagnostic and no PDF. Invalid card settings are refused before any note is
 * read. The API's fonts are asked only when a card has a statblock.
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
  const cards: (SkillCard | CreatureCard)[] = [];
  const files = new Map<string, Uint8Array>();
  let api: StatblockApi | null | undefined;
  let unavailable = '';
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
    if (kind === 'creature') {
      if (api === undefined) {
        const checked = checkStatblockApi(deps.statblockApi?.());
        api = checked.ok ? checked.api : null;
        if (!checked.ok) {
          unavailable = checked.message;
          warnings.push(unavailableWarning(checked.message));
        }
      }
      if (api === null) continue;
      const read = readCreature(path, text, settings.creature);
      warnings.push(...read.warnings);
      await withStatblock(read.card, api, files, warnings);
      cards.push(read.card);
      continue;
    }
    const read =
      kind === 'skill'
        ? readSkill(path, text, settings.skill)
        : readSpell(path, text, settings.spell);
    cards.push(read.card);
    warnings.push(...read.warnings);
  }
  const sheet = cardSheetTypst(
    cards,
    settings.sheet,
    settings.skill,
    settings.creature,
  );
  if (!sheet.ok) {
    // Nothing but creature notes and no plugin: the notice says why there is no card.
    const why =
      cards.length === 0 && unavailable !== '' ? `: ${unavailable}` : '';
    return {ok: false, message: `${sheet.message}${why}`, warnings};
  }
  if (sheet.creditOmitted !== null) {
    warnings.push({
      code: cardCode('creature', 'CREDIT_OMITTED'),
      path: '',
      detail: `bottom band ${sheet.creditOmitted} mm`,
    });
  }
  let extra: CompileExtra | undefined;
  if (api !== null && api !== undefined && sheet.files.length > 0) {
    extra = {files: sheet.files, fonts: await api.compileFonts()};
  }
  const compiled =
    extra === undefined
      ? await deps.compile(sheet.source)
      : await deps.compile(sheet.source, extra);
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
