// US-005 AC-7 (SCAR-013, SCAR-014): the replace confirmation as data and one key
// rule. Pure: the Obsidian dialog (US-008) draws `replaceDialog` and calls
// `dialogKey` for every key; nothing here knows a UI.

/** The two buttons of the confirmation. */
export type DialogButton = 'replace' | 'cancel';

/** What the dialog shows: the safe button has the focus when it opens. */
export interface ReplaceDialog {
  message: string;
  replaceLabel: string;
  cancelLabel: string;
  focus: DialogButton;
}

/**
 * US-005 AC-7: the confirmation for replacing `files` (both the PDF and the
 * warnings file are named): the buttons are `Replace` and `Cancel` by their own
 * names, and the focus is on `Cancel` (the safe choice, SCAR-014).
 */
export function replaceDialog(files: readonly string[]): ReplaceDialog {
  return {
    message: `These files exist and will be replaced:\n${files.join('\n')}`,
    replaceLabel: 'Replace',
    cancelLabel: 'Cancel',
    focus: 'cancel',
  };
}

/** The part of a keyboard event the rule reads. */
export interface KeyEvent {
  key: string;
  isComposing?: boolean;
  keyCode?: number;
}

/**
 * US-005 AC-7 (SCAR-013): what a key does in the confirmation. Escape cancels;
 * Enter acts on the button that has the focus; during an input-method
 * composition (`isComposing`, key code 229) nothing happens; every other key
 * does nothing here.
 */
export function dialogKey(
  event: KeyEvent,
  focus: DialogButton,
): DialogButton | 'none' {
  if (event.isComposing === true || event.keyCode === 229) return 'none';
  if (event.key === 'Escape') return 'cancel';
  if (event.key === 'Enter') return focus;
  return 'none';
}
