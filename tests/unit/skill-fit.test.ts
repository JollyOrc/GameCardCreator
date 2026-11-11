// US-002 AC-6, AC-8: the warnings made from the fit facts of a compile. The
// facts have the form the Typst side writes (label gcc-fit): {i, size, fits}.
import {describe, expect, it} from 'vitest';
import {FIT_LABEL, fitWarnings} from '../../src/core/skill/fit';
import type {SkillCard} from '../../src/core/skill/read';

const card = (path: string): SkillCard => ({
  path,
  name: path.replace(/^.*\//, '').replace(/\.md$/, ''),
  tags: [],
  details: [],
  blocks: [],
});
const cards = [card('s/A.md'), card('s/B.md'), card('s/C.md')];

describe('US-002 AC-6, AC-8: fit warnings', () => {
  it('the label is gcc-fit', () => {
    expect(FIT_LABEL).toBe('gcc-fit');
  });
  it('a card that fits gives no warning', () => {
    const facts = cards.map((_, i) => ({i, size: 7, fits: true}));
    expect(fitWarnings(facts, cards)).toEqual([]);
  });
  it('a card that does not fit gives SKILL_TEXT_OVERFLOW with path and size', () => {
    const facts = [
      {i: 0, size: 7, fits: true},
      {i: 1, size: 5.5, fits: false},
      {i: 2, size: 6.25, fits: true},
    ];
    expect(fitWarnings(facts, cards)).toEqual([
      {code: 'SKILL_TEXT_OVERFLOW', path: 's/B.md', detail: '5.5 pt'},
    ]);
  });
  it('warnings are in card order, whatever the order of the facts', () => {
    const facts = [
      {i: 2, size: 4, fits: false},
      {i: 0, size: 4, fits: false},
      {i: 1, size: 7, fits: true},
    ];
    expect(fitWarnings(facts, cards).map((w) => w.path)).toEqual([
      's/A.md',
      's/C.md',
    ]);
  });
  it('a card without a fact gets SKILL_FIT_UNKNOWN, never an assumed fit', () => {
    const facts = [{i: 0, size: 7, fits: true}];
    expect(fitWarnings(facts, cards)).toEqual([
      {code: 'SKILL_FIT_UNKNOWN', path: 's/B.md', detail: ''},
      {code: 'SKILL_FIT_UNKNOWN', path: 's/C.md', detail: ''},
    ]);
  });
  it('no facts at all: every card is unknown', () => {
    expect(fitWarnings([], cards)).toHaveLength(3);
  });
  it('a malformed fact is ignored, its card is unknown', () => {
    const facts: unknown[] = [
      {i: 0, size: 7, fits: true},
      'junk',
      {i: 1, size: 'big', fits: true},
      {i: 2, size: 7, fits: true},
    ];
    expect(fitWarnings(facts, cards).map((w) => [w.code, w.path])).toEqual([
      ['SKILL_FIT_UNKNOWN', 's/B.md'],
    ]);
  });
});
