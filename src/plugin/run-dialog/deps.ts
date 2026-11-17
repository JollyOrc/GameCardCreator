// US-013 AC-1 to AC-6 (SCAR-031): the run dialog's dependencies, built from the parts of
// Obsidian's `App` it needs (read structurally; this file imports no Obsidian module), so
// `main.ts` only hands over and registers.
import type {SelectedItem} from '../../core/run/select';
import {createDiskWriter, modifiedAt} from '../disk-writer';
import {openSettingsTab} from '../obsidian-deps';
import type {SettingsStore} from '../settings/commit';
import {homeFolder, windowEnv} from '../settings/folder-dialog';
import type {RunDialogDeps} from './dialog';
import {updateSelection} from './rules';
import {followDelete, followRename} from './selection';

/** The part of Obsidian's `App` the dialog reads. */
export interface DialogAppLike {
  vault: {getFiles(): {path: string}[]};
}

/**
 * US-013 | AC-1 to AC-5: The dialog's dependencies: the vault's paths now, the disk
 * writer's reads, the folder dialog's environment, the settings tab's opener (by
 * `pluginId`), the run and the notice handed in by `main.ts`.
 */
export function runDialogDeps(input: {
  app: DialogAppLike & object;
  store: SettingsStore;
  vaultRoot(): string;
  pluginId: string;
  run(items: SelectedItem[]): Promise<void>;
  notice(text: string): void;
}): RunDialogDeps {
  return {
    store: input.store,
    vaultRoot: () => input.vaultRoot(),
    paths: () => input.app.vault.getFiles().map((f) => f.path),
    modifiedAt,
    folderEnv: windowEnv,
    home: () => homeFolder(windowEnv()),
    exists: (path) => createDiskWriter(path).exists(path),
    openSettings: () => openSettingsTab(input.app, input.pluginId),
    run: (items) => input.run(items),
    notice: (text) => input.notice(text),
  };
}

/**
 * US-013 | AC-6: The handlers of the vault's `rename` and `delete` events: each applies
 * `followRename` or `followDelete` to the stored selection through `updateSelection`
 * (writes only when it changed). A failed write is dropped, never thrown into Obsidian's
 * event loop.
 */
export function selectionFollowers(deps: {store: SettingsStore}): {
  onRename(file: {path: string}, oldPath: string): void;
  onDelete(file: {path: string}): void;
} {
  return {
    onRename: (file, oldPath) => {
      void updateSelection(deps, (saved) =>
        followRename(saved, oldPath, file.path),
      ).catch(() => undefined);
    },
    onDelete: (file) => {
      void updateSelection(deps, (saved) =>
        followDelete(saved, file.path),
      ).catch(() => undefined);
    },
  };
}
