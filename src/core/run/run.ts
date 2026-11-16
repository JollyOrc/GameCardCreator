// US-005 AC-4, US-004 AC-3, AC-11, AC-12, AC-12a: the run from a list of notes to
// PDF bytes and warnings. Pure: the notes are read, Obsidian2Typst's statblock
// API is fetched and the Typst compiled through injected dependencies. This is
// the one place that turns notes into cards (SCAR-017): it calls the readers of
// US-002, US-003 and US-004, the statblock contract, the sheet and the fit
// warnings.
import {cardSheetTypst} from '../card/sheet';
import {cardCode, schemeCode} from '../card/warning';
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
import {branchesOf} from '../scheme/branches';
import {DEFAULT_ICON_CREDIT, readScheme, type SchemeRow} from '../scheme/read';
import {glyphWarnings} from '../glyph/check';
import {createCoverage, type FaceInfo} from '../glyph/coverage';
import {placeCards} from '../sheet/layout';
import {titleWarnings} from '../card/titles';
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
   * US-010 AC-3, AC-4: the faces of the fonts the compile will have: the
   * plugin's own and `fonts`, the extra fonts of a creature sheet (none: an empty
   * list). Rejects when the coverage cannot be read. Optional: without it there
   * is no glyph check and no warning.
   */
  coverage?(fonts: readonly Uint8Array[]): Promise<FaceInfo[]>;
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

/** US-009 AC-1, AC-7, AC-10: what a run takes from the scheme note. */
interface SchemeState {
  rows: SchemeRow[];
  /** The credit text for the sheet: the note's, the default when it has none, '' for no line. */
  credit: string;
}

/**
 * US-009 AC-1, AC-7, AC-10: reads the scheme note through `deps.read` (at each run,
 * never kept, SCAR-016). A note that cannot be read gives the note-unreadable warning of the scheme
 * (detail: the reason) and no rows; the reader's own warnings are returned with the
 * path. Never throws and never writes.
 */
async function readSchemeNote(
  path: string,
  deps: RunDeps,
  warnings: CardWarning[],
): Promise<SchemeState> {
  let text: string;
  try {
    text = await deps.read(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warnings.push({code: schemeCode('NOTE_UNREADABLE'), path, detail: reason});
    return {rows: [], credit: DEFAULT_ICON_CREDIT};
  }
  const read = readScheme(path, text);
  warnings.push(...read.warnings);
  return {
    rows: read.scheme.rows,
    credit: read.scheme.credit ?? DEFAULT_ICON_CREDIT,
  };
}

/**
 * US-010 AC-1, AC-3, AC-4: the glyph warnings of `cards`. Asks `deps.coverage`
 * for the faces of the compile's fonts (`fonts`: the extra fonts of the sheet,
 * none for a sheet without statblocks) and gives one warning per note whose card
 * has a character no face covers. When the faces cannot be read the result is
 * one `GLYPH_CHECK_UNAVAILABLE` warning (path empty, detail the reason: rule 8,
 * never a stop). Without a `coverage` dependency: no check, no warning.
 */
async function glyphStep(
  cards: readonly (SkillCard | CreatureCard)[],
  settings: CardsSettings,
  fonts: readonly Uint8Array[],
  deps: RunDeps,
): Promise<CardWarning[]> {
  if (deps.coverage === undefined) return [];
  try {
    const coverage = createCoverage(await deps.coverage(fonts));
    return glyphWarnings(cards, coverage.has, settings.creature);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [{code: 'GLYPH_CHECK_UNAVAILABLE', path: '', detail: reason}];
  }
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
 * made. The warnings are the notes' own in note order, then (US-010) the glyph
 * warnings in card order, then the fit warnings in card order. No card gives `There are no cards to print` (the sheet's own
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
  const schemePath = settings.schemeNote.trim();
  let scheme: SchemeState | undefined;
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
    // US-009 AC-1: the scheme is read once, just before the first skill or spell
    // note's own warnings, and only when the setting names a note.
    if (scheme === undefined && schemePath !== '') {
      scheme = await readSchemeNote(schemePath, deps, warnings);
    }
    const read =
      kind === 'skill'
        ? readSkill(path, text, settings.skill)
        : readSpell(path, text, settings.spell);
    warnings.push(...read.warnings);
    if (scheme !== undefined) {
      // US-009 AC-2, AC-6: the branches in the order of the note's tags; none, with a
      // valid row in the scheme, is one warning with the tags as written.
      const tags = read.card.rawTags ?? [];
      read.card.branches = branchesOf(tags, scheme.rows);
      if (read.card.branches.length === 0 && scheme.rows.length > 0) {
        warnings.push({
          code: cardCode(kind, 'BRANCH_UNKNOWN'),
          path,
          detail: tags.map((tag) => tag.replace(/^#/, '')).join(', '),
        });
      }
    }
    cards.push(read.card);
  }
  const sheet = cardSheetTypst(
    cards,
    settings.sheet,
    settings.skill,
    settings.creature,
    {
      iconCredit: scheme?.credit ?? '',
      // US-011 AC-1: the title settings of the kinds.
      titles: {skill: settings.skill, spell: settings.spell},
    },
  );
  if (!sheet.ok) {
    // Nothing but creature notes and no plugin: the notice says why there is no card.
    const why =
      cards.length === 0 && unavailable !== '' ? `: ${unavailable}` : '';
    return {ok: false, message: `${sheet.message}${why}`, warnings};
  }
  // US-010 AC-3, AC-5: the fonts of the compile are read once and handed both to
  // the coverage and to the compile; the glyph warnings stand after the notes' own
  // warnings and before the fit warnings.
  const fonts: Uint8Array[] =
    api !== null && api !== undefined && sheet.files.length > 0
      ? await api.compileFonts()
      : [];
  warnings.push(...(await glyphStep(cards, settings, fonts, deps)));
  if (sheet.creditOmitted !== null) {
    warnings.push({
      code: cardCode('creature', 'CREDIT_OMITTED'),
      path: '',
      detail: `bottom band ${sheet.creditOmitted} mm`,
    });
  }
  let extra: CompileExtra | undefined;
  if (api !== null && api !== undefined && sheet.files.length > 0) {
    extra = {files: sheet.files, fonts};
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
  // US-011 AC-8: the title warnings after the glyph warnings, before the fit warnings.
  warnings.push(...titleWarnings(compiled.facts, cards));
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
