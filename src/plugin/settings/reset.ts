// US-007 AC-9 (SCAR-013, SCAR-014): resetting a page of the settings screen: the question
// (data for `confirmDialogWith`) and the reset itself. The output folder and the kind rules
// are never reset by the screen.
import type {ReplaceDialog} from '../../core/run/confirm';
import {DEFAULT_CARDS} from '../../core/run/settings';
import {loadFile, save, serial, setRaw, type SettingsStore} from './commit';
import {fieldsOf, valueOf} from './fields';

/** US-007 AC-9: the pages that have a reset (the main page has none). */
export type ResetPage = 'properties' | 'layout';

/** US-007 AC-1, AC-9: the headings of the two sub pages. */
export const PAGE_TITLES: Record<ResetPage, string> = {
  properties: 'Note properties',
  layout: 'Page and text size',
};

/**
 * US-007 AC-9: the question for resetting `page`: it names the page, the buttons are `Reset`
 * and `Cancel`, and the focus is on `Cancel` (the safe choice, SCAR-014).
 */
export function resetDialog(page: ResetPage): ReplaceDialog {
  return {
    message: `Reset "${PAGE_TITLES[page]}" to its defaults?\nYour values on this page will be lost.`,
    replaceLabel: 'Reset',
    cancelLabel: 'Cancel',
    focus: 'cancel',
  };
}

/**
 * US-007 AC-9, AC-11: puts the keys of `page` back to the defaults of US-001 to US-003.
 *
 * The file is loaded now; only the keys of that page change, every other key (the output
 * folder, the kind rules, the other page, unknown keys) stays. Throws the message of a
 * failed read or write; asking first is the caller's job.
 */
export function resetPage(
  deps: {store: SettingsStore},
  page: ResetPage,
): Promise<void> {
  return serial(deps.store, async () => {
    const file = await loadFile(deps.store);
    if (typeof file === 'string') throw new Error(file);
    for (const field of fieldsOf(page)) {
      setRaw(file, field.id, valueOf(DEFAULT_CARDS, field.id));
    }
    const saved = await save(deps.store, file);
    if (!saved.ok) throw new Error(saved.message);
  });
}
