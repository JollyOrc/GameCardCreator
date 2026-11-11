// US-005 AC-4, AC-5, AC-7, AC-8, AC-9 (SCAR-014, SCAR-016, SCAR-022, SCAR-031):
// the runner the commands call. Every decision lives here, with injected
// dependencies; `main.ts` (US-008) only builds the dependencies. Settings, the
// output folder and what exists in it are read when a run starts, never earlier.
import {planDeck} from '../core/run/deck';
import {outputNames, runName} from '../core/run/names';
import {checkOutputFolder} from '../core/run/output';
import {warningsFile} from '../core/run/report';
import {runCards} from '../core/run/run';
import {expandSelection, type SelectedItem} from '../core/run/select';
import {checkCardsSettings, type CardsSettings} from '../core/run/settings';
import type {CardWarning} from '../core/skill/read';
import type {DiskWriter} from './disk-writer';

/** US-005 AC-9: what the runner needs from the outside. Nothing here writes the vault (AC-10). */
export interface RunnerDeps {
  /** The settings, read when the run starts. */
  settings(): Promise<CardsSettings> | CardsSettings;
  /** The vault's own folder on disk (never an output folder). */
  vaultRoot(): string;
  /** The text of a note; rejects when it cannot be read. */
  readNote(path: string): Promise<string>;
  /** Obsidian's lookup of a link target from a note. */
  resolve(
    target: string,
    deckPath: string,
  ): {path: string; isNote: boolean} | null;
  /** The paths of all notes with this name. */
  notesNamed(name: string): string[];
  /** The files below a folder of the vault. */
  notesBelow(folder: string): string[];
  /** Compiles Typst: the PDF (null when none), the fit facts, a message. */
  compile(source: string): Promise<{
    pdf: Uint8Array | null;
    facts: unknown[];
    message?: string;
  }>;
  /** True when the path (the output folder) is a file. */
  isFile(path: string): Promise<boolean>;
  /** The one writer for an output folder. */
  writerFor(folder: string): DiskWriter;
  /** Asks to replace the files (both are named); false is `Cancel`. */
  confirmReplace(files: string[]): Promise<boolean>;
  notice(text: string): void;
}

/** US-005 AC-9: the runner. */
export interface CardsRunner {
  runDeck(deck: {path: string; name: string}): Promise<void>;
  runSelection(items: readonly SelectedItem[]): Promise<void>;
  isRunning(): boolean;
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/** A path in `folder`, with the separator the folder uses. */
const inFolder = (folder: string, name: string): string =>
  `${folder}${folder.includes('\\') && !folder.includes('/') ? '\\' : '/'}${name}`;

/**
 * US-005 AC-4 to AC-9: a runner over `deps`. One run at a time; a run starts
 * with the refusals (settings, output folder), then the replace question, and
 * only then reads a note; a run that gives no PDF writes nothing.
 */
export function createCardsRunner(deps: RunnerDeps): CardsRunner {
  let running = false;

  /** The notes of a run and the warnings of finding them. */
  type Plan = {notes: string[]; warnings: CardWarning[]};

  async function go(name: string, plan: () => Promise<Plan>): Promise<void> {
    if (running) {
      deps.notice('A run of cards is already in progress');
      return;
    }
    running = true;
    try {
      const settings = await deps.settings();
      const issues = checkCardsSettings(settings, deps.vaultRoot());
      if (issues.length > 0) {
        deps.notice(`Cannot make cards: ${issues.join('; ')}`);
        return;
      }
      const checked = checkOutputFolder(
        settings.outputFolder,
        deps.vaultRoot(),
      );
      if (!checked.ok) {
        deps.notice(`Cannot make cards: ${checked.message}`);
        return;
      }
      const folder = checked.folder;
      if (await deps.isFile(folder)) {
        deps.notice(`Cannot make cards: output folder "${folder}" is a file`);
        return;
      }

      const names = outputNames(name);
      const pdfPath = inFolder(folder, names.pdf);
      const reportPath = inFolder(folder, names.warnings);
      const writer = deps.writerFor(folder);
      const exists = await Promise.all([
        writer.exists(pdfPath),
        writer.exists(reportPath),
      ]);
      if (
        exists.some(Boolean) &&
        !(await deps.confirmReplace([pdfPath, reportPath]))
      ) {
        return;
      }

      const planned = await plan();
      const result = await runCards(planned.notes, settings, {
        read: (path) => deps.readNote(path),
        compile: (source) => deps.compile(source),
      });
      if (!result.ok) {
        deps.notice(result.message);
        return;
      }
      const warnings = [...planned.warnings, ...result.warnings];
      await writer.ensureFolder();
      await writer.writeBytes(pdfPath, result.pdf);
      await writer.writeText(reportPath, warningsFile(name, warnings));
      deps.notice(
        `${plural(result.cards, 'card', 'cards')} on ${plural(result.pages, 'page', 'pages')}, ` +
          `${plural(warnings.length, 'warning', 'warnings')}. Written to ${folder}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      deps.notice(`Making cards failed: ${reason}`);
    } finally {
      running = false;
    }
  }

  return {
    isRunning: () => running,
    runDeck: (deck) =>
      go(deck.name, async () => {
        const text = await deps.readNote(deck.path);
        return planDeck(deck.path, text, {
          resolve: (target, from) => deps.resolve(target, from),
          notesNamed: (n) => deps.notesNamed(n),
        });
      }),
    runSelection: (items) =>
      go(runName(items), async () => ({
        notes: expandSelection(items, (folder) => deps.notesBelow(folder)),
        warnings: [],
      })),
  };
}
