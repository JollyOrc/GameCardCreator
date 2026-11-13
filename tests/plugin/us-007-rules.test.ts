// US-007 AC-6 (D4, D15): the kind rules: a row is set (a new one appended at
// the end) or deleted; a rule is saved when it passes `checkKindRules`; a folder
// that is not in the vault warns and is saved; the file is loaded for every
// change; deleting asks nothing. Red until the tickets.
import {describe, expect, it} from 'vitest';
import {commitRule} from '../../src/plugin/settings/rules';
import {memoryStore} from '../support/memory-store';

const folders = new Set(['Skills', 'Spells', 'Skills/Combat']);
const deps = (store: ReturnType<typeof memoryStore>) => ({
  store,
  vaultRoot: () => '/v',
  folderExists: (folder: string) => folders.has(folder),
});

describe('US-007 AC-6: setting and appending rules', () => {
  it('a new row (index = the number of rules) is appended; a folder in the vault gives no warning', async () => {
    const store = memoryStore(null);
    const r = await commitRule(deps(store), {
      op: 'set',
      index: 0,
      rule: {folder: 'Skills', kind: 'skill'},
    });
    expect(r).toEqual({ok: true, warnings: []});
    expect(store.file()).toEqual({
      kindRules: [{folder: 'Skills', kind: 'skill'}],
    });
  });
  it('the rules are saved in the order shown; an existing row is replaced in place', async () => {
    const store = memoryStore({
      kindRules: [
        {folder: 'Skills', kind: 'skill'},
        {folder: 'Spells', kind: 'spell'},
      ],
    });
    await commitRule(deps(store), {
      op: 'set',
      index: 2,
      rule: {folder: 'Skills/Combat', kind: 'spell'},
    });
    await commitRule(deps(store), {
      op: 'set',
      index: 0,
      rule: {folder: 'Skills', kind: 'spell'},
    });
    expect(store.file()).toEqual({
      kindRules: [
        {folder: 'Skills', kind: 'spell'},
        {folder: 'Spells', kind: 'spell'},
        {folder: 'Skills/Combat', kind: 'spell'},
      ],
    });
  });
  it('a folder that does not exist in the vault warns and is saved (D4)', async () => {
    const store = memoryStore(null);
    const r = await commitRule(deps(store), {
      op: 'set',
      index: 0,
      rule: {folder: 'Nowhere', kind: 'skill'},
    });
    expect(r).toEqual({
      ok: true,
      warnings: ['The folder "Nowhere" is not in the vault'],
    });
    expect(store.file()).toEqual({
      kindRules: [{folder: 'Nowhere', kind: 'skill'}],
    });
  });
  it('the warning looks at the folder without surrounding spaces and a trailing slash', async () => {
    const store = memoryStore(null);
    const r = await commitRule(deps(store), {
      op: 'set',
      index: 0,
      rule: {folder: ' Skills/ ', kind: 'skill'},
    });
    expect(r).toEqual({ok: true, warnings: []});
  });
});

describe('US-007 AC-6: refused rules are not saved, with the messages of checkKindRules', () => {
  it.each([
    [{folder: '', kind: 'skill'}, 'Kind rule 1: the folder is empty'],
    [{folder: '  ', kind: 'skill'}, 'Kind rule 1: the folder is empty'],
    [
      {folder: 'Skills', kind: 'monster'},
      'Kind rule 1: the kind "monster" is not skill, spell or creature',
    ],
  ])('%j gives %s', async (rule, message) => {
    const store = memoryStore(null);
    const r = await commitRule(deps(store), {
      op: 'set',
      index: 0,
      rule: rule as never,
    });
    expect(r).toEqual({ok: false, message});
    expect(store.writes).toEqual([]);
  });
  it('a folder named by two rules is refused, naming the second rule', async () => {
    const store = memoryStore({kindRules: [{folder: 'Skills', kind: 'skill'}]});
    const r = await commitRule(deps(store), {
      op: 'set',
      index: 1,
      rule: {folder: 'Skills/', kind: 'spell'},
    });
    expect(r).toEqual({
      ok: false,
      message: 'Kind rule 2: the same folder "Skills" is named by two rules',
    });
    expect(store.writes).toEqual([]);
  });
  it('a problem already in the rules (a hand edit) does not block a good change to another row', async () => {
    const store = memoryStore({
      kindRules: [
        {folder: '', kind: 'skill'},
        {folder: 'Spells', kind: 'spell'},
      ],
    });
    const r = await commitRule(deps(store), {
      op: 'set',
      index: 1,
      rule: {folder: 'Spells', kind: 'skill'},
    });
    expect(r.ok).toBe(true);
  });
});

describe('US-007 AC-6, D15: deleting', () => {
  it('removes the row at the index and saves; asks nothing; the other rules keep their order', async () => {
    const store = memoryStore({
      kindRules: [
        {folder: 'Skills', kind: 'skill'},
        {folder: 'Spells', kind: 'spell'},
        {folder: 'Skills/Combat', kind: 'skill'},
      ],
    });
    const r = await commitRule(deps(store), {op: 'delete', index: 1});
    expect(r).toEqual({ok: true, warnings: []});
    expect(store.file()).toEqual({
      kindRules: [
        {folder: 'Skills', kind: 'skill'},
        {folder: 'Skills/Combat', kind: 'skill'},
      ],
    });
  });
  it('deleting the last rule leaves an empty list (the status line then says so)', async () => {
    const store = memoryStore({kindRules: [{folder: 'Skills', kind: 'skill'}]});
    await commitRule(deps(store), {op: 'delete', index: 0});
    expect(store.file()).toEqual({kindRules: []});
  });
  it('an index that is not in the file now (it changed while the tab was open) is refused, nothing is written', async () => {
    const store = memoryStore({kindRules: [{folder: 'Skills', kind: 'skill'}]});
    const r = await commitRule(deps(store), {op: 'delete', index: 3});
    expect(r).toEqual({
      ok: false,
      message: 'The rules changed: open the page again',
    });
    expect(store.writes).toEqual([]);
    const set = await commitRule(deps(store), {
      op: 'set',
      index: 5,
      rule: {folder: 'Spells', kind: 'spell'},
    });
    expect(set).toEqual({
      ok: false,
      message: 'The rules changed: open the page again',
    });
  });
});

describe('US-007 AC-6, AC-10, AC-11: the file', () => {
  it('rules that are not a list in the file are replaced by the new one; other keys stay', async () => {
    const store = memoryStore({
      kindRules: 'Skills',
      outputFolder: '/out',
      future: 1,
    });
    await commitRule(deps(store), {
      op: 'set',
      index: 0,
      rule: {folder: 'Skills', kind: 'skill'},
    });
    expect(store.file()).toEqual({
      kindRules: [{folder: 'Skills', kind: 'skill'}],
      outputFolder: '/out',
      future: 1,
    });
  });
  it('every change loads the file again (a hand edit between two changes is kept)', async () => {
    const store = memoryStore({kindRules: [{folder: 'Skills', kind: 'skill'}]});
    await commitRule(deps(store), {
      op: 'set',
      index: 1,
      rule: {folder: 'Spells', kind: 'spell'},
    });
    store.set({
      kindRules: [
        {folder: 'Skills', kind: 'skill'},
        {folder: 'Spells', kind: 'spell'},
        {folder: 'Misc', kind: 'skill'},
      ],
    });
    await commitRule(deps(store), {op: 'delete', index: 0});
    expect(store.file()).toEqual({
      kindRules: [
        {folder: 'Spells', kind: 'spell'},
        {folder: 'Misc', kind: 'skill'},
      ],
    });
    expect(store.reads).toBe(2);
  });
  it('changes started at once run one after the other and lose nothing', async () => {
    const store = memoryStore({}, 15);
    const results = await Promise.all([
      commitRule(deps(store), {
        op: 'set',
        index: 0,
        rule: {folder: 'Skills', kind: 'skill'},
      }),
      commitRule(deps(store), {
        op: 'set',
        index: 1,
        rule: {folder: 'Spells', kind: 'spell'},
      }),
    ]);
    expect(results.map((r) => r.ok)).toEqual([true, true]);
    expect(store.file()).toEqual({
      kindRules: [
        {folder: 'Skills', kind: 'skill'},
        {folder: 'Spells', kind: 'spell'},
      ],
    });
  }, 10_000);
  it('a rule commit and a field commit share one queue: both survive when started at once', async () => {
    const store = memoryStore({}, 15);
    const {commitSetting} = await import('../../src/plugin/settings/commit');
    const [a, b] = await Promise.all([
      commitRule(deps(store), {
        op: 'set',
        index: 0,
        rule: {folder: 'Skills', kind: 'skill'},
      }),
      commitSetting({store, vaultRoot: () => '/v'}, 'sheet.gap', '2'),
    ]);
    expect([a.ok, b.ok]).toEqual([true, true]);
    expect(store.file()).toEqual({
      kindRules: [{folder: 'Skills', kind: 'skill'}],
      sheet: {gap: 2},
    });
  }, 10_000);
});
