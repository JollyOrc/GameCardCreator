// US-012 AC-1, AC-7, rule 6: what the emitter writes for equal title bands on creature cards,
// at the source level (no compile). Off is today: the golden sources in
// tests/fixtures/golden/creature-sources.json were written by the 0.5.0 code (src equal to the
// tag 0.5.0) before this story, and are met byte for byte with the creature options absent,
// present and off, and off with odd sizes. Red until the code ticket (G2, 2026-11-16).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {readSkill} from '../../src/core/skill/read';
import {DEFAULT_SIZES, DEFAULT_SKILL} from '../../src/core/skill/settings';
import {
  FEN,
  FERRY,
  OFF_C,
  ON_C,
  REED,
  creatureNamed,
} from '../support/band-fixtures';
import {EXAMPLE_NOTE} from '../support/skill-fixtures';
import {OFF, ON} from '../support/title-fixtures';

const golden = JSON.parse(
  readFileSync(
    join(process.cwd(), 'tests/fixtures/golden/creature-sources.json'),
    'utf8',
  ),
) as Record<string, string>;
const skill = readSkill(
  'skills/Reed Sweep.md',
  EXAMPLE_NOTE,
  DEFAULT_SKILL,
).card;
type Titles = NonNullable<Parameters<typeof cardSheetTypst>[4]>['titles'];
const src = (cards: Parameters<typeof cardSheetTypst>[0], titles?: Titles) => {
  const r = cardSheetTypst(
    cards,
    DEFAULT_SHEET,
    DEFAULT_SIZES,
    DEFAULT_CREATURE,
    titles === undefined ? {} : {titles},
  );
  if (!r.ok) throw new Error(r.message);
  return r.source;
};
const fenReed = () => [creatureNamed(FEN), creatureNamed(REED)];
const mixed = () => [creatureNamed(FEN), skill, creatureNamed(FERRY)];
const refused = () => [creatureNamed(FERRY, 40, false), creatureNamed(FEN)];

describe('US-012 AC-1: off is today', () => {
  it('no titles option: the 0.5.0 sources', () => {
    expect(src(fenReed())).toBe(golden.creatureOnly);
    expect(src(mixed())).toBe(golden.creatureAndSkill);
    expect(src(refused())).toBe(golden.refused);
  });
  it('the creature option present and off: the 0.5.0 sources, byte for byte', () => {
    expect(src(fenReed(), {creature: OFF_C})).toBe(golden.creatureOnly);
    expect(src(mixed(), {skill: OFF, spell: OFF, creature: OFF_C})).toBe(
      golden.creatureAndSkill,
    );
    expect(src(refused(), {creature: OFF_C})).toBe(golden.refused);
  });
  it('off with odd sizes is still today (the sizes are not read when off)', () => {
    const odd = {equalTitles: false, titleSize: 20, minTitleSize: 4};
    expect(src(fenReed(), {creature: odd})).toBe(golden.creatureOnly);
  });
  it('skills and spells on change no creature card: a creature-only run is today', () => {
    expect(src(fenReed(), {skill: ON, spell: ON, creature: OFF_C})).toBe(
      golden.creatureOnly,
    );
  });
  it('creatures on: the source differs from today (the mode has an effect, SCAR-037)', () => {
    expect(src(fenReed(), {creature: ON_C})).not.toBe(golden.creatureOnly);
    expect(src(refused(), {creature: ON_C})).not.toBe(golden.refused);
  });
});

describe('US-012 AC-7: the fact of the creature kind', () => {
  const kinds = (s: string) =>
    [...s.matchAll(/titles: "(skill|spell|creature)"/g)].map((m) => m[1]);
  it('one creature fact under the label of the fit facts when on', () => {
    const s = src(fenReed(), {creature: ON_C});
    expect(kinds(s)).toEqual(['creature']);
    expect(s).toMatch(/titles: "creature"[^\n]*<gcc-fit>/);
  });
  it('with skills on too: one fact each', () => {
    expect(kinds(src(mixed(), {skill: ON, creature: ON_C})).sort()).toEqual([
      'creature',
      'skill',
    ]);
  });
  it('creatures on but no creature card in the run: no creature fact', () => {
    expect(kinds(src([skill], {skill: OFF, creature: ON_C}))).toEqual([]);
  });
  it('the sizes tried are written as an array, the defaults 11.5 down to 7', () => {
    expect(src(fenReed(), {creature: ON_C})).toMatch(/\(11\.5, 11\.25, 11, /);
  });
});

describe('US-012 rule 6: a name goes into the source only through the one escaping function', () => {
  it('a name with Typst syntax on a card without a statblock appears only as string literals', () => {
    const evil = {
      ...creatureNamed(FERRY, 40, false),
      name: 'Hex "#1" ] + evil( $x$',
    };
    const s = src([evil, creatureNamed(FEN)], {creature: ON_C});
    const literal = '"Hex \\"#1\\" ] + evil( $x$"';
    expect(s).toContain(literal);
    // every occurrence of the name's text lies inside a literal (SCAR-023: counted)
    expect(s.split('evil(').length - 1).toBe(s.split(literal).length - 1);
  });
});
