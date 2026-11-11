// US-003 settings table, AC-6: the spell settings and the sizes shared with
// the skill card. Expected values from the story. Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_SPELL,
  checkSpellSettings,
  type SpellSettings,
} from '../../src/core/spell/settings';
import {
  DEFAULT_SIZES,
  DEFAULT_SKILL,
  checkSizes,
  textSizes,
} from '../../src/core/skill/settings';

describe('US-003 settings: the spell settings', () => {
  it('default: tags property `tags`', () => {
    expect(DEFAULT_SPELL).toEqual({tagsProperty: 'tags'});
  });
  it('are valid; another name is valid', () => {
    expect(checkSpellSettings(DEFAULT_SPELL)).toEqual([]);
    expect(checkSpellSettings({tagsProperty: 'labels'})).toEqual([]);
  });
  it.each([[''], ['   ']])('an empty tags property %j is refused', (name) => {
    const issues = checkSpellSettings({tagsProperty: name} as SpellSettings);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/tags/i);
  });
});

describe('US-003 AC-6: one set of size settings for both kinds (D2)', () => {
  it('the shared defaults are those of the skill card', () => {
    expect(DEFAULT_SIZES).toEqual({maxSize: 7, minSize: 5.5, sizeStep: 0.25});
    expect(DEFAULT_SKILL.maxSize).toBe(DEFAULT_SIZES.maxSize);
    expect(DEFAULT_SKILL.minSize).toBe(DEFAULT_SIZES.minSize);
    expect(DEFAULT_SKILL.sizeStep).toBe(DEFAULT_SIZES.sizeStep);
  });
  it('largest 6, smallest 5, step 0.5: sizes 6, 5.5, 5', () => {
    expect(textSizes({maxSize: 6, minSize: 5, sizeStep: 0.5})).toEqual([
      6, 5.5, 5,
    ]);
  });
  it('the sizes alone are checked: valid, below range, largest below smallest', () => {
    expect(checkSizes(DEFAULT_SIZES)).toEqual([]);
    expect(checkSizes({maxSize: 6, minSize: 5, sizeStep: 0.5})).toEqual([]);
    expect(
      checkSizes({maxSize: 5.4, minSize: 5, sizeStep: 0.5}).join(' '),
    ).toMatch(/largest/i);
    expect(
      checkSizes({maxSize: 6, minSize: 7, sizeStep: 0.5}).join(' '),
    ).toMatch(/largest/i);
    expect(checkSizes({maxSize: 6, minSize: 5, sizeStep: 2}).join(' ')).toMatch(
      /step/i,
    );
  });
});
