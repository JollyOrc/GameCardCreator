// US-008 AC-4: the settings read from the plugin's data.json (until US-007).
// Expected values from the story's notices and from the defaults of US-001 to
// US-005. Red until the tickets.
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS} from '../../src/core/run/settings';
import {readSettingsFile} from '../../src/plugin/settings-file';

describe('US-008 AC-4: readSettingsFile', () => {
  it('no file (null) or an empty object: the defaults, no notice', () => {
    expect(readSettingsFile(null)).toEqual({
      settings: DEFAULT_CARDS,
      notice: null,
    });
    expect(readSettingsFile({})).toEqual({
      settings: DEFAULT_CARDS,
      notice: null,
    });
  });
  it("the author's keys are taken; the rest stays default", () => {
    const r = readSettingsFile({
      outputFolder: '/out',
      kindRules: [{folder: 'Skills', kind: 'skill'}],
    });
    expect(r.notice).toBeNull();
    expect(r.settings.outputFolder).toBe('/out');
    expect(r.settings.kindRules).toEqual([{folder: 'Skills', kind: 'skill'}]);
    expect(r.settings.sheet).toEqual(DEFAULT_CARDS.sheet);
    expect(r.settings.skill).toEqual(DEFAULT_CARDS.skill);
  });
  it('a nested object is merged key by key: one sheet value changes, the others stay', () => {
    const r = readSettingsFile({
      sheet: {margin: 15},
      skill: {maxSize: 8, kindLabel: 'Kind'},
      spell: {tagsProperty: 'labels'},
    });
    expect(r.notice).toBeNull();
    expect(r.settings.sheet).toEqual({...DEFAULT_CARDS.sheet, margin: 15});
    expect(r.settings.skill).toEqual({
      ...DEFAULT_CARDS.skill,
      maxSize: 8,
      kindLabel: 'Kind',
    });
    expect(r.settings.spell).toEqual({tagsProperty: 'labels'});
  });
  it('a value of the wrong type is ignored and named, the others are kept', () => {
    const r = readSettingsFile({
      outputFolder: 5,
      sheet: {margin: '15', gap: 2},
      skill: {maxSize: 'big'},
      kindRules: 'Skills',
    });
    expect(r.settings.outputFolder).toBe('');
    expect(r.settings.sheet).toEqual({...DEFAULT_CARDS.sheet, gap: 2});
    expect(r.settings.skill.maxSize).toBe(7);
    expect(r.settings.kindRules).toEqual([]);
    expect(r.notice).toBe(
      'Settings file: ignored outputFolder, sheet.margin, skill.maxSize, kindRules',
    );
  });
  it('kind rules of the wrong shape are ignored as a whole and named', () => {
    const r = readSettingsFile({
      kindRules: [{folder: 'A', kind: 'skill'}, 'oops', {folder: 3}],
    });
    expect(r.settings.kindRules).toEqual([]);
    expect(r.notice).toBe('Settings file: ignored kindRules');
  });
  it('a nested key that is not an object is ignored and named', () => {
    const r = readSettingsFile({sheet: 'wide'});
    expect(r.settings.sheet).toEqual(DEFAULT_CARDS.sheet);
    expect(r.notice).toBe('Settings file: ignored sheet');
  });
  it.each([['text'], [5], [true], [[1, 2]]])(
    '%j is not an object: the defaults and one notice',
    (raw) => {
      expect(readSettingsFile(raw)).toEqual({
        settings: DEFAULT_CARDS,
        notice: 'Settings file: not an object, using the defaults',
      });
    },
  );
  it('unknown keys are ignored silently, at both levels', () => {
    const r = readSettingsFile({future: 1, sheet: {margin: 12, colour: 'red'}});
    expect(r.notice).toBeNull();
    expect(r.settings.sheet.margin).toBe(12);
    expect(r.settings.sheet).not.toHaveProperty('colour');
    expect(r.settings).not.toHaveProperty('future');
  });
  it('the result is a copy: changing it does not change the defaults or the input', () => {
    const input = {
      kindRules: [{folder: 'A', kind: 'skill'}],
      sheet: {margin: 12},
    };
    const r = readSettingsFile(input);
    r.settings.sheet.margin = 99;
    r.settings.kindRules.push({folder: 'B', kind: 'spell'});
    r.settings.skill.maxSize = 1;
    expect(DEFAULT_CARDS.sheet.margin).toBe(10);
    expect(DEFAULT_CARDS.skill.maxSize).toBe(7);
    expect(input.kindRules).toHaveLength(1);
    expect(input.sheet.margin).toBe(12);
    expect(readSettingsFile(null).settings.kindRules).toEqual([]);
  });
  it('values are passed on as they are; refusing them is the check of US-005 (no range check here)', () => {
    const r = readSettingsFile({sheet: {margin: 51}});
    expect(r.settings.sheet.margin).toBe(51);
    expect(r.notice).toBeNull();
  });
});
