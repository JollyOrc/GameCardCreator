// US-012 AC-1, AC-4, AC-7, AC-10: the run with equal title bands on creature cards. A stand-in
// for Obsidian2Typst's API answers with the real answer for the heading it is asked
// (`answerNamed`, the fixture checked against the recording); the stand-in compiler logs the
// source and answers the facts a test gives it. Invented notes (SCAR-035). Red until the code
// ticket (G2, 2026-11-16).
import {describe, expect, it} from 'vitest';
import {runCards, type RunDeps} from '../../src/core/run/run';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {EXAMPLE_CREATURE_NOTE} from '../support/creature-fixtures';
import {answerNamed} from '../support/band-fixtures';
import {LATIN} from '../support/glyph-faces';

const base: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [
    {folder: 'creatures', kind: 'creature'},
    {folder: 'skills', kind: 'skill'},
  ],
  outputFolder: '/tmp/out',
};
const on = (s: CardsSettings, kind: 'skill' | 'creature'): CardsSettings => ({
  ...s,
  [kind]: {...s[kind], equalTitles: true},
});
const NOTES: Record<string, string> = {
  'creatures/Fen Hare.md': EXAMPLE_CREATURE_NOTE,
  'creatures/Old Grey Ferryman of the Sunken Weir.md': EXAMPLE_CREATURE_NOTE,
  'skills/Parry.md':
    '---\ntags:\n  - CombatSkill\n---\nYou turn a blow aside.\n',
  'skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md':
    '---\ntags:\n  - CombatSkill\n---\nThey wait in the reeds.\n',
};

function setup(facts: (n: number) => unknown[]) {
  const compile: string[] = [];
  const d: RunDeps = {
    read: async (p) => {
      const t = NOTES[p];
      if (t === undefined) throw new Error(`no such note ${p}`);
      return t;
    },
    statblockApi: () => ({
      version: 1,
      statblockTypst: async (_d: unknown, o?: {heading?: string}) =>
        answerNamed(o?.heading ?? ''),
      compileFonts: async () => [],
    }),
    compile: async (source) => {
      compile.push(source);
      const n = [...source.matchAll(/gcc-fit(?:-[a-z]+)?\((\d+), /g)].length;
      return {pdf: new Uint8Array([37, 80, 68, 70]), facts: facts(n)};
    },
    coverage: async () => [LATIN],
  };
  return {d, compile};
}
const fits = (n: number) =>
  Array.from({length: n}, (_, i) => ({i, size: 7, fits: true, dropped: []}));
const CREATURES = [
  'creatures/Fen Hare.md',
  'creatures/Old Grey Ferryman of the Sunken Weir.md',
];
const kinds = (s: string) =>
  [...s.matchAll(/titles: "(\w+)"/g)].map((m) => m[1]);

describe('US-012 AC-1, AC-7: the creature settings reach the sheet', () => {
  it('the defaults (off): no creature fact is asked for', async () => {
    const {d, compile} = setup(fits);
    const r = await runCards(CREATURES, base, d);
    expect(r.ok).toBe(true);
    expect(compile[0]).not.toContain('titles: "');
  });
  it('creatures on: the source asks for the creature fact only', async () => {
    const {d, compile} = setup(fits);
    await runCards([...CREATURES, 'skills/Parry.md'], on(base, 'creature'), d);
    expect(kinds(compile[0]!)).toEqual(['creature']);
  });
  it("the kind's own sizes are used: a title size of 14 is in the source, the default 11.5 is not", async () => {
    const {d, compile} = setup(fits);
    const s = on(base, 'creature');
    s.creature = {...s.creature, titleSize: 14, minTitleSize: 8};
    await runCards(CREATURES, s, d);
    expect(compile[0]).toMatch(/\(14, 13\.75, /);
    expect(compile[0]).not.toMatch(/\(11\.5, 11\.25, /);
  });
});

describe('US-012 AC-4, AC-10: the warning and its place in the list', () => {
  it('after the skill title warning, before the fit warnings', async () => {
    const names = [
      ...CREATURES,
      'skills/Parry.md',
      'skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md',
    ];
    const {d} = setup((n) => [
      ...Array.from({length: n}, (_, i) => ({
        i,
        size: i === 0 ? 5.5 : 7,
        fits: i !== 0,
        dropped: i === 0 ? ['Signs', 'Instincts', 'Skills'] : [],
      })),
      {titles: 'creature', size: 9, height: 10.24, wrapped: [1], widest: 1},
      {titles: 'skill', size: 7, height: 7.94, wrapped: [3], widest: 3},
    ]);
    const r = await runCards(names, on(on(base, 'skill'), 'creature'), d);
    const codes = r.warnings.map((w) => w.code);
    const wrapped = codes.indexOf('CREATURE_TITLE_WRAPPED');
    expect(codes.indexOf('SKILL_TITLE_WRAPPED')).toBe(wrapped - 1);
    expect(r.warnings[wrapped]).toEqual({
      code: 'CREATURE_TITLE_WRAPPED',
      path: 'creatures/Old Grey Ferryman of the Sunken Weir.md',
      detail: '1 of 2 titles wrap at 9 pt',
    });
    const firstFit = codes.findIndex((c) =>
      /PART_DROPPED|TEXT_OVERFLOW/.test(c),
    );
    expect(firstFit).toBeGreaterThan(wrapped);
  });
  it('no name wraps: no title warning', async () => {
    const {d} = setup((n) => [
      ...fits(n),
      {titles: 'creature', size: 7.75, height: 5.8, wrapped: [], widest: 1},
    ]);
    const r = await runCards(CREATURES, on(base, 'creature'), d);
    expect(r.warnings).toEqual([]);
  });
});
