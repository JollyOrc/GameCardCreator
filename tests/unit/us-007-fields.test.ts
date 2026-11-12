// US-007 AC-1, AC-3, AC-4: the table of the fields on the pages (what the tab
// builds its rows from), the value each field shows, and the key rule of a text
// or number field. Expected values: the story's pages and the defaults of
// US-001 to US-005. Red until the tickets.
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS} from '../../src/core/run/settings';
import {
  FIELDS,
  fieldKey,
  fieldsOf,
  valueOf,
} from '../../src/plugin/settings/fields';

describe('US-007 AC-1: the fields of the pages', () => {
  it('the main page has the output folder; Note properties the skill names and labels and the spell tags; Page and text size the sheet and the sizes', () => {
    expect(fieldsOf('main').map((f) => f.id)).toEqual(['outputFolder']);
    expect(fieldsOf('properties').map((f) => f.id)).toEqual([
      'skill.tagsProperty',
      'skill.timingProperty',
      'skill.timingLabel',
      'skill.kindProperty',
      'skill.kindLabel',
      'skill.requiresProperty',
      'skill.requiresLabel',
      'spell.tagsProperty',
    ]);
    expect(fieldsOf('layout').map((f) => f.id)).toEqual([
      'sheet.cardWidth',
      'sheet.cardHeight',
      'sheet.margin',
      'sheet.gap',
      'sheet.cutMarks',
      'skill.maxSize',
      'skill.minSize',
      'skill.sizeStep',
    ]);
  });
  it('17 fields in all, ids unique, every field has a label and a group', () => {
    expect(FIELDS).toHaveLength(17);
    expect(new Set(FIELDS.map((f) => f.id)).size).toBe(17);
    for (const f of FIELDS) {
      expect(f.label, f.id).not.toBe('');
      expect(f.group, f.id).not.toBe('');
    }
  });
  it('the kinds: numbers for the sheet sizes and text sizes, a toggle for the cut marks, text for the rest', () => {
    const kinds = Object.fromEntries(FIELDS.map((f) => [f.id, f.kind]));
    for (const id of [
      'sheet.cardWidth',
      'sheet.cardHeight',
      'sheet.margin',
      'sheet.gap',
      'skill.maxSize',
      'skill.minSize',
      'skill.sizeStep',
    ]) {
      expect(kinds[id], id).toBe('number');
    }
    expect(kinds['sheet.cutMarks']).toBe('toggle');
    expect(kinds['outputFolder']).toBe('text');
    expect(kinds['skill.tagsProperty']).toBe('text');
    expect(kinds['spell.tagsProperty']).toBe('text');
  });
  it('every field is on exactly one of the three pages', () => {
    const all = [
      ...fieldsOf('main'),
      ...fieldsOf('properties'),
      ...fieldsOf('layout'),
    ];
    expect(all.map((f) => f.id).sort()).toEqual(FIELDS.map((f) => f.id).sort());
  });
});

describe('US-007 AC-8: valueOf shows the setting, the defaults are the story table', () => {
  it.each([
    ['sheet.cardWidth', 62],
    ['sheet.cardHeight', 88],
    ['sheet.margin', 10],
    ['sheet.gap', 0],
    ['sheet.cutMarks', true],
    ['skill.maxSize', 7],
    ['skill.minSize', 5.5],
    ['skill.sizeStep', 0.25],
    ['skill.timingLabel', 'Time'],
    ['skill.kindLabel', 'Type'],
    ['skill.requiresLabel', 'Requires'],
    ['skill.tagsProperty', 'tags'],
    ['spell.tagsProperty', 'tags'],
    ['outputFolder', ''],
  ])('%s is %j by default', (id, expected) => {
    expect(valueOf(DEFAULT_CARDS, id)).toBe(expected);
  });
  it('valueOf reads a non-default setting', () => {
    const s = {
      ...DEFAULT_CARDS,
      outputFolder: '/out',
      sheet: {...DEFAULT_CARDS.sheet, margin: 15, cutMarks: false},
      skill: {...DEFAULT_CARDS.skill, maxSize: 8.5, kindLabel: 'Kind'},
      spell: {tagsProperty: 'labels'},
    };
    expect(valueOf(s, 'outputFolder')).toBe('/out');
    expect(valueOf(s, 'sheet.margin')).toBe(15);
    expect(valueOf(s, 'sheet.cutMarks')).toBe(false);
    expect(valueOf(s, 'skill.maxSize')).toBe(8.5);
    expect(valueOf(s, 'skill.kindLabel')).toBe('Kind');
    expect(valueOf(s, 'spell.tagsProperty')).toBe('labels');
  });
  it('an unknown id throws, naming it', () => {
    expect(() => valueOf(DEFAULT_CARDS, 'nope')).toThrow('nope');
  });
});

describe('US-007 AC-3: the key rule of a text or number field (SCAR-013)', () => {
  it('Enter commits; no other key does anything here', () => {
    expect(fieldKey({key: 'Enter'})).toBe('commit');
    expect(fieldKey({key: 'a'})).toBe('none');
    expect(fieldKey({key: 'Escape'})).toBe('none');
    expect(fieldKey({key: 'Tab'})).toBe('none');
  });
  it('Enter during an input-method composition does nothing (isComposing, or key code 229)', () => {
    expect(fieldKey({key: 'Enter', isComposing: true})).toBe('none');
    expect(fieldKey({key: 'Enter', keyCode: 229})).toBe('none');
    expect(fieldKey({key: 'Enter', isComposing: false, keyCode: 13})).toBe(
      'commit',
    );
  });
});
