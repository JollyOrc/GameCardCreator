// US-007 AC-6, AC-10, AC-11 (D4, D15): the kind rules as rows of the settings screen. A row
// is set (a new row at the end) or deleted; a rule is saved when it passes the check of the
// rules; a folder that is not in the vault warns and is saved. The file is loaded for every
// change, and changes run in the queue of `commit.ts`.
import {checkKindRules, type KindRule} from '../../core/run/kinds';
import {readSettingsFile} from '../settings-file';
import {
  loadFile,
  save,
  serial,
  type CommitResult,
  type SettingsStore,
} from './commit';

/** US-007 AC-6: one change of the rule list, by the row's index in the file now. */
export type RuleOp =
  {op: 'set'; index: number; rule: KindRule} | {op: 'delete'; index: number};

const STALE = 'The rules changed: open the page again';

/**
 * US-007 AC-6, D4: the vault's folders to suggest for the text typed in a rule's folder
 * field: those that contain the text (without case), sorted without case, at most `limit`;
 * the vault's root and hidden folders (a segment starting with a dot) are never suggested.
 * An empty text suggests the first `limit` folders. `folders` is read when the field is
 * used, not when the page was drawn (SCAR-016).
 */
export function suggestFolders(
  query: string,
  folders: readonly string[],
  limit = 20,
): string[] {
  const needle = query.trim().toLowerCase();
  return folders
    .filter(
      (f) =>
        f !== '' &&
        f !== '/' &&
        !f.split('/').some((part) => part.startsWith('.')) &&
        f.toLowerCase().includes(needle),
    )
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .slice(0, limit);
}

/**
 * US-007 AC-6, D4, D15: applies one change to the kind rules.
 *
 * `set` replaces the row at `index`, or appends when `index` is the number of rules; it is
 * refused, with the messages of `checkKindRules`, when it adds a problem to the rules as
 * they are now (a problem already there does not block another row). A folder that
 * `folderExists` does not know warns and is saved. `delete` removes the row and asks
 * nothing. An index outside the rules in the file now (it changed while the tab was open)
 * is refused. Other keys of the file stay; rules that are not a list in the file count as
 * none.
 */
export function commitRule(
  deps: {
    store: SettingsStore;
    vaultRoot(): string;
    folderExists(folder: string): boolean;
  },
  op: RuleOp,
): Promise<CommitResult> {
  return serial(deps.store, async (): Promise<CommitResult> => {
    const file = await loadFile(deps.store);
    if (typeof file === 'string') return {ok: false, message: file};
    const rules = readSettingsFile(file).settings.kindRules;
    const warnings: string[] = [];
    let next: KindRule[];
    if (op.op === 'delete') {
      if (op.index < 0 || op.index >= rules.length) {
        return {ok: false, message: STALE};
      }
      next = rules.filter((_, i) => i !== op.index);
    } else {
      if (op.index < 0 || op.index > rules.length) {
        return {ok: false, message: STALE};
      }
      next = rules.map((rule) => ({...rule}));
      next[op.index] = {...op.rule};
      const before = checkKindRules(rules);
      const added = checkKindRules(next).filter(
        (problem) => !before.includes(problem),
      );
      if (added.length > 0) return {ok: false, message: added.join('; ')};
      const folder = op.rule.folder.trim().replace(/\/+$/, '');
      if (folder !== '' && !deps.folderExists(folder)) {
        warnings.push(`The folder "${folder}" is not in the vault`);
      }
    }
    file.kindRules = next;
    const saved = await save(deps.store, file);
    return saved.ok ? {ok: true, warnings} : saved;
  });
}
