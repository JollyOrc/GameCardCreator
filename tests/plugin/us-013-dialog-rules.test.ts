// US-013 AC-2, AC-3, AC-5: the run dialog's rules as pure functions (SCAR-013, SCAR-016,
// SCAR-031, SCAR-033): the destination line, when the button is enabled, what a key does,
// and the values saved when the run starts. Red until the code ticket (G2, 2026-11-17).
import {describe, expect, it} from 'vitest';
import {
  canRun,
  destinationLine,
  runDialogKey,
  saveRunChoices,
  saveSelection,
  updateSelection,
} from '../../src/plugin/run-dialog/rules';
import {selectionFollowers} from '../../src/plugin/run-dialog/deps';
import {runSavedSelection} from '../../src/plugin/run-dialog/dialog';
import {openSettingsTab} from '../../src/plugin/obsidian-deps';
import {memoryStore} from '../support/memory-store';

describe('US-013 AC-3: what is at the destination', () => {
  it('no file: will be created', () => {
    expect(destinationLine('Cards cards.pdf', null)).toBe(
      'Cards cards.pdf will be created.',
    );
  });
  it('a file: its local date and time, and the question to come (O3)', () => {
    expect(
      destinationLine('Cards cards.pdf', new Date(2026, 10, 17, 14, 2)),
    ).toBe(
      'Cards cards.pdf exists (from 2026-11-17 14:02) and will be replaced after a question.',
    );
  });
  it('one-digit months, days, hours and minutes get a leading zero', () => {
    expect(
      destinationLine('Skills cards.pdf', new Date(2027, 0, 5, 9, 7)),
    ).toContain('(from 2027-01-05 09:07)');
  });
});

describe('US-013 AC-2: the button `Create cards`', () => {
  it.each([
    [true, 3, true],
    [true, 1, true],
    [true, 0, false],
    [false, 3, false],
    [false, 0, false],
  ])('folder ok %s, %i checked: enabled %s', (ok, checked, enabled) => {
    expect(canRun({ok}, checked)).toBe(enabled);
  });
});

describe('US-013 AC-5: keys in the dialog (SCAR-013)', () => {
  it('Enter runs when the button is enabled, and does nothing when it is not', () => {
    expect(runDialogKey({key: 'Enter'}, true)).toBe('run');
    expect(runDialogKey({key: 'Enter'}, false)).toBe('none');
  });
  it('Escape cancels, enabled or not', () => {
    expect(runDialogKey({key: 'Escape'}, true)).toBe('cancel');
    expect(runDialogKey({key: 'Escape'}, false)).toBe('cancel');
  });
  it('nothing happens during an input-method composition', () => {
    expect(runDialogKey({key: 'Enter', isComposing: true}, true)).toBe('none');
    expect(runDialogKey({key: 'Enter', keyCode: 229}, true)).toBe('none');
    expect(runDialogKey({key: 'Escape', isComposing: true}, true)).toBe('none');
  });
  it('other keys do nothing', () => {
    expect(runDialogKey({key: 'a'}, true)).toBe('none');
    expect(runDialogKey({key: 'Tab'}, true)).toBe('none');
  });
});

describe('US-013 AC-5: the values saved when the run starts', () => {
  const deps = (store: ReturnType<typeof memoryStore>) => ({
    store,
    vaultRoot: () => '/v',
  });
  it('writes the folder (normal form) and the selection once, keeping every other key', async () => {
    const store = memoryStore({
      outputFolder: '/old',
      kindRules: [{folder: 'Skills', kind: 'skill'}],
      unknownKey: 7,
    });
    const result = await saveRunChoices(deps(store), {
      outputFolder: '/out//cards/',
      selection: ['Skills/a.md'],
    });
    expect(result.ok).toBe(true);
    expect(store.writes).toHaveLength(1);
    expect(store.file()).toEqual({
      outputFolder: '/out/cards',
      kindRules: [{folder: 'Skills', kind: 'skill'}],
      unknownKey: 7,
      selection: ['Skills/a.md'],
    });
  });
  it('all is saved as the text all', async () => {
    const store = memoryStore({});
    await saveRunChoices(deps(store), {outputFolder: '/out', selection: 'all'});
    expect(store.file()).toEqual({outputFolder: '/out', selection: 'all'});
  });
  it('a refused folder saves nothing and answers the check’s message (SCAR-033)', async () => {
    const store = memoryStore({outputFolder: '/old'});
    const result = await saveRunChoices(deps(store), {
      outputFolder: 'relative/path',
      selection: 'all',
    });
    expect(result).toEqual({
      ok: false,
      message: 'Output folder "relative/path" is not an absolute path',
    });
    expect(store.writes).toHaveLength(0);
  });
  it('reads the file at the call, so a hand edit made meanwhile is kept (SCAR-016)', async () => {
    const store = memoryStore({outputFolder: '/old'});
    store.set({outputFolder: '/old', schemeNote: 'Edited.md'});
    await saveRunChoices(deps(store), {outputFolder: '/out', selection: 'all'});
    expect(store.file()).toEqual({
      outputFolder: '/out',
      schemeNote: 'Edited.md',
      selection: 'all',
    });
  });
});

describe('US-013 AC-4, AC-6: saving and updating the selection alone (T6)', () => {
  it('Save selection writes only the selection, keeping every other key, once', async () => {
    const store = memoryStore({outputFolder: '/out', unknownKey: 1});
    const result = await saveSelection({store}, ['Skills/a.md']);
    expect(result.ok).toBe(true);
    expect(store.writes).toHaveLength(1);
    expect(store.file()).toEqual({
      outputFolder: '/out',
      unknownKey: 1,
      selection: ['Skills/a.md'],
    });
  });
  it('a rename changes the stored selection through the given change', async () => {
    const store = memoryStore({selection: ['A/x.md', 'B.md'], other: 2});
    await updateSelection({store}, (s) =>
      s === null || s === 'all'
        ? s
        : s.map((p) => (p === 'A/x.md' ? 'A/y.md' : p)),
    );
    expect(store.file()).toEqual({selection: ['A/y.md', 'B.md'], other: 2});
  });
  it('no change, no write (a rename elsewhere in the vault)', async () => {
    const store = memoryStore({selection: 'all'});
    await updateSelection({store}, (s) => s);
    await updateSelection({store}, (s) => s);
    expect(store.writes).toHaveLength(0);
  });
  it('a selection that becomes empty is removed from the file', async () => {
    const store = memoryStore({selection: ['A/x.md'], other: 2});
    await updateSelection({store}, () => []);
    expect(store.file()).toEqual({other: 2});
  });
});

describe('US-013 AC-6: selectionFollowers (the vault event handlers, T6)', () => {
  it('a rename and a delete update the stored selection by path segments', async () => {
    const store = memoryStore({selection: ['A/x.md', 'A 2/y.md', 'B.md']});
    const follow = selectionFollowers({store});
    follow.onRename({path: 'Renamed'}, 'A');
    follow.onDelete({path: 'B.md'});
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(store.file()).toEqual({selection: ['Renamed/x.md', 'A 2/y.md']});
  });
});

describe('US-013 AC-1: runSavedSelection (the command without the dialog, T6)', () => {
  const depsWith = (file: unknown, paths: string[]) => {
    const notices: string[] = [];
    const runs: unknown[] = [];
    const deps = {
      store: memoryStore(file),
      vaultRoot: () => '/v',
      paths: () => paths,
      modifiedAt: async () => null,
      folderEnv: () => ({}),
      home: () => '',
      exists: async () => false,
      openSettings: () => undefined,
      run: async (items: unknown) => void runs.push(items),
      notice: (t: string) => void notices.push(t),
    };
    return {deps, notices, runs};
  };
  const RULES = [{folder: 'Skills', kind: 'skill'}];
  it('runs the saved notes that are checkable now, in path order', async () => {
    const {deps, notices, runs} = depsWith(
      {kindRules: RULES, selection: ['Skills/b.md', 'Skills/A.md', 'Gone.md']},
      ['Skills/A.md', 'Skills/b.md', 'Notes/x.md'],
    );
    await runSavedSelection(deps);
    expect(notices).toEqual([]);
    expect(runs).toEqual([
      [
        {path: 'Skills/A.md', isFolder: false},
        {path: 'Skills/b.md', isFolder: false},
      ],
    ]);
  });
  it('nothing saved: the notice, no run', async () => {
    const {deps, notices, runs} = depsWith({kindRules: RULES}, ['Skills/A.md']);
    await runSavedSelection(deps);
    expect(notices).toEqual([
      'Nothing selected yet. Open "Create cards…" and choose notes.',
    ]);
    expect(runs).toEqual([]);
  });
});

describe('US-013 AC-2: openSettingsTab (the private app.setting, T6)', () => {
  it('opens the settings, then the tab by id', () => {
    const calls: string[] = [];
    openSettingsTab(
      {
        setting: {
          open: () => calls.push('open'),
          openTabById: (id: string) => calls.push(`tab ${id}`),
        },
      },
      'game-card-creator',
    );
    expect(calls).toEqual(['open', 'tab game-card-creator']);
  });
  it('without app.setting nothing happens and nothing throws', () => {
    expect(() => openSettingsTab({}, 'x')).not.toThrow();
    expect(() => openSettingsTab({setting: {open: 1}}, 'x')).not.toThrow();
  });
});
