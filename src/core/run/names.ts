// US-005 AC-6: the names of the files a run writes.
import type {SelectedItem} from './select';

/** The name used when nothing better is left. */
const FALLBACK = 'Cards';

/**
 * US-005 AC-6: the names of the PDF and of the warnings file for a run called
 * `name`: `<name> cards.pdf` and `<name> cards warnings.md`. The name loses
 * `/ \ : * ? " < > |` and leading dots, runs of spaces become one, and a name
 * that is empty after that is `Cards`.
 */
export function outputNames(name: string): {pdf: string; warnings: string} {
  const clean = name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/^\.+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const base = clean === '' ? FALLBACK : clean;
  return {pdf: `${base} cards.pdf`, warnings: `${base} cards warnings.md`};
}

/**
 * US-005 AC-6: the name of a run from the file explorer: the chosen folder's
 * name when exactly one folder is chosen, `Cards` otherwise.
 */
export function runName(items: readonly SelectedItem[]): string {
  const only = items.length === 1 ? items[0]! : null;
  if (only === null || !only.isFolder) return FALLBACK;
  const last = only.path.replace(/\/+$/, '').split('/').pop() ?? '';
  return last === '' ? FALLBACK : last;
}
