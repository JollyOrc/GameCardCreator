// US-005 AC-5: writes the output folder on disk (desktop only, Node's file
// system). Writes only below its root; never deletes. Follows Obsidian2Typst's
// disk writer (same author, MIT; `src/plugin/disk-writer.ts` there).
import {mkdir, stat, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, resolve, sep} from 'node:path';

/** US-005 AC-5: the one writer of a run. */
export interface DiskWriter {
  /** Creates the root folder (and its parents) when it does not exist. */
  ensureFolder(): Promise<void>;
  writeText(path: string, text: string): Promise<void>;
  writeBytes(path: string, data: Uint8Array): Promise<void>;
  /** True when something exists at `path` (a read, not a write). */
  exists(path: string): Promise<boolean>;
  /** True when `path` is a file; false for a folder or nothing. */
  isFile(path: string): Promise<boolean>;
}

/** The stat of `path`, or null when nothing is there. */
async function statOf(path: string) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

/**
 * US-005 AC-5: a writer for the output folder `root`. A path must be absolute
 * and strictly below the root (the root itself, a sibling whose name starts
 * with the root's and a `..` that leaves it are refused); there is no way to
 * delete; a file of the same name is replaced.
 */
export function createDiskWriter(root: string): DiskWriter {
  const base = resolve(root);
  /** The normalised path, or a refusal when it is not below `root`. */
  const checked = (path: string): string => {
    const full = isAbsolute(path) ? resolve(path) : null;
    if (full === null || !full.startsWith(base + sep)) {
      throw new Error(`Refusing to write outside the output folder: ${path}`);
    }
    return full;
  };
  const write = async (path: string, data: Uint8Array): Promise<void> => {
    const full = checked(path);
    await mkdir(dirname(full), {recursive: true});
    await writeFile(full, data);
  };
  return {
    ensureFolder: async () => {
      await mkdir(base, {recursive: true});
    },
    writeText: (path, text) => write(path, new TextEncoder().encode(text)),
    writeBytes: write,
    exists: async (path) => (await statOf(path)) !== null,
    isFile: async (path) => (await statOf(path))?.isFile() ?? false,
  };
}
