// US-011 AC-5, AC-8: the warning made from the fact of a kind in equal mode, and the fit
// warnings unchanged by such a fact. Expected values: the story's example of AC-5 and
// AC-9. Pure; red until the code ticket (G2, 2026-11-16).
import {describe, expect, it} from 'vitest';
import {titleWarnings} from '../../src/core/card/titles';
import {cardCode} from '../../src/core/card/warning';
import {fitWarnings} from '../../src/core/skill/fit';
import type {SkillCard} from '../../src/core/skill/read';

const card = (name: string, kind: 'skill' | 'spell' = 'skill'): SkillCard => ({
  kind,
  path: `${kind}s/${name}.md`,
  name,
  tags: [],
  details: [],
  blocks: [],
});
const CARDS = [
  card('Parry'),
  card('Riverbank Ambush of the Reed Wardens'),
  card('Feint'),
  card('The Long Riverbank Ambush of the Hidden Reed Wardens'),
];
const fact = (over: Record<string, unknown> = {}) => ({
  titles: 'skill',
  size: 7,
  height: 7.94,
  wrapped: [3],
  widest: 3,
  ...over,
});

describe('US-011 AC-5: one warning per kind when a title wraps', () => {
  it('the code', () => {
    expect(cardCode('skill', 'TITLE_WRAPPED')).toBe('SKILL_TITLE_WRAPPED');
    expect(cardCode('spell', 'TITLE_WRAPPED')).toBe('SPELL_TITLE_WRAPPED');
  });
  it("the story's example: the widest title's note, `1 of 4 titles wrap at 7 pt`", () => {
    expect(titleWarnings([fact()], CARDS)).toEqual([
      {
        code: 'SKILL_TITLE_WRAPPED',
        path: 'skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md',
        detail: '1 of 4 titles wrap at 7 pt',
      },
    ]);
  });
  it('AC-9: a size that is not whole is written as it is (`9.1 pt`); n counts the cards of the kind only', () => {
    const cards = [card('Parry'), card('Glow', 'spell'), CARDS[1]!];
    expect(
      titleWarnings([fact({size: 9.1, wrapped: [2], widest: 2})], cards),
    ).toEqual([
      {
        code: 'SKILL_TITLE_WRAPPED',
        path: 'skills/Riverbank Ambush of the Reed Wardens.md',
        detail: '1 of 2 titles wrap at 9.1 pt',
      },
    ]);
  });
  it('several wrapped titles: one warning, k counts them', () => {
    expect(
      titleWarnings([fact({wrapped: [1, 3], widest: 3})], CARDS)[0]?.detail,
    ).toBe('2 of 4 titles wrap at 7 pt');
  });
  it('the path is the widest title, not the first wrapped one', () => {
    expect(
      titleWarnings([fact({wrapped: [1, 3], widest: 3})], CARDS)[0]?.path,
    ).toBe('skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md');
    expect(
      titleWarnings([fact({wrapped: [1, 3], widest: 1})], CARDS)[0]?.path,
    ).toBe('skills/Riverbank Ambush of the Reed Wardens.md');
  });
  it('a card without a kind is a skill card: counted in n, and it can be the widest', () => {
    const bare: SkillCard = {
      path: 'skills/Riverbank Ambush of the Reed Wardens.md',
      name: 'Riverbank Ambush of the Reed Wardens',
      tags: [],
      details: [],
      blocks: [],
    };
    const cards = [card('Parry'), bare, card('Glow', 'spell')];
    expect(titleWarnings([fact({wrapped: [1], widest: 1})], cards)).toEqual([
      {
        code: 'SKILL_TITLE_WRAPPED',
        path: 'skills/Riverbank Ambush of the Reed Wardens.md',
        detail: '1 of 2 titles wrap at 7 pt',
      },
    ]);
  });
  it('no wrapped title: no warning (shrinking is no problem, D3)', () => {
    expect(
      titleWarnings([fact({size: 8.1, wrapped: [], widest: 1})], CARDS),
    ).toEqual([]);
  });
  it('two kinds: a warning each, skill first, with the code of the kind', () => {
    const cards = [card('Glow Ward of the Seven Lamps', 'spell'), ...CARDS];
    const ws = titleWarnings(
      [
        fact({titles: 'spell', wrapped: [0], widest: 0}),
        fact({wrapped: [4], widest: 4}),
      ],
      cards,
    );
    expect(ws.map((w) => [w.code, w.detail])).toEqual([
      ['SKILL_TITLE_WRAPPED', '1 of 4 titles wrap at 7 pt'],
      ['SPELL_TITLE_WRAPPED', '1 of 1 titles wrap at 7 pt'],
    ]);
  });
  it('the first valid fact of a kind counts', () => {
    expect(
      titleWarnings([fact(), fact({wrapped: [1, 3]})], CARDS).map(
        (w) => w.detail,
      ),
    ).toEqual(['1 of 4 titles wrap at 7 pt']);
  });
  it.each([
    ['no kind', {titles: undefined}],
    ['another kind', {titles: 'creature'}],
    ['a size that is no number', {size: '7'}],
    ['a size that is not finite', {size: Number.NaN}],
    ['wrapped is no list', {wrapped: 3}],
    ['wrapped holds a non-index', {wrapped: ['3']}],
    ['widest is no card of the run', {widest: 9}],
    ['widest is a card of the other kind', {widest: 0, wrapped: [0]}],
  ])('a malformed fact (%s) is ignored', (_n, over) => {
    const cards = [card('Glow', 'spell'), ...CARDS];
    expect(titleWarnings([fact(over)], cards)).toEqual([]);
  });
  it('fit facts and other values are no title facts', () => {
    expect(
      titleWarnings([{i: 0, size: 7, fits: false}, null, 3], CARDS),
    ).toEqual([]);
  });
});

describe('US-011 AC-8: the fit warnings ignore the title fact', () => {
  it('a run whose facts hold a title fact gives the same fit warnings as without it', () => {
    const fits = CARDS.map((_, i) => ({i, size: 7, fits: i !== 2}));
    expect(fitWarnings([fact(), ...fits], CARDS)).toEqual(
      fitWarnings(fits, CARDS),
    );
    expect(fitWarnings([fact(), ...fits], CARDS)).toEqual([
      {code: 'SKILL_TEXT_OVERFLOW', path: 'skills/Feint.md', detail: '7 pt'},
    ]);
  });
});
