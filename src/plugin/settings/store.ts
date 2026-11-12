// US-007 AC-10 (SCAR-018): the settings store: the screen's way to read and write the
// plugin's `data.json`. It reads with `loadData` and writes with `saveData`, both handed
// in; before its first write it copies `data.json` to `data-before-settings-screen.json` in
// the plugin's own folder (D14). Nothing here knows Obsidian: `main.ts` hands over its
// functions and the vault's adapter.
import type {SettingsStore} from './commit';

/** The part of Obsidian's `DataAdapter` the backup uses (paths are the vault's own). */
export interface AdapterLike {
  exists(path: string): Promise<boolean>;
  copy(from: string, to: string): Promise<void>;
}

/** What `createSettingsStore` needs from the plugin. */
export interface StoreDeps {
  /** The plugin's folder in the vault, e.g. `.obsidian/plugins/game-card-creator`. */
  pluginDir: string;
  loadData(): Promise<unknown>;
  saveData(data: unknown): Promise<void>;
  adapter: AdapterLike;
}

/**
 * US-007 | AC-10, D6, D14: the settings store over `deps`.
 *
 * `read` is `loadData`. `write` first, once per store, copies `data.json` to
 * `data-before-settings-screen.json` when `data.json` exists and no copy does (an existing
 * copy is never overwritten; no file, no copy), then calls `saveData`. A failed copy stops
 * the write with `Could not back up data.json: <reason>`, saves nothing, and the next write
 * tries the copy again. The only paths asked for are those two files.
 */
export function createSettingsStore(deps: StoreDeps): SettingsStore {
  const data = `${deps.pluginDir}/data.json`;
  const backup = `${deps.pluginDir}/data-before-settings-screen.json`;
  let backupChecked = false;
  return {
    read: () => deps.loadData(),
    async write(value) {
      if (!backupChecked) {
        if (
          (await deps.adapter.exists(data)) &&
          !(await deps.adapter.exists(backup))
        ) {
          try {
            await deps.adapter.copy(data, backup);
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : String(error);
            throw new Error(`Could not back up data.json: ${reason}`, {
              cause: error,
            });
          }
        }
        backupChecked = true;
      }
      await deps.saveData(value);
    },
  };
}
