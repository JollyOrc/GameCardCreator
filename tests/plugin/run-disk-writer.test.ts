// US-005 AC-5: the one writer. It writes only below its root, never deletes,
// creates the folder, replaces a file of the same name. Real files in a
// temporary folder (the writer is Node's file system, desktop only).
// Red until the code ticket.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createDiskWriter} from '../../src/plugin/disk-writer';

let base = '';
beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'gcc-writer-'));
});
afterEach(() => rmSync(base, {recursive: true, force: true}));

describe('US-005 AC-5: createDiskWriter', () => {
  it('creates the folder and writes bytes and text below it', async () => {
    const root = join(base, 'out', 'Cards');
    const w = createDiskWriter(root);
    await w.ensureFolder();
    await w.writeBytes(join(root, 'a cards.pdf'), new Uint8Array([1, 2, 3]));
    await w.writeText(join(root, 'a cards warnings.md'), 'No warnings.\n');
    expect(Array.from(readFileSync(join(root, 'a cards.pdf')))).toEqual([
      1, 2, 3,
    ]);
    expect(readFileSync(join(root, 'a cards warnings.md'), 'utf8')).toBe(
      'No warnings.\n',
    );
  });
  it('ensureFolder alone creates an empty folder, with its parents', async () => {
    const root = join(base, 'a', 'b', 'c');
    await createDiskWriter(root).ensureFolder();
    expect(existsSync(root)).toBe(true);
    expect(readdirSync(root)).toEqual([]);
  });
  it('a file below a folder that does not exist yet creates the folder', async () => {
    const root = join(base, 'out');
    const w = createDiskWriter(root);
    await w.writeText(join(root, 'sub', 'deeper', 'x.md'), 'x');
    expect(readFileSync(join(root, 'sub', 'deeper', 'x.md'), 'utf8')).toBe('x');
  });
  it('replaces a file of the same name', async () => {
    const w = createDiskWriter(base);
    await w.writeText(join(base, 'x.md'), 'old');
    await w.writeText(join(base, 'x.md'), 'new');
    expect(readFileSync(join(base, 'x.md'), 'utf8')).toBe('new');
  });
  it.each([
    [
      'a path outside the folder',
      (b: string) => join(b, '..', 'elsewhere.txt'),
    ],
    ['a path with .. that leaves it', (b: string) => `${b}/sub/../../up.txt`],
    [
      "a sibling whose name starts with the folder's",
      (b: string) => `${b}2/x.txt`,
    ],
    ['a relative path', () => 'x.txt'],
    ['the folder itself as a file', (b: string) => b],
  ])('refuses %s, and writes nothing', async (_name, make) => {
    const root = join(base, 'root');
    mkdirSync(root);
    const w = createDiskWriter(root);
    const target = make(root);
    await expect(w.writeText(target, 'x')).rejects.toThrow(
      /outside|below|folder/i,
    );
    await expect(w.writeBytes(target, new Uint8Array([1]))).rejects.toThrow();
    expect(existsSync(join(base, 'elsewhere.txt'))).toBe(false);
    expect(existsSync(join(base, 'up.txt'))).toBe(false);
    expect(existsSync(`${root}2`)).toBe(false);
  });
  it('exists and isFile tell files, folders and nothing apart', async () => {
    const root = join(base, 'root');
    mkdirSync(root);
    writeFileSync(join(root, 'f.txt'), 'x');
    const w = createDiskWriter(root);
    expect(await w.exists(join(root, 'f.txt'))).toBe(true);
    expect(await w.exists(join(root, 'nope.txt'))).toBe(false);
    expect(await w.isFile(join(root, 'f.txt'))).toBe(true);
    expect(await w.isFile(root)).toBe(false);
  });
  it('offers no way to delete', () => {
    const w = createDiskWriter(base) as unknown as Record<string, unknown>;
    expect(Object.keys(w).sort()).toEqual([
      'ensureFolder',
      'exists',
      'isFile',
      'writeBytes',
      'writeText',
    ]);
  });
});
