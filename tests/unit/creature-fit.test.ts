// US-004 AC-5, AC-11: the warnings made from the fit facts of creature cards.
// A creature fact is `{i, size, fits, dropped}`; `dropped` names the parts the
// card gave up, in the order they were given up (`Signs`, `Instincts`,
// `Skills`), and lists only parts the card has. Red until the code ticket.
import {describe, expect, it} from 'vitest';
import type {CreatureCard} from '../../src/core/creature/read';
import {fitWarnings} from '../../src/core/skill/fit';

const creature = (path: string): CreatureCard => ({
  kind: 'creature',
  path,
  name: path,
  properties: {},
  instincts: [],
  actions: [],
  signs: [],
  statblock: null,
});

describe('US-004 AC-5: the warnings of creature cards', () => {
  const cards = [creature('c/A.md'), creature('c/B.md'), creature('c/C.md')];
  it('a fit with Signs dropped gives no warning (the lowest priority by design)', () => {
    expect(
      fitWarnings(
        [{i: 0, size: 7, fits: true, dropped: ['Signs']}],
        [cards[0]!],
      ),
    ).toEqual([]);
  });
  it('a dropped Instincts section gives CREATURE_PART_DROPPED, detail Instincts', () => {
    expect(
      fitWarnings(
        [{i: 0, size: 7, fits: true, dropped: ['Signs', 'Instincts']}],
        [cards[0]!],
      ),
    ).toEqual([
      {code: 'CREATURE_PART_DROPPED', path: 'c/A.md', detail: 'Instincts'},
    ]);
  });
  it('a dropped Skills line gives CREATURE_PART_DROPPED, detail Skills; Instincts first', () => {
    expect(
      fitWarnings(
        [
          {
            i: 0,
            size: 6.5,
            fits: true,
            dropped: ['Signs', 'Instincts', 'Skills'],
          },
        ],
        [cards[0]!],
      ),
    ).toEqual([
      {code: 'CREATURE_PART_DROPPED', path: 'c/A.md', detail: 'Instincts'},
      {code: 'CREATURE_PART_DROPPED', path: 'c/A.md', detail: 'Skills'},
    ]);
  });
  it('no fit: CREATURE_TEXT_OVERFLOW with the size, besides the dropped parts', () => {
    expect(
      fitWarnings(
        [
          {
            i: 0,
            size: 5.5,
            fits: false,
            dropped: ['Signs', 'Instincts', 'Skills'],
          },
        ],
        [cards[0]!],
      ),
    ).toEqual([
      {code: 'CREATURE_PART_DROPPED', path: 'c/A.md', detail: 'Instincts'},
      {code: 'CREATURE_PART_DROPPED', path: 'c/A.md', detail: 'Skills'},
      {code: 'CREATURE_TEXT_OVERFLOW', path: 'c/A.md', detail: '5.5 pt'},
    ]);
  });
  it('no fact, or a fact without dropped, is CREATURE_FIT_UNKNOWN (the fit is never assumed)', () => {
    expect(fitWarnings([], [cards[0]!])).toEqual([
      {code: 'CREATURE_FIT_UNKNOWN', path: 'c/A.md', detail: ''},
    ]);
    expect(fitWarnings([{i: 0, size: 7, fits: true}], [cards[0]!])).toEqual([
      {code: 'CREATURE_FIT_UNKNOWN', path: 'c/A.md', detail: ''},
    ]);
    expect(
      fitWarnings([{i: 0, size: 7, fits: true, dropped: 'Signs'}], [cards[0]!]),
    ).toEqual([{code: 'CREATURE_FIT_UNKNOWN', path: 'c/A.md', detail: ''}]);
  });
  it('facts are matched by card index, warnings come in card order', () => {
    const facts = [
      {i: 2, size: 7, fits: true, dropped: ['Instincts']},
      {i: 0, size: 7, fits: true, dropped: []},
      {i: 1, size: 5.5, fits: false, dropped: []},
    ];
    expect(fitWarnings(facts, cards).map((w) => [w.path, w.code])).toEqual([
      ['c/B.md', 'CREATURE_TEXT_OVERFLOW'],
      ['c/C.md', 'CREATURE_PART_DROPPED'],
    ]);
  });
});
