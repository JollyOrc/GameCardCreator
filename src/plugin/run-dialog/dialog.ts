// US-013 AC-1 to AC-5 (SCAR-013, SCAR-016, SCAR-031, SCAR-033): the run dialog over
// Obsidian's `Modal` class, handed in by `main.ts` (this file imports no Obsidian module).
// It only builds the elements and calls the tested functions of `selection.ts` and
// `rules.ts`; the layout (a side panel beside the dialog) is the one measured in M11.
// Measured in Obsidian by the manual check of #57.
import {outputNames, runName} from '../../core/run/names';
import {checkOutputFolder} from '../../core/run/output';
import type {SelectedItem} from '../../core/run/select';
import {readSettingsFile} from '../settings-file';
import type {SettingsStore} from '../settings/commit';
import {
  chooseFolder,
  dialogStart,
  folderDialogAvailable,
  type DialogEnv,
} from '../settings/folder-dialog';
import {DIALOG} from '../strings';
import {
  canRun,
  destinationLine,
  runDialogKey,
  saveRunChoices,
  saveSelection,
} from './rules';
import {
  buildTree,
  checkable,
  initialChecked,
  plannedSavedRun,
  readSelection,
  runItems,
  saveForm,
  toggle,
  type TreeNode,
} from './selection';

/** The parts of Obsidian's `Modal` the dialog uses. */
export interface DialogModalLike {
  containerEl: HTMLElement;
  modalEl: HTMLElement;
  titleEl: HTMLElement;
  contentEl: HTMLElement;
  open(): void;
  close(): void;
  onOpen(): void;
  onClose(): void;
}

/** What `main.ts` hands to the dialog and to the saved-selection command. */
export interface RunDialogDeps {
  store: SettingsStore;
  vaultRoot(): string;
  /** The vault's file paths now. */
  paths(): string[];
  /** The modification time of a file on disk, or null (`modifiedAt` of the disk writer). */
  modifiedAt(path: string): Promise<Date | null>;
  folderEnv(): DialogEnv;
  home(): string;
  exists(path: string): Promise<boolean>;
  openSettings(): void;
  /** Starts the run of these notes (the runner's `runSelection`). */
  run(items: SelectedItem[]): Promise<void>;
  notice(text: string): void;
}

/** The file as it is now: the settings and the raw `selection` value. */
async function readNow(store: SettingsStore): Promise<{
  settings: ReturnType<typeof readSettingsFile>['settings'];
  selection: unknown;
}> {
  let raw: unknown;
  try {
    raw = await store.read();
  } catch {
    raw = null;
  }
  const selection =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>).selection
      : undefined;
  return {settings: readSettingsFile(raw).settings, selection};
}

/**
 * US-013 | AC-1: The command "Create cards from the saved selection": the saved notes
 * that are checkable now are run at once, without the dialog; with none, the notice
 * `NOTHING_SELECTED`. The file and the vault are read at the call (SCAR-016).
 */
export async function runSavedSelection(deps: RunDialogDeps): Promise<void> {
  const {settings, selection} = await readNow(deps.store);
  const tree = buildTree(deps.paths(), settings.kindRules);
  const planned = plannedSavedRun(readSelection(selection), tree);
  if (!planned.ok) {
    deps.notice(planned.notice);
    return;
  }
  await deps.run(planned.items);
}

/** A path in `folder`, with the separator the folder uses (as the runner joins it). */
const inFolder = (folder: string, name: string): string =>
  `${folder}${folder.includes('\\') && !folder.includes('/') ? '\\' : '/'}${name}`;

/**
 * US-013 | AC-2 to AC-5: Opens the run dialog, drawn from the file and the vault as they
 * are now. The folder field, `Choose folder…` (only where a system dialog exists) and
 * `Create cards` sit in one row; under it the folder's refusal (red) and what is at the
 * destination (grey), both made again on every change; a `More options` button opens the
 * settings. Beside the dialog, the selection panel with the tree and `Save selection`.
 * Enter runs when `Create cards` is enabled (`runDialogKey`); Escape, the X and a click
 * outside close it and save nothing. On run: the choices are saved (`saveRunChoices`),
 * then the notes are run in the order of the cards.
 */
export async function openRunDialog<App>(
  Base: new (app: App) => DialogModalLike,
  app: App,
  deps: RunDialogDeps,
): Promise<void> {
  const {settings, selection} = await readNow(deps.store);
  const tree = buildTree(deps.paths(), settings.kindRules);
  let checked = initialChecked(tree, readSelection(selection));
  let enabled = false;
  let started = false;
  let lineToken = 0;
  const modal = new Base(app);
  const boxes = new Map<string, {box: HTMLInputElement; node: TreeNode}>();
  let panel: HTMLElement | null = null;

  const field = document.createElement('input');
  field.type = 'text';
  field.className = 'gcc-dest-input';
  field.placeholder = DIALOG.folderPlaceholder;
  field.value = settings.outputFolder;
  const runButton = document.createElement('button');
  runButton.className = 'mod-cta';
  runButton.textContent = DIALOG.run;
  const error = document.createElement('div');
  error.className = 'gcc-error';
  const line = document.createElement('div');
  line.className = 'setting-item-description gcc-dest-line';

  /** US-013 | AC-2, AC-3 (SCAR-016): the button, the red line and the grey line from now. */
  const update = (): void => {
    const folder = checkOutputFolder(field.value, deps.vaultRoot());
    error.textContent = folder.ok ? '' : folder.message;
    enabled = canRun(folder, runItems(checked, tree).length);
    runButton.disabled = !enabled;
    const token = ++lineToken;
    if (!folder.ok) {
      line.textContent = '';
      return;
    }
    const pdf = outputNames(runName(runItems(checked, tree))).pdf;
    void deps.modifiedAt(inFolder(folder.folder, pdf)).then((modified) => {
      if (token === lineToken)
        line.textContent = destinationLine(pdf, modified);
    });
  };

  /** US-013 | AC-4: every checkbox shows `checked` (a folder: all, some or none below). */
  const sync = (): void => {
    for (const {box, node} of boxes.values()) {
      if (!node.isFolder) {
        box.checked = checked.has(node.path);
        continue;
      }
      const below = checkable(node);
      const on = below.filter((p) => checked.has(p)).length;
      box.checked = below.length > 0 && on === below.length;
      box.indeterminate = on > 0 && on < below.length;
    }
  };

  const checkbox = (node: TreeNode, into: HTMLElement): HTMLInputElement => {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.disabled = !node.isFolder && node.kind === null;
    box.addEventListener('change', () => {
      checked = toggle(checked, node, box.checked);
      sync();
      update();
    });
    into.appendChild(box);
    boxes.set(node.path === '' ? '\u0000root' : node.path, {box, node});
    return box;
  };

  /** US-013 | AC-4: one entry of the tree; folders start collapsed. */
  const drawNode = (node: TreeNode, into: HTMLElement): void => {
    if (node.isFolder) {
      const details = document.createElement('details');
      details.className = 'gcc-tree-folder';
      const summary = document.createElement('summary');
      checkbox(node, summary);
      summary.appendChild(document.createTextNode(` ${node.name}`));
      details.appendChild(summary);
      const children = document.createElement('div');
      children.className = 'gcc-tree-children';
      for (const child of node.children) drawNode(child, children);
      details.appendChild(children);
      into.appendChild(details);
      return;
    }
    const row = document.createElement('label');
    row.className =
      node.kind === null ? 'gcc-tree-note gcc-no-kind' : 'gcc-tree-note';
    checkbox(node, row);
    row.appendChild(document.createTextNode(` ${node.name} `));
    const tag = document.createElement('span');
    tag.className = 'gcc-kind-tag';
    tag.textContent = node.kind ?? DIALOG.noKind;
    row.appendChild(tag);
    into.appendChild(row);
  };

  /** US-013 | AC-4: the panel beside the dialog: title, Select all, the tree, Save selection. */
  const drawPanel = (): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'modal gcc-selection-panel';
    const title = document.createElement('div');
    title.className = 'gcc-panel-title';
    title.textContent = DIALOG.treeTitle;
    el.appendChild(title);
    const scroll = document.createElement('div');
    scroll.className = 'gcc-tree';
    const all = document.createElement('label');
    all.className = 'gcc-tree-note gcc-select-all';
    checkbox(tree, all);
    all.appendChild(document.createTextNode(` ${DIALOG.selectAll}`));
    scroll.appendChild(all);
    for (const child of tree.children) drawNode(child, scroll);
    el.appendChild(scroll);
    const save = document.createElement('button');
    save.textContent = DIALOG.saveSelection;
    save.addEventListener('click', () => {
      void saveSelection({store: deps.store}, saveForm(checked, tree)).then(
        (result) =>
          deps.notice(result.ok ? DIALOG.selectionSaved : result.message),
      );
    });
    el.appendChild(save);
    return el;
  };

  /** US-013 | AC-5: saves the choices, then runs; only once, only when enabled. */
  const go = async (): Promise<void> => {
    if (!enabled || started) return;
    started = true;
    const items = runItems(checked, tree);
    const chosen = saveForm(checked, tree);
    modal.close();
    const saved = await saveRunChoices(
      {store: deps.store, vaultRoot: () => deps.vaultRoot()},
      {outputFolder: field.value, selection: chosen},
    );
    if (!saved.ok) {
      deps.notice(saved.message);
      return;
    }
    await deps.run(items);
  };

  modal.onOpen = () => {
    modal.modalEl.addClass('gcc-run-dialog');
    modal.titleEl.setText(DIALOG.title);
    const row = modal.contentEl.createDiv({cls: 'gcc-dest-row'});
    row.appendChild(field);
    const env = deps.folderEnv();
    if (folderDialogAvailable(env)) {
      const choose = row.createEl('button', {text: DIALOG.chooseFolder});
      choose.addEventListener('click', () => {
        void (async () => {
          const start = await dialogStart(field.value, deps.home(), (p) =>
            deps.exists(p),
          );
          const choice = await chooseFolder(env, start);
          if (choice.kind === 'chosen') {
            field.value = choice.path;
            update();
          }
        })();
      });
    }
    row.appendChild(runButton);
    modal.contentEl.appendChild(error);
    modal.contentEl.appendChild(line);
    const more = modal.contentEl.createDiv({cls: 'gcc-more-options'});
    const moreButton = more.createEl('button', {text: DIALOG.moreOptions});
    moreButton.setAttribute('aria-label', DIALOG.moreOptionsTooltip);
    moreButton.addEventListener('click', () => {
      modal.close();
      deps.openSettings();
    });
    field.addEventListener('input', update);
    runButton.addEventListener('click', () => void go());
    modal.modalEl.addEventListener('keydown', (event) => {
      if (runDialogKey(event, enabled) === 'run') {
        event.preventDefault();
        void go();
      }
    });
    panel = drawPanel();
    modal.containerEl.insertBefore(panel, modal.modalEl);
    sync();
    update();
  };
  modal.onClose = () => {
    panel?.remove();
    modal.contentEl.empty();
  };
  modal.open();
}
