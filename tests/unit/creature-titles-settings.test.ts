// US-012 AC-2, AC-8, D14: the title settings of the creature kind, their checks and the sizes
// tried. Expected values: the story's settings table and AC-8 (SCAR-019: the defaults, both
// ends, a middle value, equal bounds, a non-default step whose result differs from the
// default step's). Red until the code ticket (G2, 2026-11-16).
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_CREATURE_TITLES,
  DEFAULT_TITLES,
  checkTitleSettings,
  titleSizes,
} from '../../src/core/card/titles';
import {
  DEFAULT_CREATURE,
  checkCreatureSettings,
} from '../../src/core/creature/settings';
import {DEFAULT_CARDS, checkCardSettings} from '../../src/core/run/settings';
import {readSettingsFile} from '../../src/plugin/settings-file';

describe('US-012 D14: the defaults of the creature kind', () => {
  it('switch off, title size 11.5 pt (the built-in band size), smallest 7 pt', () => {
    expect(DEFAULT_CREATURE_TITLES).toEqual({
      equalTitles: false,
      titleSize: 11.5,
      minTitleSize: 7,
    });
  });
  it('the creature settings carry them beside the headings; skill and spell keep theirs (9.1 pt)', () => {
    expect(DEFAULT_CREATURE).toMatchObject(DEFAULT_CREATURE_TITLES);
    expect(DEFAULT_CARDS.creature).toMatchObject(DEFAULT_CREATURE_TITLES);
    expect(DEFAULT_CARDS.skill.titleSize).toBe(9.1);
    expect(DEFAULT_TITLES.titleSize).toBe(9.1);
  });
  it('a settings file of 0.5.0 (creature headings only) reads with the defaults, headings kept', () => {
    const r = readSettingsFile({creature: {actionsHeading: 'Moves'}});
    expect(r.settings.creature).toMatchObject({
      ...DEFAULT_CREATURE_TITLES,
      actionsHeading: 'Moves',
    });
    expect(r.notice).toBeNull();
  });
  it('a file with the keys keeps them, key by key', () => {
    const r = readSettingsFile({
      creature: {equalTitles: true, titleSize: 14},
    });
    expect(r.settings.creature).toMatchObject({
      equalTitles: true,
      titleSize: 14,
      minTitleSize: 7,
      instinctsHeading: DEFAULT_CREATURE.instinctsHeading,
    });
  });
});

describe('US-012 AC-8: the checks name the creature kind', () => {
  const t = (titleSize: number, minTitleSize: number, equalTitles = true) => ({
    equalTitles,
    titleSize,
    minTitleSize,
  });
  it.each([
    [11.5, 7],
    [20, 7],
    [14, 7],
    [6, 4],
    [11.5, 11.5],
  ])('title %s, smallest %s: valid', (size, min) => {
    expect(checkTitleSettings('creature', t(size, min))).toEqual([]);
  });
  it.each([
    [21, 7, ['The creature title size 21 is outside 6 to 20 pt']],
    [11.5, 3, ['The creature smallest title size 3 is outside 4 to 20 pt']],
    [
      11.5,
      12,
      ['The creature smallest title size 12 is above the title size 11.5'],
    ],
  ] as const)('title %s, smallest %s: %j', (size, min, messages) => {
    expect(checkTitleSettings('creature', t(size, min))).toEqual(messages);
  });
  it('checked whether the switch is on or off', () => {
    expect(checkTitleSettings('creature', t(21, 7, false))).toEqual([
      'The creature title size 21 is outside 6 to 20 pt',
    ]);
  });
  it("the creature check and the card settings' check include them; the headings' checks stay", () => {
    expect(checkCreatureSettings({...DEFAULT_CREATURE, titleSize: 21})).toEqual(
      ['The creature title size 21 is outside 6 to 20 pt'],
    );
    expect(
      checkCreatureSettings({
        ...DEFAULT_CREATURE,
        signsHeading: ' ',
        minTitleSize: 30,
      }),
    ).toEqual([
      'The signs heading of the creature card is empty',
      'The creature smallest title size 30 is outside 4 to 20 pt',
    ]);
    expect(
      checkCardSettings({
        ...DEFAULT_CARDS,
        creature: {...DEFAULT_CREATURE, titleSize: 5},
      }),
    ).toEqual(['The creature title size 5 is outside 6 to 20 pt']);
    expect(checkCreatureSettings(DEFAULT_CREATURE)).toEqual([]);
  });
});

describe('US-012 AC-2, AC-8: the sizes tried (the rule of titleSizes)', () => {
  const s = (titleSize: number, minTitleSize: number) => ({
    equalTitles: true,
    titleSize,
    minTitleSize,
  });
  it('defaults, step 0.25: 11.5, 11.25, …, 7.25, 7 (19 sizes); 7.75 is the 16th', () => {
    const list = titleSizes(s(11.5, 7), 0.25);
    expect(list).toHaveLength(19);
    expect(list.slice(0, 3)).toEqual([11.5, 11.25, 11]);
    expect(list[15]).toBe(7.75);
    expect(list[list.length - 1]).toBe(7);
  });
  it('title 20 (upper end): 13.75 after 25 steps', () => {
    expect(titleSizes(s(20, 7), 0.25)[25]).toBe(13.75);
  });
  it('title 14 (a middle value): 13.75 after 1 step', () => {
    expect(titleSizes(s(14, 7), 0.25)[1]).toBe(13.75);
  });
  it('step 0.3: title 20 reaches 13.7 after 21 steps (not 13.75)', () => {
    const list = titleSizes(s(20, 7), 0.3);
    expect(list[21]).toBe(13.7);
    expect(list).not.toContain(13.75);
  });
});
