// US-009 AC-11: the scheme note and the bleed on the settings screen: committed
// through the screen's one path with the messages of the settings checks, and the
// tab shows the line under the field (SCAR-016, SCAR-031: the decision is a tested
// function, the tab and main.ts only hand it the vault's answer). Red until the
// code ticket.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {readSettingsFile} from '../../src/plugin/settings-file';
import {commitSetting} from '../../src/plugin/settings/commit';
import {resetSection} from '../../src/plugin/settings/sections';
import {memoryStore} from '../support/memory-store';

const deps = (store: ReturnType<typeof memoryStore>) => ({
  store,
  vaultRoot: () => '/v',
});
const src = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('US-009 AC-11: the scheme note field', () => {
  it('a path is saved trimmed; other keys of the file stay as they were', async () => {
    const store = memoryStore({outputFolder: '/out'});
    const r = await commitSetting(
      deps(store),
      'schemeNote',
      ' Layouting/Branch Scheme.md ',
    );
    expect(r).toMatchObject({ok: true});
    expect(store.file()).toEqual({
      outputFolder: '/out',
      schemeNote: 'Layouting/Branch Scheme.md',
    });
    expect(readSettingsFile(store.file()).settings.schemeNote).toBe(
      'Layouting/Branch Scheme.md',
    );
  });
  it('spaces only are trimmed to empty like any text field: saved, the feature is off', async () => {
    const store = memoryStore({schemeNote: 'a.md'});
    expect(await commitSetting(deps(store), 'schemeNote', '   ')).toMatchObject(
      {ok: true},
    );
    expect(readSettingsFile(store.file()).settings.schemeNote).toBe('');
  });
  it('an empty value is saved: the feature is off', async () => {
    const store = memoryStore({schemeNote: 'a.md'});
    expect(await commitSetting(deps(store), 'schemeNote', '')).toMatchObject({
      ok: true,
    });
    expect(readSettingsFile(store.file()).settings.schemeNote).toBe('');
  });
  it.each(['/abs.md', '../up.md', 'note.txt', 'a\\b.md'])(
    '%j is refused with the checks message and nothing is written',
    async (bad) => {
      const store = memoryStore(null);
      const r = await commitSetting(deps(store), 'schemeNote', bad);
      expect(r.ok).toBe(false);
      if (!r.ok)
        expect(r.message).toBe(
          `The scheme note "${bad.trim()}" must be a vault path ending in .md (no leading /, no \\ and no ..)`,
        );
      expect(store.writes).toEqual([]);
    },
  );
});

describe('US-009 AC-11, AC-15: the bleed field', () => {
  it('a number is saved in the sheet group', async () => {
    const store = memoryStore(null);
    expect(await commitSetting(deps(store), 'sheet.bleed', '1')).toMatchObject({
      ok: true,
    });
    expect(store.file()).toEqual({sheet: {bleed: 1}});
  });
  it('a value that is not a number is refused as the other number fields refuse it', async () => {
    const store = memoryStore(null);
    expect(await commitSetting(deps(store), 'sheet.bleed', 'wide')).toEqual({
      ok: false,
      message: 'Bleed "wide" is not a number',
    });
    expect(store.writes).toEqual([]);
  });
  it('out of range, above the margin and above the cut marks are refused with the checks message', async () => {
    const a = memoryStore(null);
    expect(await commitSetting(deps(a), 'sheet.bleed', '4')).toEqual({
      ok: false,
      message: 'bleed 4 is above 1 mm, the distance of the cut marks',
    });
    const b = memoryStore({sheet: {cutMarks: false}});
    expect(await commitSetting(deps(b), 'sheet.bleed', '4')).toEqual({
      ok: false,
      message: 'bleed 4 is outside 0 to 3 mm',
    });
    const c = memoryStore({sheet: {cutMarks: false, margin: 1}});
    expect(await commitSetting(deps(c), 'sheet.bleed', '2')).toEqual({
      ok: false,
      message: 'bleed 2 is above the margin 1 mm',
    });
    expect(a.writes.concat(b.writes, c.writes)).toEqual([]);
  });
  it('turning the cut marks on with a bleed above 1 mm is refused (the check sees both settings)', async () => {
    const store = memoryStore({sheet: {cutMarks: false, bleed: 2}});
    const r = await commitSetting(deps(store), 'sheet.cutMarks', true);
    expect(r).toEqual({
      ok: false,
      message: 'bleed 2 is above 1 mm, the distance of the cut marks',
    });
  });
});

describe('US-009 AC-11: resetting a page', () => {
  it('the properties page reset also resets the scheme note to empty', async () => {
    const store = memoryStore({schemeNote: 'a.md', outputFolder: '/out'});
    await resetSection({store}, 'properties');
    const file = store.file() as Record<string, unknown>;
    expect(file.schemeNote).toBe('');
    expect(file.outputFolder).toBe('/out');
  });
  it('the layout section reset (US-013 AC-10) sets the bleed to 0', async () => {
    const store = memoryStore({sheet: {bleed: 1}});
    await resetSection({store}, 'layout');
    expect((store.file() as {sheet: {bleed: number}}).sheet.bleed).toBe(0);
  });
});

describe('US-009 AC-11 (SCAR-016, SCAR-031): the tab and main.ts only hand over', () => {
  it("the tab draws the line from schemeLine with the vault's answer, read at each draw", () => {
    const tab = src('src/plugin/settings/tab.ts');
    expect(tab).toMatch(/schemeLine\(/);
    expect(tab).toMatch(/noteExists\(/);
  });
  it('main.ts hands the tab a noteExists over the vault and holds no decision', () => {
    const main = src('src/plugin/main.ts');
    expect(main).toMatch(/noteExists:/);
    const code = main
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).not.toMatch(/schemeNote/);
    expect(code).not.toMatch(/\bif\s*\([^)]*(scheme|branch|bleed)/i);
  });
});
