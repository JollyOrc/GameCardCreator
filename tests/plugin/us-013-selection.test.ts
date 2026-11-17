// US-013 AC-1, AC-4, AC-6: the selection tree of the run dialog and the saved selection,
// as pure functions over the vault's paths and the kind rules (SCAR-031). Invented names
// (SCAR-035). Red until the code ticket (G2, 2026-11-17).
import {describe, expect, it} from 'vitest';
import type {KindRule} from '../../src/core/run/kinds';
import {
  buildTree,
  checkable,
  followDelete,
  followRename,
  initialChecked,
  plannedSavedRun,
  readSelection,
  runItems,
  saveForm,
  toggle,
  type TreeNode,
} from '../../src/plugin/run-dialog/selection';

const RULES: KindRule[] = [
  {folder: 'Skills', kind: 'skill'},
  {folder: 'Spells', kind: 'spell'},
];
const PATHS = [
  'Skills/B.md',
  'Skills/a.md',
  'Skills/Sub/C.md',
  'Spells/Stone Skin.md',
  'Notes/Loose.md',
  'Skills/pic.png',
  'Skills Extra/D.md',
  'Top.MD',
];
const tree = (): TreeNode => buildTree(PATHS, RULES);
const find = (node: TreeNode, path: string): TreeNode => {
  if (node.path === path) return node;
  for (const c of node.children) {
    const f = find(c, path) as TreeNode | undefined;
    if (f !== undefined) return f;
  }
  return undefined as never;
};
const names = (node: TreeNode): string[] => node.children.map((c) => c.name);

describe('US-013 AC-4: buildTree', () => {
  it('holds the notes (.md in any case) and their folders; other files are left out', () => {
    const t = tree();
    expect(t.name).toBe('');
    expect(t.path).toBe('');
    expect(t.isFolder).toBe(true);
    expect(names(t)).toEqual([
      'Notes',
      'Skills',
      'Skills Extra',
      'Spells',
      'Top.MD',
    ]);
    expect(names(find(t, 'Skills'))).toEqual(['a.md', 'B.md', 'Sub']);
    expect(find(t, 'Skills/pic.png')).toBeUndefined();
  });
  it('a note has the kind of its rule; a folder and a note without a rule have none', () => {
    const t = tree();
    expect(find(t, 'Skills/Sub/C.md').kind).toBe('skill');
    expect(find(t, 'Spells/Stone Skin.md').kind).toBe('spell');
    expect(find(t, 'Notes/Loose.md').kind).toBeNull();
    expect(find(t, 'Skills Extra/D.md').kind).toBeNull(); // a name prefix is not the folder
    expect(find(t, 'Skills').kind).toBeNull();
    expect(find(t, 'Skills').isFolder).toBe(true);
    expect(find(t, 'Skills/a.md').isFolder).toBe(false);
  });
  it('a folder holding no note is not in the tree', () => {
    const t = buildTree(['Art/x.png', 'Skills/a.md'], RULES);
    expect(names(t)).toEqual(['Skills']);
  });
});

describe('US-013 AC-4: checkable notes and the order of the cards', () => {
  it('the notes with a kind, by path without case (US-005 AC-2): a, B, C, then the spell', () => {
    expect(checkable(tree())).toEqual([
      'Skills/a.md',
      'Skills/B.md',
      'Skills/Sub/C.md',
      'Spells/Stone Skin.md',
    ]);
  });
  it('runItems gives the checked notes in that order, as files', () => {
    const t = tree();
    const checked = new Set([
      'Spells/Stone Skin.md',
      'Skills/B.md',
      'Skills/a.md',
    ]);
    expect(runItems(checked, t)).toEqual([
      {path: 'Skills/a.md', isFolder: false},
      {path: 'Skills/B.md', isFolder: false},
      {path: 'Spells/Stone Skin.md', isFolder: false},
    ]);
  });
});

describe('US-013 AC-4: checking', () => {
  it('a folder checks every note with a kind below it, and unchecks them again', () => {
    const t = tree();
    const on = toggle(new Set(), find(t, 'Skills'), true);
    expect([...on].sort()).toEqual([
      'Skills/B.md',
      'Skills/Sub/C.md',
      'Skills/a.md',
    ]);
    const off = toggle(on, find(t, 'Skills/Sub'), false);
    expect([...off].sort()).toEqual(['Skills/B.md', 'Skills/a.md']);
    expect([...on].sort()).toHaveLength(3); // a new set; the old one is unchanged
  });
  it('a note without a kind is never checked (greyed, O2)', () => {
    const t = tree();
    expect([...toggle(new Set(), find(t, 'Notes/Loose.md'), true)]).toEqual([]);
    expect([...toggle(new Set(), t, true)]).not.toContain('Notes/Loose.md');
  });
  it('the root checks every checkable note (Select all)', () => {
    const t = tree();
    expect([...toggle(new Set(), t, true)].sort()).toEqual(
      [...checkable(t)].sort(),
    );
  });
});

describe('US-013 AC-4: the saved form', () => {
  it('every checkable note checked is saved as all', () => {
    const t = tree();
    expect(saveForm(new Set(checkable(t)), t)).toBe('all');
  });
  it('fewer is saved as the list, in path order; nothing checked is the empty list', () => {
    const t = tree();
    expect(
      saveForm(new Set(['Spells/Stone Skin.md', 'Skills/B.md']), t),
    ).toEqual(['Skills/B.md', 'Spells/Stone Skin.md']);
    expect(saveForm(new Set(), t)).toEqual([]);
  });
  it('a vault without any note with a kind saves nothing checked as the empty list, not all (T1 mutant)', () => {
    const t = buildTree(['Notes/Loose.md'], RULES);
    expect(checkable(t)).toEqual([]);
    expect(saveForm(new Set(), t)).toEqual([]);
  });
  it('all opens with every checkable note checked, a new note included', () => {
    const t = buildTree([...PATHS, 'Skills/Reed Sweep.md'], RULES);
    expect(initialChecked(t, 'all').has('Skills/Reed Sweep.md')).toBe(true);
    expect(initialChecked(t, 'all').size).toBe(5);
  });
  it('a list opens with the listed notes that still exist and have a kind; null with none', () => {
    const t = tree();
    const c = initialChecked(t, ['Skills/B.md', 'Gone.md', 'Notes/Loose.md']);
    expect([...c]).toEqual(['Skills/B.md']);
    expect(initialChecked(t, null).size).toBe(0);
  });
});

describe('US-013 AC-4: readSelection (the file’s `selection` value)', () => {
  it.each([
    ['all', 'all'],
    [
      ['Skills/a.md', 3, 'Skills/B.md'],
      ['Skills/a.md', 'Skills/B.md'],
    ],
    [[], null],
    [[1, 2], null],
    ['some', null],
    [undefined, null],
    [{a: 1}, null],
  ])('%j gives %j', (raw, expected) => {
    expect(readSelection(raw)).toEqual(expected);
  });
});

describe('US-013 AC-6: the saved selection follows renames and deletes', () => {
  it('a renamed note stays selected under its new path', () => {
    expect(
      followRename(
        ['Skills/Reed Sweep.md', 'Skills/a.md'],
        'Skills/Reed Sweep.md',
        'Skills/Reed Sweep II.md',
      ),
    ).toEqual(['Skills/Reed Sweep II.md', 'Skills/a.md']);
  });
  it('a renamed folder moves the notes below it, by path segments only', () => {
    expect(
      followRename(
        ['A/x.md', 'A/Sub/y.md', 'A 2/z.md', 'AB/w.md'],
        'A',
        'Renamed',
      ),
    ).toEqual(['Renamed/x.md', 'Renamed/Sub/y.md', 'A 2/z.md', 'AB/w.md']);
  });
  it('all and null are unchanged by a rename', () => {
    expect(followRename('all', 'A', 'B')).toBe('all');
    expect(followRename(null, 'A', 'B')).toBeNull();
  });
  it('a deleted note or folder drops out, siblings with the same prefix stay', () => {
    expect(followDelete(['A/x.md', 'A 2/z.md', 'B.md'], 'A')).toEqual([
      'A 2/z.md',
      'B.md',
    ]);
    expect(followDelete(['A/x.md', 'B.md'], 'B.md')).toEqual(['A/x.md']);
    expect(followDelete('all', 'A')).toBe('all');
    expect(followDelete(null, 'A')).toBeNull();
  });
});

describe('US-013 AC-1: the command "Create cards from the saved selection"', () => {
  const NOTHING =
    'Nothing selected yet. Open "Create cards…" and choose notes.';
  it('no saved selection: refused with the notice, nothing run', () => {
    expect(plannedSavedRun(null, tree())).toEqual({ok: false, notice: NOTHING});
  });
  it('a saved list whose notes are all gone or without a kind: the same refusal', () => {
    expect(plannedSavedRun(['Gone.md', 'Notes/Loose.md'], tree())).toEqual({
      ok: false,
      notice: NOTHING,
    });
  });
  it('all: every checkable note, in path order', () => {
    const planned = plannedSavedRun('all', tree());
    expect(planned).toEqual({
      ok: true,
      items: checkable(tree()).map((path) => ({path, isFolder: false})),
    });
  });
  it('a list: the notes that still exist, in path order', () => {
    expect(
      plannedSavedRun(
        ['Spells/Stone Skin.md', 'Skills/B.md', 'Gone.md'],
        tree(),
      ),
    ).toEqual({
      ok: true,
      items: [
        {path: 'Skills/B.md', isFolder: false},
        {path: 'Spells/Stone Skin.md', isFolder: false},
      ],
    });
  });
});
