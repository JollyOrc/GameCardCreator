// US-007 AC-9, US-013 AC-10 (SCAR-014, SCAR-017): the one reset of the settings screen.
// The question and the sections live in `sections.ts`; the output folder and the kind
// rules are never reset by the screen.
import {DEFAULT_CARDS} from '../../core/run/settings';
import {loadFile, save, serial, setRaw, type SettingsStore} from './commit';
import {valueOf} from './fields';

/**
 * US-007 AC-9, AC-11, US-013 AC-10: puts the settings `ids` back to their defaults
 * (`DEFAULT_CARDS`). The one reset of the screen (SCAR-017): pages and sections use it.
 *
 * The file is loaded now; only those keys change, every other key (the output folder, the
 * kind rules, other fields, unknown keys) stays; one write, in the store's queue. Throws the
 * message of a failed read or write; asking first is the caller's job.
 */
export function resetFields(
  deps: {store: SettingsStore},
  ids: readonly string[],
): Promise<void> {
  return serial(deps.store, async () => {
    const file = await loadFile(deps.store);
    if (typeof file === 'string') throw new Error(file);
    for (const id of ids) setRaw(file, id, valueOf(DEFAULT_CARDS, id));
    const saved = await save(deps.store, file);
    if (!saved.ok) throw new Error(saved.message);
  });
}
