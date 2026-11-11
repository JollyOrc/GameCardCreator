// US-002 AC-10: the settings of the skill card and the sizes tried (AC-5).
// Expected values come from the story's examples and table, never from the
// code under test (SCAR-003). The modules do not exist before ticket #3 (see
// docs/technical/tests.md): this file is red until then.
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_SKILL,
  checkSkillSettings,
  textSizes,
  type SkillSettings,
} from '../../src/core/skill/settings';

const s = (over: Partial<SkillSettings> = {}): SkillSettings => ({
  ...DEFAULT_SKILL,
  ...over,
});

describe('US-002 settings table: defaults', () => {
  it('are the documented defaults', () => {
    expect(DEFAULT_SKILL).toEqual({
      tagsProperty: 'tags',
      timingProperty: 'timing',
      timingLabel: 'Time',
      kindProperty: 'kind',
      kindLabel: 'Type',
      requiresProperty: 'requires',
      requiresLabel: 'Requires',
      maxSize: 7,
      minSize: 5.5,
      sizeStep: 0.25,
    });
  });
  it('are valid', () => {
    expect(checkSkillSettings(DEFAULT_SKILL)).toEqual([]);
  });
});

describe('US-002 AC-5: the sizes tried', () => {
  it('defaults: 7, 6.75, 6.5, 6.25, 6, 5.75, 5.5', () => {
    expect(textSizes(DEFAULT_SKILL)).toEqual([
      7, 6.75, 6.5, 6.25, 6, 5.75, 5.5,
    ]);
  });
});

describe('US-002 AC-10: sizes at non-default settings', () => {
  it('largest 5.5, smallest 4, step 1: 5.5, 4.5, 4 (the smallest is last)', () => {
    expect(textSizes(s({maxSize: 5.5, minSize: 4, sizeStep: 1}))).toEqual([
      5.5, 4.5, 4,
    ]);
  });
  it('largest equal to smallest: one size', () => {
    expect(textSizes(s({maxSize: 6, minSize: 6}))).toEqual([6]);
  });
  it('largest 10, smallest 9, step 0.5: 10, 9.5, 9', () => {
    expect(textSizes(s({maxSize: 10, minSize: 9, sizeStep: 0.5}))).toEqual([
      10, 9.5, 9,
    ]);
  });
  it('step 0.05 from 7 to 6.8 hits no float dust', () => {
    expect(textSizes(s({maxSize: 7, minSize: 6.8, sizeStep: 0.05}))).toEqual([
      7, 6.95, 6.9, 6.85, 6.8,
    ]);
  });
});

describe('US-002 AC-10: refused settings', () => {
  it('two settings naming the same property are refused, naming both', () => {
    const issues = checkSkillSettings(s({kindProperty: 'timing'}));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('timing');
    expect(issues[0]).toMatch(/kind/i);
  });
  it('the tags property may not clash either', () => {
    expect(checkSkillSettings(s({requiresProperty: 'tags'}))).toHaveLength(1);
  });
  it('property names compare without case', () => {
    expect(checkSkillSettings(s({kindProperty: 'Timing'}))).toHaveLength(1);
  });
  it('an empty property name is refused', () => {
    expect(checkSkillSettings(s({timingProperty: ' '}))).toHaveLength(1);
  });
  it('largest below smallest is refused', () => {
    const issues = checkSkillSettings(s({maxSize: 5, minSize: 6}));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/largest/i);
  });
  it.each([
    [{maxSize: 5.4}, 'largest'],
    [{maxSize: 10.1}, 'largest'],
    [{minSize: 3.9}, 'smallest'],
    [{sizeStep: 0.04}, 'step'],
    [{sizeStep: 1.1}, 'step'],
    [{maxSize: NaN}, 'largest'],
  ])('%j is outside its range', (over, word) => {
    const issues = checkSkillSettings(s(over as Partial<SkillSettings>));
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(' ')).toMatch(new RegExp(word, 'i'));
  });
  it.each([
    [{maxSize: 5.5}],
    [{maxSize: 10}],
    [{minSize: 4}],
    [{sizeStep: 0.05}],
    [{sizeStep: 1}],
  ])('the end %j is accepted', (over) => {
    expect(checkSkillSettings(s(over))).toEqual([]);
  });
});
