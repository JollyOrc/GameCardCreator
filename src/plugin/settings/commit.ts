// US-007 AC-3, AC-5, AC-7, AC-8, AC-10, AC-11: committing one field. The value is parsed,
// checked by the checks that already exist (the screen adds no rule of its own), and saved
// by loading the file, changing the one key and writing it back. Commits, rule changes and
// resets of one store run one after the other, so two at once lose nothing.
import {checkOutputFolder} from '../../core/run/output';
import {checkCardsSettings} from '../../core/run/settings';
import {readSettingsFile} from '../settings-file';
import {FIELDS} from './fields';

/** US-007 AC-10: the settings file as the screen sees it (see `store.ts`). */
export interface SettingsStore {
  /** The file's content as `loadData` gives it: `null` when there is none. */
  read(): Promise<unknown>;
  write(data: Record<string, unknown>): Promise<void>;
}

/** US-007 AC-3: the outcome of a commit; `warnings` do not block (a missing folder). */
export type CommitResult =
  {ok: true; warnings: string[]} | {ok: false; message: string};

const queues = new WeakMap<SettingsStore, Promise<unknown>>();

/**
 * US-007 AC-11: runs `task` after every earlier task of `store` has ended, whether it
 * succeeded or not; one queue per store.
 */
export function serial<T>(
  store: SettingsStore,
  task: () => Promise<T>,
): Promise<T> {
  const run = (queues.get(store) ?? Promise.resolve()).then(task, task);
  queues.set(
    store,
    run.catch(() => undefined),
  );
  return run;
}

const reason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** True for a plain object (not null, not a list). */
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * US-007 AC-11: loads the file now, as a copy of its top level; a file that is not an
 * object (or none) is an empty object. A failed read gives the message as a string.
 */
export async function loadFile(
  store: SettingsStore,
): Promise<Record<string, unknown> | string> {
  try {
    const raw = await store.read();
    return isObject(raw) ? {...raw} : {};
  } catch (error) {
    return `Could not read the settings: ${reason(error)}`;
  }
}

/**
 * US-007 AC-10: sets the setting `id` (`a` or `a.b`) in `file`, keeping every other key; a
 * nested value that is not an object is replaced by one holding the new key.
 */
export function setRaw(
  file: Record<string, unknown>,
  id: string,
  value: unknown,
): void {
  const [first, second] = id.split('.') as [string, string | undefined];
  if (second === undefined) {
    file[first] = value;
    return;
  }
  const inner = isObject(file[first]) ? {...file[first]} : {};
  inner[second] = value;
  file[first] = inner;
}

/** US-007 AC-10: writes `file`; a failed write is a message, never a throw. */
export async function save(
  store: SettingsStore,
  file: Record<string, unknown>,
): Promise<CommitResult> {
  try {
    await store.write(file);
    return {ok: true, warnings: []};
  } catch (error) {
    return {
      ok: false,
      message: `Could not save the settings: ${reason(error)}`,
    };
  }
}

/**
 * US-007 AC-3, AC-5, AC-7, AC-8, AC-10, AC-11: commits one field.
 *
 * A number is the text read as one (`Card width "abc" is not a number` otherwise); a toggle
 * is a boolean; a text is trimmed, and the output folder is saved in its normal form. The
 * value is refused, and nothing is written, when it adds a problem to the checks of the
 * settings as they are now (a problem already in the file, from a hand edit, does not block
 * another field); the message is the checks' own. Otherwise the file is loaded, the one key
 * changed, unknown keys kept, and the file written. Assumes `FIELDS` holds `id`; an unknown
 * id is refused without reading.
 */
export function commitSetting(
  deps: {store: SettingsStore; vaultRoot(): string},
  id: string,
  raw: string | boolean,
): Promise<CommitResult> {
  const def = FIELDS.find((f) => f.id === id);
  if (def === undefined) {
    return Promise.resolve({ok: false, message: `Unknown setting ${id}`});
  }
  return serial(deps.store, async (): Promise<CommitResult> => {
    const file = await loadFile(deps.store);
    if (typeof file === 'string') return {ok: false, message: file};
    const current = readSettingsFile(file).settings;
    let value: string | number | boolean;
    if (def.kind === 'number') {
      const text = String(raw);
      if (text.trim() === '' || !Number.isFinite(Number(text))) {
        return {ok: false, message: `${def.label} "${text}" is not a number`};
      }
      value = Number(text);
    } else if (def.kind === 'toggle') {
      value = raw === true;
    } else {
      value = String(raw).trim();
      if (id === 'outputFolder') {
        const checked = checkOutputFolder(value, deps.vaultRoot());
        if (checked.ok) value = checked.folder;
      }
    }
    const candidate = structuredClone(current);
    const holder = candidate as unknown as Record<string, unknown>;
    const [first, second] = id.split('.') as [string, string | undefined];
    if (second === undefined) holder[first] = value;
    else (holder[first] as Record<string, unknown>)[second] = value;
    const before = checkCardsSettings(current, deps.vaultRoot());
    const added = checkCardsSettings(candidate, deps.vaultRoot()).filter(
      (problem) => !before.includes(problem),
    );
    if (added.length > 0) return {ok: false, message: added.join('; ')};
    setRaw(file, id, value);
    return save(deps.store, file);
  });
}
