// US-013 AC-2, AC-3, AC-5 (SCAR-013, SCAR-016, SCAR-031, SCAR-033): the run dialog's rules
// as pure functions: the destination line, when the button is enabled, what a key does,
// and the values saved when the run starts. No Obsidian import; the dialog only calls these.
import {isComposing, type KeyEvent} from '../../core/run/confirm';
import {checkOutputFolder} from '../../core/run/output';
import {
  loadFile,
  save,
  serial,
  type CommitResult,
  type SettingsStore,
} from '../settings/commit';
import {readSelection, type SavedSelection} from './selection';

const twoDigits = (n: number): string => String(n).padStart(2, '0');

/**
 * US-013 | AC-3: The grey line under the folder: what the run will do with the PDF named
 * `pdfName` (`Cards cards.pdf`). Without a file there: `… will be created.`; with one, its
 * modification time as local `YYYY-MM-DD HH:MM` and the question to come (O3).
 */
export function destinationLine(
  pdfName: string,
  modified: Date | null,
): string {
  if (modified === null) return `${pdfName} will be created.`;
  const stamp =
    `${modified.getFullYear()}-${twoDigits(modified.getMonth() + 1)}-` +
    `${twoDigits(modified.getDate())} ${twoDigits(modified.getHours())}:` +
    `${twoDigits(modified.getMinutes())}`;
  return `${pdfName} exists (from ${stamp}) and will be replaced after a question.`;
}

/**
 * US-013 | AC-2: Whether `Create cards` is enabled: the folder passes its check and at
 * least one note is checked.
 */
export function canRun(folder: {ok: boolean}, checked: number): boolean {
  return folder.ok && checked > 0;
}

/**
 * US-013 | AC-5 (SCAR-013): What a key does in the run dialog: nothing while an input
 * method composes; Escape cancels; Enter runs when the button is enabled and does
 * nothing otherwise; every other key does nothing here.
 */
export function runDialogKey(
  event: KeyEvent,
  enabled: boolean,
): 'run' | 'cancel' | 'none' {
  if (isComposing(event)) return 'none';
  if (event.key === 'Escape') return 'cancel';
  if (event.key === 'Enter') return enabled ? 'run' : 'none';
  return 'none';
}

/**
 * US-013 | AC-5 (SCAR-016, SCAR-033): Saves the dialog's choices when the run starts.
 *
 * The folder goes through `checkOutputFolder` first; a refused folder writes nothing and
 * answers the check's message. Otherwise the file is loaded now (a hand edit made
 * meanwhile is kept), `outputFolder` is set to the folder's normal form and `selection`
 * to `'all'` or a copy of the list, every other key is kept, and the file is written
 * once. Runs in the store's queue, after every earlier change.
 */
export function saveRunChoices(
  deps: {store: SettingsStore; vaultRoot(): string},
  choices: {outputFolder: string; selection: SavedSelection},
): Promise<CommitResult> {
  return serial(deps.store, async () => {
    const folder = checkOutputFolder(choices.outputFolder, deps.vaultRoot());
    if (!folder.ok) return {ok: false, message: folder.message};
    const file = await loadFile(deps.store);
    if (typeof file === 'string') return {ok: false, message: file};
    file.outputFolder = folder.folder;
    file.selection =
      choices.selection === 'all' ? 'all' : [...choices.selection];
    return save(deps.store, file);
  });
}

/**
 * US-013 | AC-4: `Save selection`: writes only `selection` (loaded now, every other key
 * kept, one write, in the store's queue).
 */
export function saveSelection(
  deps: {store: SettingsStore},
  selection: SavedSelection,
): Promise<CommitResult> {
  return serial(deps.store, async () => {
    const file = await loadFile(deps.store);
    if (typeof file === 'string') return {ok: false, message: file};
    file.selection = selection === 'all' ? 'all' : [...selection];
    return save(deps.store, file);
  });
}

/**
 * US-013 | AC-6: Applies `change` (a `followRename` or `followDelete`) to the stored
 * selection. Writes only when the selection changed; a selection that became empty is
 * removed from the file. Loaded now, every other key kept, in the store's queue.
 */
export function updateSelection(
  deps: {store: SettingsStore},
  change: (saved: SavedSelection | null) => SavedSelection | null,
): Promise<CommitResult> {
  return serial(deps.store, async () => {
    const file = await loadFile(deps.store);
    if (typeof file === 'string') return {ok: false, message: file};
    const before = readSelection(file.selection);
    const after = change(before);
    if (JSON.stringify(after) === JSON.stringify(before)) {
      return {ok: true, warnings: []};
    }
    if (after === null || (after !== 'all' && after.length === 0)) {
      delete file.selection;
    } else {
      file.selection = after === 'all' ? 'all' : [...after];
    }
    return save(deps.store, file);
  });
}
