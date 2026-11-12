// US-007 AC-1, AC-4, AC-5, AC-10 (SCAR-017, SCAR-023, SCAR-031): text checks over
// the sources: one commit path for every field, one call of `saveData`, the
// pure modules free of Obsidian, the tab built from the field table and only
// handing over. Each check matches the whole statement it guards and asserts how
// many files it looked at. Red until the tickets.
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
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
const count = (text: string, pattern: RegExp) =>
  (text.match(pattern) ?? []).length;
const at = (name: string) => join(root, 'plugin', 'settings', name);
const PURE = [
  'fields.ts',
  'commit.ts',
  'rules.ts',
  'status.ts',
  'reset.ts',
  'store.ts',
  'folder-dialog.ts',
];

describe('US-007: the modules exist and the check looked at the sources', () => {
  it('the seven pure modules and the tab are there; at least 36 source files were looked at', () => {
    for (const name of [...PURE, 'tab.ts']) {
      expect(existsSync(at(name)), name).toBe(true);
    }
    expect(files.length).toBeGreaterThanOrEqual(36);
  });
});

describe('US-007 AC-4 (SCAR-017): one path for every field', () => {
  it('the tab commits a field in exactly one place (commitSetting), a rule in one (commitRule), a reset in one (resetPage)', () => {
    const tab = code(at('tab.ts'));
    expect(count(tab, /\bcommitSetting\s*\(/g)).toBe(1);
    expect(count(tab, /\bcommitRule\s*\(/g)).toBe(2); // set and delete
    expect(count(tab, /\bresetPage\s*\(/g)).toBe(1);
  });
  it('the tab builds its field rows from the table (fieldsOf) and decides the Enter key by fieldKey', () => {
    const tab = code(at('tab.ts'));
    expect(tab).toMatch(/\b(fieldsOf|groupsOf)\s*\(/);
    // Tightened at #19 (SCAR-023): one binding for every input (fields and rule rows), each
    // statement matched whole: Enter decided by fieldKey, a blur committing the same way.
    expect(count(tab, /\bfieldKey\s*\(/g)).toBe(1);
    expect(tab).toMatch(/if \(fieldKey\(event\) === 'commit'\) fire\(\);/);
    expect(count(tab, /addEventListener\(\s*'blur'/g)).toBe(1);
    expect(tab).toMatch(/input\.addEventListener\('blur', fire\);/);
    expect(count(tab, /\bbindInput\s*\(/g)).toBe(3); // the helper, the fields, the rule rows
  });
  it('the tab never writes a setting another way: no saveData, no store.write, no loadData', () => {
    const tab = code(at('tab.ts'));
    expect(tab).not.toMatch(/\bsaveData\s*\(|\.write\s*\(|\bloadData\s*\(/);
  });
  it('the tab hides the dialog button by folderDialogAvailable and opens it by chooseFolder', () => {
    const tab = code(at('tab.ts'));
    expect(tab).toMatch(/\bfolderDialogAvailable\s*\(/);
    // Changed at the M04 fix: the tab opens the dialog through pickOutputFolder, which owns
    // what happens with the answer (a refused path keeps its message).
    expect(tab).toMatch(/\bpickOutputFolder\s*\(/);
    expect(tab).not.toMatch(/\bchooseFolder\s*\(/);
  });
  // Added at the M04 fix (SCAR-031, SCAR-023): the two statements that kept a refusal visible.
  it("after the dialog the tab shows the outcome's message and redraws the page only when the path was saved", () => {
    const tab = code(at('tab.ts'));
    expect(tab).toMatch(/error\.setText\(outcome\.message\);/);
    expect(tab).toMatch(/if \(outcome\.saved\) await this\.draw\(\);/);
    expect(count(tab, /outcome\.saved/g)).toBe(1);
  });
  it('the output folder from the dialog goes through the same commitSetting as the text field (the tab has no second path)', () => {
    const tab = code(at('tab.ts'));
    expect(tab).not.toMatch(/\bcheckOutputFolder\s*\(/);
  });
});

describe('US-007 AC-10: saveData is called in two places only: main.ts hands it over, the store calls it', () => {
  it("main.ts calls the plugin's saveData once; the store calls the one it was given once; no other file calls it", () => {
    const hits = files.filter((f) => /\bsaveData\s*\(/.test(code(f))).map(rel);
    expect(hits.sort()).toEqual(['plugin/main.ts', 'plugin/settings/store.ts']);
    expect(
      count(code(join(root, 'plugin', 'main.ts')), /\bthis\.saveData\s*\(/g),
    ).toBe(1);
    expect(count(code(at('store.ts')), /\bdeps\.saveData\s*\(/g)).toBe(1);
  });
  it('the store is the one module that copies the backup and it names the backup file', () => {
    const store = code(at('store.ts'));
    expect(store).toMatch(/data-before-settings-screen\.json/);
    expect(store).toMatch(/\.copy\s*\(/);
    const others = files.filter((f) => f !== at('store.ts'));
    expect(others.filter((f) => /\.copy\s*\(/.test(code(f))).map(rel)).toEqual(
      [],
    );
  });
});

describe('US-007 (US-005 AC-10): a run never reaches the settings store', () => {
  it('the run files do not mention the store, the screen or the backup', () => {
    const run = files.filter(
      (f) =>
        rel(f).startsWith('core/') ||
        [
          'plugin/runner.ts',
          'plugin/commands.ts',
          'plugin/disk-writer.ts',
        ].includes(rel(f)),
    );
    expect(run.length).toBeGreaterThanOrEqual(20);
    for (const f of run) {
      expect(code(f), rel(f)).not.toMatch(
        /settings\/store|settings\/tab|createSettingsStore|data-before-settings-screen/,
      );
    }
  });
});

describe('US-007 (SCAR-031, SCAR-017): the entry point and the layering', () => {
  it('only main.ts and the tab import Obsidian; the seven pure modules do not', () => {
    const importing = files
      .filter((f) => /from 'obsidian'/.test(code(f)))
      .map(rel);
    expect(importing.sort()).toEqual([
      'plugin/main.ts',
      'plugin/settings/tab.ts',
    ]);
    for (const name of PURE) {
      expect(code(at(name)), name).not.toMatch(
        /from 'obsidian'|from 'electron'/,
      );
    }
  });
  it("Node's file system is still only in plugin/disk-writer.ts", () => {
    const fs = /from '(node:)?fs(\/promises)?'/;
    expect(files.filter((f) => fs.test(code(f))).map(rel)).toEqual([
      'plugin/disk-writer.ts',
    ]);
  });
  it('main.ts adds the settings tab once and builds the store with createSettingsStore', () => {
    const main = code(join(root, 'plugin', 'main.ts'));
    expect(count(main, /\baddSettingTab\s*\(/g)).toBe(1);
    expect(count(main, /\bcreateSettingsStore\s*\(/g)).toBe(1);
  });
  it('the tab is a PluginSettingTab with the name Game Card Creator', () => {
    const tab = code(at('tab.ts'));
    expect(tab).toMatch(/extends PluginSettingTab\b/);
    expect(tab).toMatch(/'Game Card Creator'/);
  });
  // Narrowed at #19 (SCAR-023): the names of the two sub pages are one table, `PAGE_TITLES`
  // (pinned to the story's wording in us-007-reset); the tab must use it, not copy the names.
  it('the main page is named Game Card Creator; the sub pages take their names from PAGE_TITLES', () => {
    const tab = readFileSync(at('tab.ts'), 'utf8');
    expect(tab).toContain("'Game Card Creator'");
    expect(tab).toMatch(/PAGE_TITLES\[/);
    expect(tab).not.toContain('Note properties');
    expect(tab).not.toContain('Page and text size');
  });
});
