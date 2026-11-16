// US-011 AC-1, AC-5, AC-8: the run with equal title bars. The stand-in compiler logs the
// Typst source and answers the facts a test gives it (one fit fact per card, and the
// title fact of a kind as the compile writes it); the stand-in coverage draws Latin
// only. Invented notes (SCAR-035). Red until the code ticket (G2, 2026-11-16).
import {describe, expect, it} from 'vitest';
import {runCards, type RunDeps} from '../../src/core/run/run';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {LATIN} from '../support/glyph-faces';

const base: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [
    {folder: 'skills', kind: 'skill'},
    {folder: 'spells', kind: 'spell'},
  ],
  outputFolder: '/tmp/out',
};
const on = (s: CardsSettings, kind: 'skill' | 'spell'): CardsSettings => ({
  ...s,
  [kind]: {...s[kind], equalTitles: true},
});
const NOTES: Record<string, string> = {
  'skills/Parry.md':
    '---\ntags:\n  - CombatSkill\n---\nYou turn a blow aside.\n',
  'skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md':
    '---\ntags:\n  - CombatSkill\n---\nA 漢 waits in the reeds.\n',
  'spells/Glow.md': 'A soft light.\n',
};

function setup(facts: (n: number) => unknown[]) {
  const compile: string[] = [];
  const d: RunDeps = {
    read: async (p) => {
      const t = NOTES[p];
      if (t === undefined) throw new Error(`no such note ${p}`);
      return t;
    },
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
  Array.from({length: n}, (_, i) => ({i, size: 7, fits: true}));

describe('US-011 AC-1: the settings reach the sheet', () => {
  it('both kinds off (the defaults): no title fact is asked for in the source', async () => {
    const {d, compile} = setup(fits);
    await runCards(['skills/Parry.md', 'spells/Glow.md'], base, d);
    expect(compile[0]).not.toContain('titles: "');
  });
  it('skills on: the source carries the skill fact only', async () => {
    const {d, compile} = setup(fits);
    await runCards(['skills/Parry.md', 'spells/Glow.md'], on(base, 'skill'), d);
    expect(
      [...compile[0]!.matchAll(/titles: "(\w+)"/g)].map((m) => m[1]),
    ).toEqual(['skill']);
  });
  it("the kind's own sizes are used: a title size of 13 is in the source, 9.1 is not", async () => {
    const {d, compile} = setup(fits);
    const s = on(base, 'skill');
    s.skill = {...s.skill, titleSize: 13, minTitleSize: 8};
    await runCards(['skills/Parry.md'], s, d);
    expect(compile[0]).toMatch(/\(13, 12\.75, /);
    expect(compile[0]).not.toMatch(/\(9\.1, 8\.85, /);
  });
});

describe('US-011 AC-5, AC-8: the warning and its place in the list', () => {
  const names = [
    'other/Loose.md',
    'skills/Parry.md',
    'skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md',
  ];
  it("after the notes' own and the glyph warnings, before the fit warnings", async () => {
    const {d} = setup((n) => [
      ...Array.from({length: n}, (_, i) => ({
        i,
        size: i === 0 ? 5.5 : 7,
        fits: i !== 0,
      })),
      {titles: 'skill', size: 7, height: 7.94, wrapped: [1], widest: 1},
    ]);
    const r = await runCards(names, on(base, 'skill'), d);
    expect(r.warnings).toEqual([
      expect.objectContaining({code: 'CARD_KIND_UNKNOWN'}),
      expect.objectContaining({code: 'SKILL_GLYPH_MISSING'}),
      {
        code: 'SKILL_TITLE_WRAPPED',
        path: 'skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md',
        detail: '1 of 2 titles wrap at 7 pt',
      },
      expect.objectContaining({
        code: 'SKILL_TEXT_OVERFLOW',
        path: 'skills/Parry.md',
      }),
    ]);
  });
  it('no title wraps: no title warning; the fit warnings are as without the fact', async () => {
    const {d} = setup((n) => [
      ...fits(n),
      {titles: 'skill', size: 8.1, height: 5.69, wrapped: [], widest: 1},
    ]);
    const r = await runCards(names.slice(1, 2), on(base, 'skill'), d);
    expect(r.warnings).toEqual([]);
  });
});
