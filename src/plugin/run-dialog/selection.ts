// US-013 AC-1, AC-4, AC-6 (SCAR-031): the run dialog's selection tree and the saved
// selection, as pure functions over the vault's paths and the kind rules. No Obsidian
// import; the dialog and `main.ts` only call these.
import {kindOf, type KindRule, type NoteKind} from '../../core/run/kinds';
import {
  byPathWithoutCase,
  isNote,
  type SelectedItem,
} from '../../core/run/select';

/** US-013 AC-4: the saved selection: every note with a kind, or these note paths. */
export type SavedSelection = 'all' | readonly string[];

/** US-013 AC-4: one entry of the tree: a folder (with children) or a note. */
export interface TreeNode {
  /** The last part of the path; `''` for the root. */
  name: string;
  /** The vault path; `''` for the root. */
  path: string;
  isFolder: boolean;
  /** A note's card kind by the kind rules; `null` for a folder or a note without one. */
  kind: NoteKind | null;
  children: TreeNode[];
}

/** US-013 AC-1: the refusal of the saved-selection command when nothing would be made. */
export const NOTHING_SELECTED =
  'Nothing selected yet. Open "Create cards…" and choose notes.';

/**
 * US-013 | AC-4: Reads the settings file's `selection` value.
 *
 * `'all'` stays `'all'`; a list keeps its strings in their order and drops other
 * entries; an empty list (after that) or any other value is `null` (no saved selection).
 */
export function readSelection(raw: unknown): SavedSelection | null {
  if (raw === 'all') return 'all';
  if (!Array.isArray(raw)) return null;
  const list = raw.filter((x): x is string => typeof x === 'string');
  return list.length === 0 ? null : list;
}

/**
 * US-013 | AC-4: Builds the tree of the vault's Markdown notes and the folders holding them.
 *
 * Files that are not notes are left out, and so is a folder holding no note. Each
 * folder's children are sorted by name without case (then exactly). A note's `kind`
 * is `kindOf(path, rules)`; a folder's is `null`. The root has name and path `''`.
 */
export function buildTree(
  paths: readonly string[],
  rules: readonly KindRule[],
): TreeNode {
  const root: TreeNode = folderNode('', '');
  for (const path of paths) {
    if (!isNote(path)) continue;
    const parts = path.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = parts.slice(0, i + 1).join('/');
      let next = node.children.find((c) => c.isFolder && c.path === folderPath);
      if (next === undefined) {
        next = folderNode(parts[i]!, folderPath);
        node.children.push(next);
      }
      node = next;
    }
    node.children.push({
      name: parts[parts.length - 1]!,
      path,
      isFolder: false,
      kind: kindOf(path, rules),
      children: [],
    });
  }
  sortTree(root);
  return root;
}

function folderNode(name: string, path: string): TreeNode {
  return {name, path, isFolder: true, kind: null, children: []};
}

function sortTree(node: TreeNode): void {
  node.children.sort((a, b) => byPathWithoutCase(a.name, b.name));
  for (const child of node.children) sortTree(child);
}

/** Every note at or below `node`. */
function notesAt(node: TreeNode): TreeNode[] {
  return node.isFolder ? node.children.flatMap(notesAt) : [node];
}

/**
 * US-013 | AC-4: The notes that can be checked (those with a kind), in the order of the
 * cards: by path without case (US-005 AC-2's comparator).
 */
export function checkable(tree: TreeNode): string[] {
  return notesAt(tree)
    .filter((n) => n.kind !== null)
    .map((n) => n.path)
    .sort(byPathWithoutCase);
}

/**
 * US-013 | AC-4: The notes checked when the dialog opens: every checkable note for
 * `'all'` (so a note added since is included), the listed notes that are still
 * checkable for a list, none for `null`.
 */
export function initialChecked(
  tree: TreeNode,
  saved: SavedSelection | null,
): Set<string> {
  if (saved === null) return new Set();
  const all = checkable(tree);
  if (saved === 'all') return new Set(all);
  const can = new Set(all);
  return new Set(saved.filter((p) => can.has(p)));
}

/**
 * US-013 | AC-4: Checks (`on`) or unchecks `node`: a note, or every note with a kind
 * at or below a folder (the root is "Select all"). A note without a kind is never
 * added. Answers a new set; `checked` is unchanged.
 */
export function toggle(
  checked: ReadonlySet<string>,
  node: TreeNode,
  on: boolean,
): Set<string> {
  const out = new Set(checked);
  for (const note of notesAt(node)) {
    if (note.kind === null) continue;
    if (on) out.add(note.path);
    else out.delete(note.path);
  }
  return out;
}

/**
 * US-013 | AC-4: The form saved for `checked`: `'all'` when every checkable note is
 * checked (and there is at least one), otherwise the checked checkable notes in path
 * order (possibly empty).
 */
export function saveForm(
  checked: ReadonlySet<string>,
  tree: TreeNode,
): SavedSelection {
  const all = checkable(tree);
  const list = all.filter((p) => checked.has(p));
  return list.length > 0 && list.length === all.length ? 'all' : list;
}

/**
 * US-013 | AC-4: The run's items: the checked checkable notes in the order of the
 * cards, each as a file (not a folder).
 */
export function runItems(
  checked: ReadonlySet<string>,
  tree: TreeNode,
): SelectedItem[] {
  return checkable(tree)
    .filter((p) => checked.has(p))
    .map((path) => ({path, isFolder: false}));
}

/** True when `path` is `base` or below it, by whole path segments. */
const atOrBelow = (path: string, base: string): boolean =>
  path === base || path.startsWith(`${base}/`);

/**
 * US-013 | AC-6: The saved selection after `from` was renamed or moved to `to`: a note
 * equal to `from`, or below the folder `from` (by path segments: `A` does not hold
 * `A 2/x.md`), takes the new path. `'all'` and `null` are unchanged.
 */
export function followRename(
  saved: SavedSelection | null,
  from: string,
  to: string,
): SavedSelection | null {
  if (saved === null || saved === 'all') return saved;
  return saved.map((p) => (atOrBelow(p, from) ? to + p.slice(from.length) : p));
}

/**
 * US-013 | AC-6: The saved selection after `path` (a note or a folder) was deleted: the
 * note, or every note below the folder (by path segments), drops out without a
 * warning. `'all'` and `null` are unchanged.
 */
export function followDelete(
  saved: SavedSelection | null,
  path: string,
): SavedSelection | null {
  if (saved === null || saved === 'all') return saved;
  return saved.filter((p) => !atOrBelow(p, path));
}

/**
 * US-013 | AC-1: What the command "Create cards from the saved selection" runs: the
 * notes of the saved selection that are checkable now, in the order of the cards; when
 * there are none (no saved selection, or every saved note gone or without a kind), the
 * refusal `NOTHING_SELECTED`.
 */
export function plannedSavedRun(
  saved: SavedSelection | null,
  tree: TreeNode,
): {ok: true; items: SelectedItem[]} | {ok: false; notice: string} {
  const items = runItems(initialChecked(tree, saved), tree);
  return items.length === 0
    ? {ok: false, notice: NOTHING_SELECTED}
    : {ok: true, items};
}
