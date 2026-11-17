// US-005 AC-2: the notes of a selection in the file explorer.

/** US-005 AC-2: one file or folder chosen in the file explorer. */
export interface SelectedItem {
  path: string;
  isFolder: boolean;
}

/** US-005 AC-2, US-013 AC-4: true for a Markdown note (`.md` in any case). */
export const isNote = (path: string): boolean => /\.md$/i.test(path);

/**
 * US-005 AC-2, US-013 AC-4: the order of the cards' notes: by path without case, then by
 * the exact path, so the order is total (`Skills/a.md`, `Skills/B.md`, `Skills/Sub/C.md`).
 * The one comparator for this order (SCAR-017); a sort callback, it changes nothing.
 */
export function byPathWithoutCase(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : a < b ? -1 : a > b ? 1 : 0;
}

/**
 * US-005 AC-2: the cards' notes of the choices, in the order of the choices: a
 * note is one card, a folder gives every note below it sorted by path without
 * case; a note that comes twice counts at its first place; files that are not
 * notes are skipped. `notesBelow(folder)` lists the files below a folder.
 */
export function expandSelection(
  items: readonly SelectedItem[],
  notesBelow: (folder: string) => string[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (path: string): void => {
    if (isNote(path) && !seen.has(path)) {
      seen.add(path);
      out.push(path);
    }
  };
  for (const item of items) {
    if (!item.isFolder) {
      add(item.path);
      continue;
    }
    const sorted = notesBelow(item.path).sort(byPathWithoutCase);
    for (const path of sorted) add(path);
  }
  return out;
}
