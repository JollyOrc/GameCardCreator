// US-008 AC-4, AC-5, AC-6, AC-11 (SCAR-031): text checks over the sources. The
// entry point only builds the dependencies and registers; every decision lives
// in a tested function. Each check matches the whole statement it guards and
// asserts how many files it looked at (SCAR-023). Red until the tickets.
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const root = join(process.cwd(), 'src');
const files: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.ts')) files.push(path);
  }
};
walk(root);
const rel = (f: string) => f.slice(root.length + 1);
const code = (f: string) =>
  readFileSync(f, 'utf8')
    .split('\n')
    .filter(
      (l) =>
        !l.trim().startsWith('//') &&
        !l.trim().startsWith('*') &&
        !l.trim().startsWith('/*'),
    )
    .join('\n');
const main = () => code(join(root, 'plugin', 'main.ts'));

describe('US-008 AC-5: main.ts only hands over', () => {
  it('the entry point exists and the checks looked at the sources (at least 28 files; 31 are planned)', () => {
    expect(files.map(rel)).toContain('plugin/main.ts');
    expect(files.length).toBeGreaterThanOrEqual(28);
  });
  it('is a Plugin subclass and short (at most 120 lines, at most 3 conditions)', () => {
    const text = main();
    expect(text).toMatch(/export default class \w+ extends Plugin\b/);
    expect(text.split('\n').length).toBeLessThanOrEqual(120);
    expect((text.match(/\bif \(/g) ?? []).length).toBeLessThanOrEqual(3);
  });
  it('registers the command with a check callback, and the two menus', () => {
    const text = main();
    expect(text).toMatch(
      /this\.addCommand\(\{[^}]*checkCallback:\s*toCheckCallback\(/s,
    );
    expect(text).toMatch(
      /this\.registerEvent\(\s*this\.app\.workspace\.on\('file-menu',\s*onFileMenu\(/,
    );
    expect(text).toMatch(
      /this\.registerEvent\(\s*this\.app\.workspace\.on\('files-menu',\s*onFilesMenu\(/,
    );
  });
  it("hands over: the settings read once from loadData, the settings file's path, the compiler, the confirmation and the notice", () => {
    const text = main();
    expect((text.match(/loadData\(\)/g) ?? []).length).toBe(1);
    expect(text).toMatch(/readSettingsFile\(/);
    expect(text).toMatch(/settingsFile:/);
    expect(text).toMatch(/createCompiler\(/);
    // the runner calls confirmReplace(files); the app comes from the plugin
    // (corrected at #14: the G2 text had no way to give the modal its app)
    expect(text).toMatch(
      /confirmReplace:\s*\(files\)\s*=>\s*confirmReplaceWith\(Modal\)\(this\.app,\s*files\)/,
    );
    expect(text).toMatch(
      /notice:\s*\(text(: string)?\)\s*=>\s*void new Notice\(text\)/,
    );
    expect(text).toMatch(/vaultAccess\(this\.app\)/);
  });
  it('the compiler is disposed on unload', () => {
    expect(main()).toMatch(/onunload\(\)[^}]*\.dispose\(\)/s);
  });
  it('only main.ts imports Obsidian (everything else is testable without it)', () => {
    const importing = files
      .filter((f) => /from 'obsidian'/.test(code(f)))
      .map(rel);
    expect(importing).toEqual(['plugin/main.ts']);
  });
});

describe("US-008 AC-4: the author's settings file is never written", () => {
  it('no file calls saveData', () => {
    expect(
      files.filter((f) => /\bsaveData\s*\(/.test(code(f))).map(rel),
    ).toEqual([]);
  });
});

describe("US-008 AC-6: the modal's keys are decided by dialogKey", () => {
  it('ui.ts calls dialogKey and compares no key name itself', () => {
    const ui = code(join(root, 'plugin', 'ui.ts'));
    expect(ui).toMatch(/dialogKey\(/);
    expect(ui).not.toMatch(
      /\.key\s*===|\bcase\s+'(Enter|Escape)'|['"](Enter|Escape)['"]/,
    );
  });
});

describe('US-008 AC-11: desktop only', () => {
  it("only plugin/disk-writer.ts imports Node's file system", () => {
    const fs = /from '(node:)?fs(\/promises)?'/;
    expect(files.filter((f) => fs.test(code(f))).map(rel)).toEqual([
      'plugin/disk-writer.ts',
    ]);
  });
  it('manifest.json: id, name, desktop only, a version, and versions.json knows it', () => {
    const manifest = JSON.parse(
      readFileSync('manifest.json', 'utf8'),
    ) as Record<string, unknown>;
    const versions = JSON.parse(
      readFileSync('versions.json', 'utf8'),
    ) as Record<string, string>;
    expect(manifest.id).toBe('game-card-creator');
    expect(manifest.name).toBe('Game Card Creator');
    expect(manifest.isDesktopOnly).toBe(true);
    expect(String(manifest.version)).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.keys(versions)).toContain(String(manifest.version));
  });
});
