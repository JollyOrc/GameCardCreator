// US-007 AC-1, AC-6 (D4): the two pure helpers the tab builds from: the fields grouped under
// their headings, and the vault's folders suggested for a rule's folder field. Red until #19.
import {describe, expect, it} from 'vitest';
import {groupsOf} from '../../src/plugin/settings/fields';
import {suggestFolders} from '../../src/plugin/settings/rules';

describe('US-007 AC-1: groupsOf', () => {
  it('the layout page has the Sheet group (5 fields) then Text size (3)', () => {
    const groups = groupsOf('layout');
    expect(groups.map((g) => [g.group, g.fields.length])).toEqual([
      ['Sheet', 5],
      ['Text size', 3],
    ]);
    expect(groups[0]!.fields[0]!.id).toBe('sheet.cardWidth');
    expect(groups[1]!.fields.map((f) => f.id)).toEqual([
      'skill.maxSize',
      'skill.minSize',
      'skill.sizeStep',
    ]);
  });
  it('the properties page has Skill notes (7), Spell notes (1) then Creature notes (3); the main page one group', () => {
    expect(
      groupsOf('properties').map((g) => [g.group, g.fields.length]),
    ).toEqual([
      ['Skill notes', 7],
      ['Spell notes', 1],
      ['Creature notes', 3],
    ]);
    expect(groupsOf('main').map((g) => [g.group, g.fields.length])).toEqual([
      ['Output', 1],
    ]);
  });
  it("every field of a page is in exactly one group, in the page's order", () => {
    for (const page of ['main', 'properties', 'layout'] as const) {
      const ids = groupsOf(page).flatMap((g) => g.fields.map((f) => f.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('US-007 AC-6, D4: suggestFolders', () => {
  const FOLDERS = [
    '/',
    'Skills',
    'Skills/Combat',
    'Skills/General',
    'spells',
    'Spells/Old',
    '.obsidian',
    '.obsidian/plugins',
    'Notes/.hidden',
    'Decks',
  ];
  it('a text that is part of a folder (without case) suggests it, sorted without case', () => {
    expect(suggestFolders('sk', FOLDERS)).toEqual([
      'Skills',
      'Skills/Combat',
      'Skills/General',
    ]);
    expect(suggestFolders('SPELL', FOLDERS)).toEqual(['spells', 'Spells/Old']);
  });
  it('the text is trimmed; a text that matches nothing suggests nothing', () => {
    expect(suggestFolders('  decks ', FOLDERS)).toEqual(['Decks']);
    expect(suggestFolders('zzz', FOLDERS)).toEqual([]);
  });
  it('an empty text suggests every folder except the root and the hidden ones', () => {
    expect(suggestFolders('', FOLDERS)).toEqual([
      'Decks',
      'Skills',
      'Skills/Combat',
      'Skills/General',
      'spells',
      'Spells/Old',
    ]);
  });
  it('at most `limit` are suggested, the first by the sorted order', () => {
    expect(suggestFolders('', FOLDERS, 2)).toEqual(['Decks', 'Skills']);
    expect(
      suggestFolders(
        '',
        Array.from({length: 50}, (_, i) => `f${i}`),
      ),
    ).toHaveLength(20);
  });
  it('the list is read as given: no folders, no suggestions', () => {
    expect(suggestFolders('a', [])).toEqual([]);
  });
});
