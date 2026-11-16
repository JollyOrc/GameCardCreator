// US-012 AC-4, AC-7: the warning made from the creature kind's fact, its place after the skill
// and spell warnings, and the facts it ignores. Expected values: the story's AC-4 and AC-8
// examples. Pure; red until the code ticket (G2, 2026-11-16).
import {describe, expect, it} from 'vitest';
import {titleWarnings} from '../../src/core/card/titles';
import {cardCode} from '../../src/core/card/warning';
import {fitWarnings} from '../../src/core/skill/fit';
import type {SkillCard} from '../../src/core/skill/read';
import {FEN, FERRY, MARSH, REED, creatureNamed} from '../support/band-fixtures';

const RUN_B = [FEN, REED, MARSH, FERRY].map((n) => creatureNamed(n));
const fact = (over: Record<string, unknown> = {}) => ({
  titles: 'creature',
  size: 9,
  height: 10.24,
  wrapped: [3],
  widest: 3,
  ...over,
});
const skill = (name: string): SkillCard => ({
  kind: 'skill',
  path: `skills/${name}.md`,
  name,
  tags: [],
  details: [],
  blocks: [],
});

describe('US-012 AC-4: one warning when a creature name wraps at the smallest size', () => {
  it('the code', () => {
    expect(cardCode('creature', 'TITLE_WRAPPED')).toBe(
      'CREATURE_TITLE_WRAPPED',
    );
  });
  it("the story's example (run B, smallest 9): the widest name's note, `1 of 4 titles wrap at 9 pt`", () => {
    expect(titleWarnings([fact()], RUN_B)).toEqual([
      {
        code: 'CREATURE_TITLE_WRAPPED',
        path: 'creatures/Old Grey Ferryman of the Sunken Weir.md',
        detail: '1 of 4 titles wrap at 9 pt',
      },
    ]);
  });
  it('AC-8, equal bounds: `1 of 4 titles wrap at 11.5 pt`', () => {
    expect(titleWarnings([fact({size: 11.5})], RUN_B)[0]?.detail).toBe(
      '1 of 4 titles wrap at 11.5 pt',
    );
  });
  it('n counts the creature cards only (a skill card in the run is not counted)', () => {
    const cards = [skill('Parry'), ...RUN_B];
    expect(
      titleWarnings([fact({wrapped: [4], widest: 4})], cards)[0]?.detail,
    ).toBe('1 of 4 titles wrap at 9 pt');
  });
  it('no wrapped name: no warning (shrinking is no problem, D12)', () => {
    expect(
      titleWarnings(
        [fact({size: 7.75, height: 5.8, wrapped: [], widest: 3})],
        RUN_B,
      ),
    ).toEqual([]);
  });
  it('a fact whose widest is a skill card is not a creature fact (ignored)', () => {
    const cards = [skill('Parry'), ...RUN_B];
    expect(titleWarnings([fact({wrapped: [0], widest: 0})], cards)).toEqual([]);
  });
  it('a creature fact does not make a skill warning, nor the other way round', () => {
    const cards = [skill('Parry'), ...RUN_B];
    const ws = titleWarnings(
      [
        fact({titles: 'skill', wrapped: [0], widest: 0}),
        fact({wrapped: [4], widest: 4}),
      ],
      cards,
    );
    expect(ws.map((w) => [w.code, w.path])).toEqual([
      ['SKILL_TITLE_WRAPPED', 'skills/Parry.md'],
      [
        'CREATURE_TITLE_WRAPPED',
        'creatures/Old Grey Ferryman of the Sunken Weir.md',
      ],
    ]);
  });
});

describe('US-012 AC-7, AC-10: three kinds, skill, spell, creature', () => {
  it('the warnings come in the order skill, spell, creature, whatever the order of the facts', () => {
    const glow: SkillCard = {
      ...skill('Glow Ward of the Seven Lamps'),
      kind: 'spell',
      path: 'spells/Glow Ward of the Seven Lamps.md',
    };
    const cards = [...RUN_B, glow, skill('Parry')];
    const ws = titleWarnings(
      [
        fact(),
        fact({titles: 'spell', wrapped: [4], widest: 4}),
        fact({titles: 'skill', wrapped: [5], widest: 5}),
      ],
      cards,
    );
    expect(ws.map((w) => w.code)).toEqual([
      'SKILL_TITLE_WRAPPED',
      'SPELL_TITLE_WRAPPED',
      'CREATURE_TITLE_WRAPPED',
    ]);
  });
  it('the fit warnings ignore a creature fact', () => {
    const fits = RUN_B.map((_, i) => ({i, size: 7, fits: true, dropped: []}));
    expect(fitWarnings([fact(), ...fits], RUN_B)).toEqual(
      fitWarnings(fits, RUN_B),
    );
  });
});
