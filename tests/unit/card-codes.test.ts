// US-003 AC-4, AC-11: the warning codes of the card kinds are made in one
// place (D4, SCAR-017), and the fit warnings follow the kind of the card.
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {cardCode} from '../../src/core/card/warning';
import {fitWarnings} from '../../src/core/skill/fit';
import type {SkillCard} from '../../src/core/skill/read';

const card = (path: string, kind?: 'skill' | 'spell'): SkillCard => ({
  ...(kind === undefined ? {} : {kind}),
  path,
  name: path.replace(/^.*\//, '').replace(/\.md$/, ''),
  tags: [],
  details: [],
  blocks: [],
});

describe('US-003 AC-11: cardCode', () => {
  it.each([
    ['spell', 'IMAGE_OMITTED', 'SPELL_IMAGE_OMITTED'],
    ['skill', 'TEXT_OVERFLOW', 'SKILL_TEXT_OVERFLOW'],
    ['spell', 'FIT_UNKNOWN', 'SPELL_FIT_UNKNOWN'],
    ['skill', 'EMPTY', 'SKILL_EMPTY'],
  ] as const)('%s + %s is %s', (kind, name, code) => {
    expect(cardCode(kind, name)).toBe(code);
  });
});

describe('US-003 AC-11: no second copy of the codes', () => {
  const root = join(process.cwd(), 'src', 'core');
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.ts')) files.push(path);
    }
  };
  walk(root);
  it('looks at every source file of src/core (at least 8)', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });
  it('only src/core/card/warning.ts has a literal SKILL_ or SPELL_ code', () => {
    const hits = files
      .filter((f) => /['"`](SKILL|SPELL)_/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(root.length + 1));
    expect(hits).toEqual(['card/warning.ts']);
  });
});

describe('US-004 AC-11 (SCAR-017): the creature codes have no second copy either', () => {
  const root = join(process.cwd(), 'src', 'core');
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.ts')) files.push(path);
    }
  };
  walk(root);
  it('only src/core/card/warning.ts has a literal CREATURE_ code (the others use cardCode)', () => {
    const hits = files
      .filter((f) => /['"`]CREATURE_/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(root.length + 1));
    expect(hits).toEqual(['card/warning.ts']);
  });
});

describe('US-003 AC-4: fit warnings follow the kind of the card', () => {
  const cards = [
    card('a/S1.md'),
    card('a/P1.md', 'spell'),
    card('a/S2.md', 'skill'),
    card('a/P2.md', 'spell'),
  ];
  it('overflow: a skill gets SKILL_, a spell SPELL_, in card order', () => {
    const facts = cards.map((_, i) => ({i, size: 5.5, fits: false}));
    expect(fitWarnings(facts, cards)).toEqual([
      {code: 'SKILL_TEXT_OVERFLOW', path: 'a/S1.md', detail: '5.5 pt'},
      {code: 'SPELL_TEXT_OVERFLOW', path: 'a/P1.md', detail: '5.5 pt'},
      {code: 'SKILL_TEXT_OVERFLOW', path: 'a/S2.md', detail: '5.5 pt'},
      {code: 'SPELL_TEXT_OVERFLOW', path: 'a/P2.md', detail: '5.5 pt'},
    ]);
  });
  it('no fact: SKILL_FIT_UNKNOWN or SPELL_FIT_UNKNOWN by kind', () => {
    expect(fitWarnings([], cards).map((w) => w.code)).toEqual([
      'SKILL_FIT_UNKNOWN',
      'SPELL_FIT_UNKNOWN',
      'SKILL_FIT_UNKNOWN',
      'SPELL_FIT_UNKNOWN',
    ]);
  });
  it('a card without a kind is a skill card', () => {
    expect(
      fitWarnings([{i: 0, size: 4, fits: false}], [card('a/X.md')])[0]?.code,
    ).toBe('SKILL_TEXT_OVERFLOW');
  });
});
