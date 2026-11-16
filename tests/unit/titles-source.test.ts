// US-011 AC-1, AC-8, rule 6: what the emitter writes for equal title bars, at the source
// level (no compile). Off is today: the golden sources of US-009 (written by the 0.3.0
// code, before this story) are met byte for byte with the new options absent, and with
// them present and off; the switch of one kind leaves the other kind's source alone.
// Red until the code ticket (G2, 2026-11-16).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {readSkill} from '../../src/core/skill/read';
import {DEFAULT_SIZES, DEFAULT_SKILL} from '../../src/core/skill/settings';
import {readSpell} from '../../src/core/spell/read';
import {DEFAULT_SPELL} from '../../src/core/spell/settings';
import {EXAMPLE_NOTE} from '../support/skill-fixtures';
import {EXAMPLE_SPELL_NOTE} from '../support/spell-fixtures';
import {OFF, ON, parry, riverbank} from '../support/title-fixtures';

const golden = JSON.parse(
  readFileSync(
    join(process.cwd(), 'tests/fixtures/golden/no-scheme-sources.json'),
    'utf8',
  ),
) as Record<string, string>;
const skill = readSkill(
  'skills/Reed Sweep.md',
  EXAMPLE_NOTE,
  DEFAULT_SKILL,
).card;
const spell = readSpell(
  'spells/Reed Whisper.md',
  EXAMPLE_SPELL_NOTE,
  DEFAULT_SPELL,
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

describe('US-011 AC-1: off is today', () => {
  it('the options without titles: the golden sources', () => {
    expect(src([skill])).toBe(golden.skillOnly);
    expect(src([skill, spell, skill])).toBe(golden.skillAndSpell);
  });
  it('titles present, both switches off: the golden sources, byte for byte', () => {
    expect(src([skill], {skill: OFF, spell: OFF})).toBe(golden.skillOnly);
    expect(src([spell], {skill: OFF, spell: OFF})).toBe(golden.spellOnly);
    expect(src([skill, spell, skill], {skill: OFF, spell: OFF})).toBe(
      golden.skillAndSpell,
    );
  });
  it('off with other sizes than the defaults is still today (the sizes are not read when off)', () => {
    const odd = {equalTitles: false, titleSize: 20, minTitleSize: 4};
    expect(src([skill, spell, skill], {skill: odd, spell: odd})).toBe(
      golden.skillAndSpell,
    );
  });
  it('skills on: a run of spells only is today', () => {
    expect(src([spell], {skill: ON, spell: OFF})).toBe(golden.spellOnly);
  });
  it('skills on: a skill source differs from today (the mode has an effect, SCAR-037)', () => {
    expect(src([skill], {skill: ON})).not.toBe(golden.skillOnly);
  });
});

describe('US-011 AC-8: the fact of a kind in equal mode', () => {
  const facts = (s: string) => [...s.matchAll(/titles: "(skill|spell)"/g)];
  it('one fact per kind in equal mode, under the label of the fit facts', () => {
    const s = src([parry(), riverbank(), spell], {skill: ON, spell: ON});
    expect(facts(s).map((m) => m[1])).toEqual(['skill', 'spell']);
    expect(s).toMatch(/titles: "skill"[^\n]*<gcc-fit>/);
  });
  it('only the kind that is on writes one', () => {
    const s = src([parry(), spell], {skill: OFF, spell: ON});
    expect(facts(s).map((m) => m[1])).toEqual(['spell']);
  });
  it('a kind that is on but has no card in the run writes none', () => {
    expect(
      facts(src([parry()], {skill: ON, spell: ON})).map((m) => m[1]),
    ).toEqual(['skill']);
  });
  it('no kind on: no fact', () => {
    expect(facts(src([parry(), spell], {skill: OFF, spell: OFF}))).toEqual([]);
  });
});

describe('US-011, rule 6: titles go through the one escaping function', () => {
  it('a title with Typst syntax appears only as a string literal', () => {
    const evil = {...parry(), name: 'Hex "#1" ] + evil( $x$'};
    const s = src([evil], {skill: ON});
    const literal = '"Hex \\"#1\\" ] + evil( $x$"';
    expect(s).toContain(literal);
    // every occurrence of the title's text lies inside the literal (SCAR-023: counted)
    expect(s.split(literal).join('')).not.toContain('evil(');
    expect(s.split('evil(').length - 1).toBe(s.split(literal).length - 1);
  });
});
