// US-005 AC-4, AC-5, AC-7, AC-8, AC-9 (SCAR-014, SCAR-016, SCAR-022, SCAR-031):
// the runner the commands call. Every decision lives here, with injected
// dependencies; `main.ts` (US-008) only builds the dependencies. Settings, the
// output folder and what exists in it are read when a run starts, never earlier.
import {planDeck} from '../core/run/deck';
import {outputNames, runName} from '../core/run/names';
import {checkOutputFolder} from '../core/run/output';
import {warningsFile} from '../core/run/report';
import {runCards, type CompileExtra} from '../core/run/run';
import {expandSelection, type SelectedItem} from '../core/run/select';
import {checkCardsSettings, type CardsSettings} from '../core/run/settings';
import type {CardWarning} from '../core/skill/read';
import type {DiskWriter} from './disk-writer';
import {
  firstProblemSection,
  sectionTitle,
  type SectionId,
} from './settings/sections';
import {RUN} from './strings';

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
  /**
   * US-004 AC-3: Obsidian2Typst's API object as the plugin has it now, or
   * anything else; read at each run, never kept. Optional: without it creature
   * cards are refused.
   */
  statblockApi?(): unknown;
  /**
   * Compiles Typst: the PDF (null when none), the fit facts, a message. `extra`
   * (US-004 AC-12) is the files and fonts of a creature sheet, for this compile.
   */
  compile(
    source: string,
    extra?: CompileExtra,
  ): Promise<{
    pdf: Uint8Array | null;
    facts: unknown[];
    message?: string;
  }>;
  /**
   * US-010 AC-4: the faces of the compile's fonts (the compile service's
   * answer: the faces, or why there are none). Optional: without it there is no
   * glyph check.
   */
  coverage?(
    fonts: readonly Uint8Array[],
  ): Promise<
    | {ok: true; faces: {family: string; coverage: number[]}[]}
    | {ok: false; message: string}
  >;
  /** True when the path (the output folder) is a file. */
  isFile(path: string): Promise<boolean>;
  /** The one writer for an output folder. */
  writerFor(folder: string): DiskWriter;
  /** Asks to replace the files (both are named); false is `Cancel`. */
  confirmReplace(files: string[]): Promise<boolean>;
  notice(text: string): void;
  /**
   * US-008 AC-4: the path of the settings file; a refusal for a setting names
   * it. Optional: without it the notices are as before.
   */
  settingsFile?(): string;
}

/** US-005 AC-9: the runner. */
export interface CardsRunner {
  runDeck(deck: {path: string; name: string}): Promise<void>;
  runSelection(items: readonly SelectedItem[]): Promise<void>;
  isRunning(): boolean;
}

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

  /**
   * US-008 AC-4, US-013 AC-11: a refusal for a setting, naming the section that holds the
   * problem and the settings file when the file is known.
   */
  const refuse = (text: string, section: SectionId): void =>
    deps.notice(
      deps.settingsFile
        ? RUN.seeSettings(text, sectionTitle(section), deps.settingsFile())
        : text,
    );

  /** The notes of a run and the warnings of finding them. */
  type Plan = {notes: string[]; warnings: CardWarning[]};

  async function go(name: string, plan: () => Promise<Plan>): Promise<void> {
    if (running) {
      deps.notice(RUN.busy);
      return;
    }
    running = true;
    try {
      const settings = await deps.settings();
      const issues = checkCardsSettings(settings, deps.vaultRoot());
      if (issues.length > 0) {
        refuse(
          RUN.cannot(issues.join('; ')),
          firstProblemSection(settings, deps.vaultRoot()) ?? 'output',
        );
        return;
      }
      const checked = checkOutputFolder(
        settings.outputFolder,
        deps.vaultRoot(),
      );
      if (!checked.ok) {
        refuse(RUN.cannot(checked.message), 'output');
        return;
      }
      const folder = checked.folder;
      if (await deps.isFile(folder)) {
        refuse(RUN.cannot(RUN.outputIsFile(folder)), 'output');
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
        deps.notice(RUN.cancelled);
        return;
      }

      const planned = await plan();
      const result = await runCards(planned.notes, settings, {
        read: (path) => deps.readNote(path),
        ...(deps.statblockApi === undefined
          ? {}
          : {statblockApi: () => deps.statblockApi?.()}),
        compile: (source, extra) => deps.compile(source, extra),
        // US-010 AC-4: a refusal of the service is the run's "coverage cannot be read".
        ...(deps.coverage === undefined
          ? {}
          : {
              coverage: async (fonts: readonly Uint8Array[]) => {
                const answer = await deps.coverage!(fonts);
                if (!answer.ok) throw new Error(answer.message);
                return answer.faces;
              },
            }),
      });
      if (!result.ok) {
        deps.notice(RUN.failed(result.message));
        return;
      }
      const warnings = [...planned.warnings, ...result.warnings];
      await writer.ensureFolder();
      await writer.writeBytes(pdfPath, result.pdf);
      await writer.writeText(reportPath, warningsFile(name, warnings));
      deps.notice(
        RUN.done(result.cards, result.pages, warnings.length, folder),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      deps.notice(RUN.failed(reason));
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
