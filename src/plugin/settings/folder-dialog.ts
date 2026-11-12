// US-007 AC-5, D1, D13: the system's folder dialog. Measured in the author's Obsidian
// (M03: Electron 43.8.4, Obsidian 1.15.0): `electron.remote.dialog` (A) and
// `@electron/remote`'s `dialog` (B) give an absolute path for a folder with files and for
// an empty one, and `canceled: true` for a cancel. A is tried first, then B; when neither
// is there the button is not shown. Where the dialog starts (`defaultPath`) is NOT measured
// in Obsidian yet (M04). Pure functions over an injected `require`: no Electron import.

import type {CommitResult} from './commit';

/** The part of the page's environment the dialog needs: `window.require`. */
export interface DialogEnv {
  require?: (id: string) => unknown;
}

interface Dialog {
  showOpenDialog(options: {
    properties: string[];
    defaultPath: string;
  }): Promise<{canceled: boolean; filePaths: string[]}>;
}

/** The answer of `chooseFolder`. */
export type FolderChoice =
  {kind: 'chosen'; path: string} | {kind: 'cancelled'} | {kind: 'unavailable'};

const isDialog = (value: unknown): value is Dialog =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as {showOpenDialog?: unknown}).showOpenDialog === 'function';

/** The module `id`, or undefined when there is no `require` or the module is not there. */
function load(env: DialogEnv, id: string): unknown {
  try {
    return env.require?.(id);
  } catch {
    return undefined;
  }
}

/** The dialogs found, A (`electron.remote.dialog`) first, then B (`@electron/remote`). */
function dialogsOf(env: DialogEnv): Dialog[] {
  const electron = load(env, 'electron') as
    {remote?: {dialog?: unknown}} | undefined;
  const remote = load(env, '@electron/remote') as
    {dialog?: unknown} | undefined;
  return [electron?.remote?.dialog, remote?.dialog].filter(isDialog);
}

/**
 * US-007 | AC-5: whether a dialog could open (A or B is there). Nothing is opened by asking;
 * the tab shows `Choose folder…` only when this is true.
 */
export const folderDialogAvailable = (env: DialogEnv): boolean =>
  dialogsOf(env).length > 0;

/**
 * US-007 | AC-5, D13: opens the system's folder dialog at `startAt`, asking for a directory.
 *
 * A first; a dialog that throws is skipped and the next is tried; the first one that answers
 * decides. A cancel (or an answer without a path) is `cancelled`, not an error, and B is not
 * asked after it. When no dialog could answer: `unavailable`. The path is only the dialog's
 * answer: the caller commits it through `commitSetting`, which classifies it (SCAR-033).
 */
export async function chooseFolder(
  env: DialogEnv,
  startAt: string,
): Promise<FolderChoice> {
  for (const dialog of dialogsOf(env)) {
    try {
      const answer = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        defaultPath: startAt,
      });
      const path = answer.filePaths[0];
      if (answer.canceled || path === undefined) return {kind: 'cancelled'};
      return {kind: 'chosen', path};
    } catch {
      continue;
    }
  }
  return {kind: 'unavailable'};
}

/** What the screen shows after the dialog: the picked path, its message, whether it was saved. */
export interface PickOutcome {
  /** The path the dialog gave (empty when there was none). */
  path: string;
  /** A refusal or a problem to show under the field; empty when there is none. */
  message: string;
  /** True when the path was saved: only then is the page drawn again. */
  saved: boolean;
}

/**
 * US-007 | AC-5 (found by M04): opens the dialog, commits the chosen path and says what the
 * screen must show.
 *
 * `startAt` is asked when the dialog opens. A cancel is `null` (nothing to show). When no dialog
 * could open the message says to type the path. A chosen path is committed through `commit`
 * (the one `commitSetting`, which classifies it, SCAR-033): refused, the outcome keeps the
 * check's message and `saved: false`, so the caller shows the message and the path and does not
 * redraw the page over them (the defect: the page was redrawn at once and the refusal vanished).
 */
export async function pickOutputFolder(deps: {
  env: DialogEnv;
  startAt(): Promise<string>;
  commit(path: string): Promise<CommitResult>;
}): Promise<PickOutcome | null> {
  const answer = await chooseFolder(deps.env, await deps.startAt());
  if (answer.kind === 'cancelled') return null;
  if (answer.kind === 'unavailable') {
    return {
      path: '',
      message: 'No folder dialog is available here: type the path',
      saved: false,
    };
  }
  const result = await deps.commit(answer.path);
  return result.ok
    ? {path: answer.path, message: '', saved: true}
    : {path: answer.path, message: result.message, saved: false};
}

/**
 * US-007 | AC-5: where the dialog starts: the stored output folder when it is not empty and
 * `exists` says it exists, otherwise the user's Documents folder under `home` (the
 * separator of `home` is kept, a trailing one is not doubled). An existence check that
 * throws counts as "does not exist". Asked when the button is clicked, not when drawn.
 */
export async function dialogStart(
  outputFolder: string,
  home: string,
  exists: (path: string) => Promise<boolean>,
): Promise<string> {
  const stored = outputFolder.trim();
  if (stored !== '') {
    try {
      if (await exists(stored)) return stored;
    } catch {
      // counts as "does not exist": the start folder is Documents
    }
  }
  const separator = home.includes('\\') && !home.includes('/') ? '\\' : '/';
  return `${home.replace(/[\\/]+$/, '')}${separator}Documents`;
}
