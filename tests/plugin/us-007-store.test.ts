// US-007 AC-10 (SCAR-018): the settings store: it reads with `loadData`, writes
// with `saveData`, and before its first write copies `data.json` to
// `data-before-settings-screen.json` in the plugin's folder: once, never over an
// existing copy, not when there was no file; a failed copy stops the write. The
// adapter and the data functions are fakes that log every call. Red until the tickets.
import {describe, expect, it} from 'vitest';
import {commitSetting} from '../../src/plugin/settings/commit';
import {createSettingsStore} from '../../src/plugin/settings/store';

const DIR = '.obsidian/plugins/game-card-creator';
const DATA = `${DIR}/data.json`;
const BACKUP = `${DIR}/data-before-settings-screen.json`;

/** A vault adapter with a set of existing paths; `copy` and `exists` are logged. */
function fake(
  existing: string[],
  over: {copyFails?: boolean; loaded?: unknown} = {},
) {
  const files = new Set(existing);
  const log: string[] = [];
  const saved: unknown[] = [];
  const store = createSettingsStore({
    pluginDir: DIR,
    loadData: async () => (log.push('load'), over.loaded ?? null),
    saveData: async (data) => (log.push('save'), void saved.push(data)),
    adapter: {
      exists: async (p) => (log.push(`exists ${p}`), files.has(p)),
      copy: async (from, to) => {
        log.push(`copy ${from} -> ${to}`);
        if (over.copyFails) throw new Error('read-only');
        files.add(to);
      },
    },
  });
  return {store, log, saved, files};
}

describe('US-007 AC-10: reading', () => {
  it('read answers what loadData answers, copy and exists untouched', async () => {
    const {store, log} = fake([DATA], {loaded: {sheet: {margin: 12}}});
    expect(await store.read()).toEqual({sheet: {margin: 12}});
    expect(log).toEqual(['load']);
  });
});

describe('US-007 AC-10: the backup before the first write', () => {
  it('data.json exists, no backup yet: copied first, then saved', async () => {
    const {store, log, saved} = fake([DATA]);
    await store.write({sheet: {margin: 15}});
    expect(log).toEqual([
      `exists ${DATA}`,
      `exists ${BACKUP}`,
      `copy ${DATA} -> ${BACKUP}`,
      'save',
    ]);
    expect(saved).toEqual([{sheet: {margin: 15}}]);
  });
  it('a second write in the same session copies nothing and does not even ask', async () => {
    const {store, log} = fake([DATA]);
    await store.write({a: 1});
    log.length = 0;
    await store.write({a: 2});
    expect(log).toEqual(['save']);
  });
  it('an existing backup is never overwritten', async () => {
    const {store, log, saved} = fake([DATA, BACKUP]);
    await store.write({a: 1});
    expect(log.filter((l) => l.startsWith('copy'))).toEqual([]);
    expect(saved).toEqual([{a: 1}]);
  });
  it('no data.json: no copy, and the data is still saved', async () => {
    const {store, log, saved} = fake([]);
    await store.write({a: 1});
    expect(log.filter((l) => l.startsWith('copy'))).toEqual([]);
    expect(saved).toEqual([{a: 1}]);
  });
  it('a failed copy stops the write: nothing is saved and the error says what failed', async () => {
    const {store, saved} = fake([DATA], {copyFails: true});
    await expect(store.write({a: 1})).rejects.toThrow(
      'Could not back up data.json: read-only',
    );
    expect(saved).toEqual([]);
  });
  it('after a failed copy the next write tries the copy again', async () => {
    const calls: string[] = [];
    let fail = true;
    const store = createSettingsStore({
      pluginDir: DIR,
      loadData: async () => null,
      saveData: async () => void calls.push('save'),
      adapter: {
        exists: async (p) => p === DATA,
        copy: async () => {
          calls.push('copy');
          if (fail) throw new Error('busy');
        },
      },
    });
    await expect(store.write({})).rejects.toThrow('back up');
    fail = false;
    await store.write({});
    expect(calls).toEqual(['copy', 'copy', 'save']);
  });
  it('the only files the store touches are the backup (by copy) and data.json (by saveData): no other path is ever asked for', async () => {
    const {store, log} = fake([DATA]);
    await store.write({a: 1});
    const paths = log
      .filter((l) => l.startsWith('exists') || l.startsWith('copy'))
      .join(' ');
    for (const path of paths.match(/\S*\.json/g) ?? []) {
      expect([DATA, BACKUP]).toContain(path);
    }
  });
});

describe('US-007 AC-10 with a commit: a refused backup is a message, and the file is unchanged', () => {
  it('commitSetting reports the failed backup and writes nothing', async () => {
    const {store, saved} = fake([DATA], {copyFails: true});
    const r = await commitSetting(
      {store, vaultRoot: () => '/v'},
      'sheet.margin',
      '15',
    );
    expect(r).toEqual({
      ok: false,
      message:
        'Could not save the settings: Could not back up data.json: read-only',
    });
    expect(saved).toEqual([]);
  });
});
