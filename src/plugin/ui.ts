// US-008 AC-5, AC-6 (SCAR-013, SCAR-014, SCAR-031): the command's check
// callback, the file explorer's menus and the replace confirmation, over
// structural parts of Obsidian's API. No Obsidian import: `main.ts` hands over
// the real `Modal` class. Every key of the dialog is decided by `dialogKey`.
import {
  dialogKey,
  replaceDialog,
  type DialogButton,
  type ReplaceDialog,
} from '../core/run/confirm';
import type {SelectedItem} from '../core/run/select';
import type {createCardCommands, DeckFile} from './commands';

type Commands = ReturnType<typeof createCardCommands>;

/** The part of a note file the check callback reads (Obsidian's `TFile`). */
export interface ActiveFile {
  path: string;
  basename: string;
  extension: string;
}

/**
 * US-008 | AC-5: A `checkCallback` for the deck command. Checking answers
 * whether the active file is a Markdown note and runs nothing; otherwise it
 * runs the command for a note and answers whether it did.
 */
export function toCheckCallback(
  command: Commands['deckCommand'],
  active: () => ActiveFile | null,
): (checking: boolean) => boolean {
  return (checking) => {
    const file = active();
    const deck: DeckFile | null =
      file === null
        ? null
        : {path: file.path, name: file.basename, extension: file.extension};
    if (deck === null || !command.check(deck)) return false;
    if (!checking) void command.run(deck);
    return true;
  };
}

/** US-008 | AC-5: files and folders chosen in the explorer as selected items (a folder has children). */
export function selectionOf(files: readonly {path: string}[]): SelectedItem[] {
  return files.map((file) => ({path: file.path, isFolder: 'children' in file}));
}

/** The part of a menu item the entries use (Obsidian's `MenuItem`). */
interface ItemLike {
  setTitle(title: string): ItemLike;
  setIcon(icon: string): ItemLike;
  onClick(click: () => void): ItemLike;
}
/** The part of a menu the entries use (Obsidian's `Menu`). */
interface MenuLike {
  addItem(build: (item: ItemLike) => void): unknown;
}

/** One menu item per entry; building reads nothing, a click runs the selection. */
function addEntries(
  commands: Commands,
  menu: MenuLike,
  files: readonly {path: string}[],
): void {
  for (const entry of commands.menuEntries(selectionOf(files))) {
    menu.addItem((item) =>
      item
        .setTitle(entry.title)
        .setIcon('layout-grid')
        .onClick(() => void entry.run()),
    );
  }
}

/** US-008 | AC-5: the `file-menu` handler (one file or folder). */
export function onFileMenu(
  commands: Commands,
): (menu: MenuLike, file: {path: string}) => void {
  return (menu, file) => addEntries(commands, menu, [file]);
}

/** US-008 | AC-5: the `files-menu` handler (several files and folders). */
export function onFilesMenu(
  commands: Commands,
): (menu: MenuLike, files: {path: string}[]) => void {
  return (menu, files) => addEntries(commands, menu, files);
}

/** The part of an element the dialog uses (Obsidian's `HTMLElement` helpers). */
interface ElementLike {
  createEl(tag: 'p' | 'button', options?: {text?: string}): ElementLike;
  addEventListener(type: string, listener: (event: Event) => void): void;
  focus(): void;
  empty(): void;
}
/** The part of Obsidian's `Modal` the dialog uses. */
interface ModalLike {
  contentEl: ElementLike;
  open(): void;
  close(): void;
  onOpen(): void;
  onClose(): void;
}

/**
 * US-008 | AC-6: The confirmation over Obsidian's `Modal` class (`Base`). It
 * draws `replaceDialog` (both files, `Replace` and `Cancel`, the focus on
 * `Cancel`), passes every key to `dialogKey` and answers `false` when it is
 * closed in any other way (the close button, a click outside). The first
 * answer counts.
 */
export function confirmReplaceWith<App>(
  Base: new (app: App) => ModalLike,
): (app: App, files: string[]) => Promise<boolean> {
  return (app, files) => confirmDialogWith(Base)(app, replaceDialog(files));
}

/**
 * US-008 | AC-6, US-007 | AC-9: The confirmation over Obsidian's `Modal` class for any
 * dialog data (`replaceDialog`, `resetDialog`): the question, the two buttons by their own
 * names, the focus on the safe one, every key decided by `dialogKey`, a close in any other
 * way answers `false`, the first answer counts.
 */
export function confirmDialogWith<App>(
  Base: new (app: App) => ModalLike,
): (app: App, dialog: ReplaceDialog) => Promise<boolean> {
  return (app, dialog) =>
    new Promise<boolean>((resolve) => {
      const modal = new Base(app);
      let answered = false;
      let focus: DialogButton = dialog.focus;
      const answer = (replace: boolean): void => {
        if (answered) return;
        answered = true;
        resolve(replace);
      };
      modal.onOpen = () => {
        const content = modal.contentEl;
        content.createEl('p', {text: dialog.message});
        const replace = content.createEl('button', {text: dialog.replaceLabel});
        const cancel = content.createEl('button', {text: dialog.cancelLabel});
        replace.addEventListener('focus', () => (focus = 'replace'));
        cancel.addEventListener('focus', () => (focus = 'cancel'));
        replace.addEventListener('click', () => {
          answer(true);
          modal.close();
        });
        cancel.addEventListener('click', () => {
          answer(false);
          modal.close();
        });
        content.addEventListener('keydown', (event) => {
          const action = dialogKey(event as KeyboardEvent, focus);
          if (action === 'none') return;
          answer(action === 'replace');
          modal.close();
        });
        (dialog.focus === 'cancel' ? cancel : replace).focus();
      };
      modal.onClose = () => {
        answer(false);
        modal.contentEl.empty();
      };
      modal.open();
    });
}
