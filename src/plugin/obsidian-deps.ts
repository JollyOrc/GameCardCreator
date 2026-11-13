// US-008 AC-5: the dependencies of US-005's runner that come from Obsidian,
// over a structural subset of its `App` (read from the pinned type definitions,
// G0). No Obsidian import: `main.ts` hands the real `app` over.

/** The part of a file the access reads (Obsidian's `TFile`). */
export interface FileLike {
  path: string;
  basename: string;
  extension: string;
}

/** The part of the app the access uses; `vault.read` is used, never the cache. */
export interface AppLike {
  vault: {
    read(file: FileLike): Promise<string>;
    getMarkdownFiles(): FileLike[];
    /** A file or a folder (a folder has `children`); null when there is none. */
    getAbstractFileByPath(path: string): {path: string} | null;
    /** Obsidian's `DataAdapter`; only a desktop one has `getBasePath`. */
    adapter: object;
  };
  metadataCache: {
    getFirstLinkpathDest(linkpath: string, sourcePath: string): FileLike | null;
  };
}

/** The runner's vault dependencies (a subset of `RunnerDeps`). */
export interface VaultAccess {
  readNote(path: string): Promise<string>;
  resolve(
    target: string,
    deckPath: string,
  ): {path: string; isNote: boolean} | null;
  notesNamed(name: string): string[];
  notesBelow(folder: string): string[];
  vaultRoot(): string;
}

const isFile = (entry: object): entry is FileLike => 'extension' in entry;
const isFolder = (entry: object): entry is {path: string; children: object[]} =>
  'children' in entry;

/**
 * US-008 | AC-5: The vault access over `app`. Every call reads at the moment it
 * is made; nothing is cached or written.
 *
 * `readNote` rejects naming the path for a path that is no file; `resolve`
 * never answers a folder (a folder is a missing link target); `notesBelow`
 * gives the files below a folder at any depth and nothing for a file or a
 * missing path; `vaultRoot` throws when the vault has no disk folder (not a
 * desktop vault).
 */
export function vaultAccess(app: AppLike): VaultAccess {
  return {
    async readNote(path) {
      const entry = app.vault.getAbstractFileByPath(path);
      if (entry === null || !isFile(entry)) {
        throw new Error(`Cannot read ${path}: it is not a file of the vault`);
      }
      return app.vault.read(entry);
    },
    resolve(target, deckPath) {
      const found = app.metadataCache.getFirstLinkpathDest(target, deckPath);
      if (found === null) return null;
      return {path: found.path, isNote: found.extension.toLowerCase() === 'md'};
    },
    notesNamed(name) {
      return app.vault
        .getMarkdownFiles()
        .filter((file) => file.basename === name)
        .map((file) => file.path)
        .sort();
    },
    notesBelow(folder) {
      const root = app.vault.getAbstractFileByPath(folder);
      if (root === null || !isFolder(root)) return [];
      const out: string[] = [];
      const walk = (children: object[]): void => {
        for (const child of children) {
          if (isFolder(child)) walk(child.children);
          else if (isFile(child)) out.push(child.path);
        }
      };
      walk(root.children);
      return out;
    },
    vaultRoot() {
      const adapter = app.vault.adapter as {getBasePath?: () => string};
      if (typeof adapter.getBasePath !== 'function') {
        throw new Error('This vault has no folder on disk: desktop only');
      }
      return adapter.getBasePath();
    },
  };
}

/**
 * US-004 AC-3: the API object another plugin offers, as it is now, or
 * `undefined` when the plugin is not installed or not enabled. Obsidian keeps
 * the loaded plugins in `app.plugins.plugins` (not in its typings): read at
 * each call, never kept (SCAR-016). Nothing is decided here; the run checks the
 * object (`checkStatblockApi`).
 */
export function pluginApi(app: object, id: string): unknown {
  const plugins = (
    app as {plugins?: {plugins?: Record<string, {api?: unknown} | undefined>}}
  ).plugins?.plugins;
  return plugins?.[id]?.api;
}
