// US-011 AC-2, AC-9, D5: the title settings of a kind, their checks and the title sizes
// tried. Expected values: the story's settings table and AC-9 (SCAR-019: the defaults,
// both ends, a middle value, a non-default step). Red until the code ticket (G2,
// 2026-11-16).
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_TITLES,
  checkTitleSettings,
  titleSizes,
} from '../../src/core/card/titles';
import {DEFAULT_CARDS, checkCardSettings} from '../../src/core/run/settings';
import {DEFAULT_SKILL, checkSkillSettings} from '../../src/core/skill/settings';
import {DEFAULT_SPELL, checkSpellSettings} from '../../src/core/spell/settings';
import {readSettingsFile} from '../../src/plugin/settings-file';

describe('US-011 D5: the defaults', () => {
  it('switch off, title size 9.1 pt, smallest title size 7 pt', () => {
    expect(DEFAULT_TITLES).toEqual({
      equalTitles: false,
      titleSize: 9.1,
      minTitleSize: 7,
    });
  });
  it('skill and spell settings each carry them (per kind)', () => {
    expect(DEFAULT_SKILL).toMatchObject(DEFAULT_TITLES);
    expect(DEFAULT_SPELL).toMatchObject(DEFAULT_TITLES);
    expect(DEFAULT_CARDS.skill).toMatchObject(DEFAULT_TITLES);
    expect(DEFAULT_CARDS.spell).toMatchObject(DEFAULT_TITLES);
  });
  it('a settings file of 0.4.0 (no title keys) reads with the defaults and no ignored key', () => {
    const r = readSettingsFile({
      skill: {maxSize: 10, tagsProperty: 'tags'},
      spell: {tagsProperty: 'tags'},
    });
    expect(r.settings.skill).toMatchObject(DEFAULT_TITLES);
    expect(r.settings.skill.maxSize).toBe(10);
    expect(r.settings.spell).toMatchObject(DEFAULT_TITLES);
  });
  it('a file with the keys keeps them, per kind', () => {
    const r = readSettingsFile({
      skill: {equalTitles: true, titleSize: 13, minTitleSize: 8},
      spell: {equalTitles: false, titleSize: 12},
    });
    expect(r.settings.skill).toMatchObject({
      equalTitles: true,
      titleSize: 13,
      minTitleSize: 8,
    });
    expect(r.settings.spell).toMatchObject({
      equalTitles: false,
      titleSize: 12,
      minTitleSize: 7,
    });
  });
});

describe('US-011 AC-9: the checks', () => {
  const t = (titleSize: number, minTitleSize: number, equalTitles = true) => ({
    equalTitles,
    titleSize,
    minTitleSize,
  });
  it.each([
    [9.1, 7],
    [6, 4],
    [20, 20],
    [13, 7],
    [9.1, 9.1],
  ])('title %s, smallest %s: valid', (size, min) => {
    expect(checkTitleSettings('skill', t(size, min))).toEqual([]);
  });
  it.each([
    [21, 7, ['The skill title size 21 is outside 6 to 20 pt']],
    [5.9, 4, ['The skill title size 5.9 is outside 6 to 20 pt']],
    [9.1, 3.9, ['The skill smallest title size 3.9 is outside 4 to 20 pt']],
    [9.1, 21, ['The skill smallest title size 21 is outside 4 to 20 pt']],
    [9.1, 10, ['The skill smallest title size 10 is above the title size 9.1']],
    // one mistake, one message: the comparison only when both are in range
    [25, 10, ['The skill title size 25 is outside 6 to 20 pt']],
    [Number.NaN, 7, ['The skill title size NaN is outside 6 to 20 pt']],
  ] as const)('title %s, smallest %s: %j', (size, min, messages) => {
    expect(checkTitleSettings('skill', t(size, min))).toEqual(messages);
  });
  it('the message names the kind', () => {
    expect(checkTitleSettings('spell', t(21, 7))).toEqual([
      'The spell title size 21 is outside 6 to 20 pt',
    ]);
  });
  it('checked whether the switch is on or off (as the bleed)', () => {
    expect(checkTitleSettings('skill', t(21, 7, false))).toEqual([
      'The skill title size 21 is outside 6 to 20 pt',
    ]);
  });
  it("the kinds' checks and the card settings' check include them", () => {
    expect(checkSkillSettings({...DEFAULT_SKILL, titleSize: 21})).toContain(
      'The skill title size 21 is outside 6 to 20 pt',
    );
    expect(checkSpellSettings({...DEFAULT_SPELL, minTitleSize: 30})).toContain(
      'The spell smallest title size 30 is outside 4 to 20 pt',
    );
    expect(
      checkCardSettings({
        ...DEFAULT_CARDS,
        spell: {...DEFAULT_SPELL, titleSize: 5},
      }),
    ).toEqual(['The spell title size 5 is outside 6 to 20 pt']);
    expect(checkCardSettings(DEFAULT_CARDS)).toEqual([]);
  });
});

describe('US-011 AC-2: the title sizes tried (the rule of textSizes)', () => {
  const s = (titleSize: number, minTitleSize: number) => ({
    equalTitles: true,
    titleSize,
    minTitleSize,
  });
  it('defaults, step 0.25: 9.1 down to 7, the smallest last', () => {
    expect(titleSizes(s(9.1, 7), 0.25)).toEqual([
      9.1, 8.85, 8.6, 8.35, 8.1, 7.85, 7.6, 7.35, 7.1, 7,
    ]);
  });
  it('step 1 (not the default): 9.1, 8.1, 7.1, 7', () => {
    expect(titleSizes(s(9.1, 7), 1)).toEqual([9.1, 8.1, 7.1, 7]);
  });
  it('title 20: the steps reach 8.25 (20 minus 47 steps)', () => {
    const list = titleSizes(s(20, 7), 0.25);
    expect(list[0]).toBe(20);
    expect(list[47]).toBe(8.25);
    expect(list[list.length - 1]).toBe(7);
  });
  it('title 13: 8.25 after 19 steps', () => {
    expect(titleSizes(s(13, 7), 0.25)[19]).toBe(8.25);
  });
  it('step 0.1 (a step whose sums leave floating-point dust): every size is rounded, the smallest once', () => {
    const list = titleSizes(s(9.1, 7), 0.1);
    expect(list.slice(0, 5)).toEqual([9.1, 9, 8.9, 8.8, 8.7]);
    expect(list).toHaveLength(22);
    expect(list[list.length - 1]).toBe(7);
    expect(new Set(list).size).toBe(22);
  });
  it('the smallest equal to the title size: one size', () => {
    expect(titleSizes(s(9.1, 9.1), 0.25)).toEqual([9.1]);
  });
  it('title 6, smallest 4: 6 first, 4 last', () => {
    const list = titleSizes(s(6, 4), 0.25);
    expect(list[0]).toBe(6);
    expect(list[list.length - 1]).toBe(4);
    expect(list).toHaveLength(9);
  });
});
