// US-002 AC-5 with US-004 (ticket #24): the largest and smallest size may be
// equal (the settings allow it); one size is a list of one in the Typst source,
// not a number (`(7)` is the number 7 in Typst and has no `first`). Found by the
// creature card's AC-4 test, which sets both sizes to one value.
import {describe, expect, it} from 'vitest';
import type {SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {makeSheet} from '../support/card-sheet';

const card = (kind: 'skill' | 'spell'): SkillCard => ({
  kind,
  path: `${kind}s/A.md`,
  name: 'Reed',
  tags: [],
  details: [],
  blocks: [{kind: 'paragraph', runs: [{text: 'One short sentence.'}]}],
});

describe('US-002 AC-5: one size only', () => {
  it.each(['skill', 'spell'] as const)(
    'a %s card compiles with the largest and the smallest size equal and is set at it',
    async (kind) => {
      const m = await makeSheet([card(kind)], DEFAULT_SHEET, {
        maxSize: 7,
        minSize: 7,
        sizeStep: 0.25,
      });
      expect(m.diagnostics).toEqual([]);
      expect(m.facts).toEqual([{i: 0, size: 7, fits: true}]);
    },
    120_000,
  );
});
