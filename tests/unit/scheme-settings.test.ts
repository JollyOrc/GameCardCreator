// US-009 AC-1, AC-11, AC-15: the two new settings (`schemeNote`, `sheet.bleed`):
// defaults, their checks, the settings file, the fields of the screen and the
// status line. Expected texts come from the story; every number is tested at the
// default, at both ends of its range and at a middle value (SCAR-019).
// Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_CARDS,
  checkCardSettings,
  checkCardsSettings,
} from '../../src/core/run/settings';
import {
  DEFAULT_SHEET,
  checkSettings as checkSheet,
} from '../../src/core/sheet/layout';
import {checkSchemeNote} from '../../src/core/scheme/settings';
import {readSettingsFile} from '../../src/plugin/settings-file';
import {FIELDS, fieldsOf, valueOf} from '../../src/plugin/settings/fields';
import {schemeLine} from '../../src/plugin/settings/status';

const MSG = (p: string) =>
  `The scheme note "${p}" must be a vault path ending in .md (no leading /, no \\ and no ..)`;

describe('US-009: the defaults', () => {
  it('no scheme note and no bleed: the feature is off', () => {
    expect(DEFAULT_CARDS.schemeNote).toBe('');
    expect(DEFAULT_SHEET.bleed).toBe(0);
  });
});

describe('US-009 AC-1: the scheme note path', () => {
  it.each([
    '',
    'Branch Scheme.md',
    'Layouting/Branch Scheme.md',
    'a/b/c.md',
    'a..b.md',
    'Notes/.hidden.md',
    'UPPER.MD',
  ])('%j is accepted', (p) => {
    expect(checkSchemeNote(p)).toEqual([]);
  });
  it.each([
    '/Layouting/Branch Scheme.md',
    '../Branch Scheme.md',
    'a/../b.md',
    'a/b/..',
    'Branch Scheme.txt',
    'Branch Scheme',
    'Layouting/',
    'a\\b.md',
    '   ',
  ])('%j is refused with one message', (p) => {
    expect(checkSchemeNote(p)).toEqual([MSG(p)]);
  });
  it('surrounding spaces do not count: " a.md " is accepted', () => {
    expect(checkSchemeNote(' a.md ')).toEqual([]);
  });
  it('the card settings check includes it, after the others', () => {
    expect(checkCardSettings({...DEFAULT_CARDS, schemeNote: '/x.md'})).toEqual([
      MSG('/x.md'),
    ]);
    expect(
      checkCardsSettings(
        {
          ...DEFAULT_CARDS,
          schemeNote: 'x.txt',
          outputFolder: '/out',
          kindRules: [{folder: 'a', kind: 'skill'}],
        },
        '/v',
      ),
    ).toEqual([MSG('x.txt')]);
  });
});

describe('US-009 AC-15: the bleed setting', () => {
  const sheet = (over: object) => ({...DEFAULT_SHEET, ...over});
  it.each([0, 0.5, 1])(
    '%s mm is accepted (cut marks on: at most 1 mm)',
    (b) => {
      expect(checkSheet(sheet({bleed: b}))).toEqual([]);
    },
  );
  it.each([2, 3])('%s mm is accepted when the cut marks are off', (b) => {
    expect(checkSheet(sheet({bleed: b, cutMarks: false}))).toEqual([]);
  });
  it('outside 0 to 3 mm is refused, naming the value', () => {
    expect(checkSheet(sheet({bleed: -0.1}))).toEqual([
      'bleed -0.1 is outside 0 to 3 mm',
    ]);
    expect(checkSheet(sheet({bleed: 3.5, cutMarks: false}))).toEqual([
      'bleed 3.5 is outside 0 to 3 mm',
    ]);
    expect(checkSheet(sheet({bleed: Number.NaN}))).toEqual([
      'bleed NaN is outside 0 to 3 mm',
    ]);
  });
  it('above the margin is refused (cut marks off, so only the margin limits it)', () => {
    expect(checkSheet(sheet({bleed: 2, margin: 1, cutMarks: false}))).toEqual([
      'bleed 2 is above the margin 1 mm',
    ]);
  });
  it('equal to the margin is accepted', () => {
    expect(checkSheet(sheet({bleed: 2, margin: 2, cutMarks: false}))).toEqual(
      [],
    );
  });
  it('with cut marks on, more than the 1 mm that keeps them free is refused', () => {
    expect(checkSheet(sheet({bleed: 2, cutMarks: true}))).toEqual([
      'bleed 2 is above 1 mm, the distance of the cut marks',
    ]);
  });
  it('a margin that is itself refused is not compared with the bleed (one mistake, one message)', () => {
    expect(checkSheet(sheet({margin: -1, bleed: 0}))).toEqual([
      'margin -1 is outside 0 to 50 mm',
    ]);
    expect(
      checkSheet(sheet({margin: Number.NaN, bleed: 1, cutMarks: false})),
    ).toEqual(['margin NaN is outside 0 to 50 mm']);
  });
  it('one mistake gives one message: a bleed outside the range is not also above the margin', () => {
    expect(checkSheet(sheet({bleed: 5, margin: 1, cutMarks: false}))).toEqual([
      'bleed 5 is outside 0 to 3 mm',
    ]);
  });
});

describe('US-009: the settings file', () => {
  it('no file: the defaults, no notice', () => {
    const r = readSettingsFile({});
    expect(r.settings.schemeNote).toBe('');
    expect(r.settings.sheet.bleed).toBe(0);
    expect(r.notice).toBeNull();
  });
  it('the values are read; the other keys stay', () => {
    const r = readSettingsFile({
      schemeNote: 'Layouting/Branch Scheme.md',
      sheet: {bleed: 1},
    });
    expect(r.settings.schemeNote).toBe('Layouting/Branch Scheme.md');
    expect(r.settings.sheet).toEqual({...DEFAULT_SHEET, bleed: 1});
    expect(r.notice).toBeNull();
  });
  it('a value of the wrong type is ignored and named in the one notice', () => {
    const r = readSettingsFile({schemeNote: 3, sheet: {bleed: 'wide'}});
    expect(r.settings.schemeNote).toBe('');
    expect(r.settings.sheet.bleed).toBe(0);
    expect(r.notice).toBe('Settings file: ignored sheet.bleed, schemeNote');
  });
});

describe('US-009 AC-11: the fields', () => {
  it('a text field Scheme note on the properties page, a number field Bleed on the layout page', () => {
    const scheme = FIELDS.find((f) => f.id === 'schemeNote');
    const bleed = FIELDS.find((f) => f.id === 'sheet.bleed');
    expect(scheme).toMatchObject({
      page: 'properties',
      group: 'Scheme note',
      label: 'Scheme note',
      kind: 'text',
    });
    expect(bleed).toMatchObject({
      page: 'layout',
      group: 'Sheet',
      label: 'Bleed',
      kind: 'number',
    });
  });
  it('they are the last of their pages', () => {
    expect(fieldsOf('properties').at(-1)!.id).toBe('schemeNote');
    expect(fieldsOf('layout').map((f) => f.id)).toContain('sheet.bleed');
  });
  it('the screen shows the setting as it is, and 22 fields in all', () => {
    expect(valueOf({...DEFAULT_CARDS, schemeNote: 'x.md'}, 'schemeNote')).toBe(
      'x.md',
    );
    expect(
      valueOf(
        {...DEFAULT_CARDS, sheet: {...DEFAULT_SHEET, bleed: 1}},
        'sheet.bleed',
      ),
    ).toBe(1);
    expect(valueOf(DEFAULT_CARDS, 'sheet.bleed')).toBe(0);
    expect(FIELDS).toHaveLength(22);
  });
});

describe('US-009 AC-11: the line under the field', () => {
  const set = {...DEFAULT_CARDS, schemeNote: 'Layouting/Branch Scheme.md'};
  it('nothing without a scheme note', () => {
    expect(schemeLine(DEFAULT_CARDS, null)).toBeNull();
    expect(schemeLine(DEFAULT_CARDS, false)).toBeNull();
  });
  it('the note is in the vault: its path', () => {
    expect(schemeLine(set, true)).toBe(
      'Scheme note: Layouting/Branch Scheme.md',
    );
  });
  it('the note is not in the vault', () => {
    expect(schemeLine(set, false)).toBe('Scheme note: not found');
  });
  it('not known yet (the vault has not answered): nothing', () => {
    expect(schemeLine(set, null)).toBeNull();
  });
});
