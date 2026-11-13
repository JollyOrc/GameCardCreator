// US-009 AC-1: with no scheme (no branches on any card, no option) the Typst source of
// every card is the SAME TEXT as before the story. The golden file was written by the
// code of 2026-11-13 before any change of US-009 (SCAR-023: expected values taken
// from the real output, not from memory). Red until the code ticket is wrong; it must
// stay green through it.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {readCreature} from '../../src/core/creature/read';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {readSkill} from '../../src/core/skill/read';
import {DEFAULT_SIZES, DEFAULT_SKILL} from '../../src/core/skill/settings';
import {readSpell} from '../../src/core/spell/read';
import {DEFAULT_SPELL} from '../../src/core/spell/settings';
import {
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_WITH_CREDIT,
} from '../support/creature-fixtures';
import {EXAMPLE_NOTE} from '../support/skill-fixtures';
import {EXAMPLE_SPELL_NOTE} from '../support/spell-fixtures';

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
const creature = {
  ...readCreature(
    'creatures/Fen Hare.md',
    EXAMPLE_CREATURE_NOTE,
    DEFAULT_CREATURE,
  ).card,
  statblock: FEN_HARE_WITH_CREDIT,
};
const src = (
  cards: Parameters<typeof cardSheetTypst>[0],
  sheet = DEFAULT_SHEET,
  sizes = DEFAULT_SIZES,
) => {
  const r = cardSheetTypst(cards, sheet, sizes);
  if (!r.ok) throw new Error(r.message);
  return r.source;
};

describe('US-009 AC-1: no scheme, the same source as before', () => {
  it('the golden file has the six decks', () => {
    expect(Object.keys(golden).sort()).toEqual([
      'customSheetAndSizes',
      'mixedWithCreature',
      'oneSizeOnly',
      'skillAndSpell',
      'skillOnly',
      'spellOnly',
    ]);
  });
  it.each([
    ['skillOnly', () => src([skill])],
    ['spellOnly', () => src([spell])],
    ['skillAndSpell', () => src([skill, spell, skill])],
    ['mixedWithCreature', () => src([skill, creature, spell])],
    [
      'customSheetAndSizes',
      () =>
        src(
          [skill, spell],
          {
            ...DEFAULT_SHEET,
            cardWidth: 60,
            cardHeight: 85,
            margin: 12,
            gap: 2,
            cutMarks: false,
          },
          {maxSize: 8, minSize: 6, sizeStep: 0.5},
        ),
    ],
    [
      'oneSizeOnly',
      () =>
        src([skill], DEFAULT_SHEET, {maxSize: 7, minSize: 7, sizeStep: 0.25}),
    ],
  ])('%s is the text of the golden file, byte for byte', (key, make) => {
    expect(make()).toBe(golden[key]);
  });
  it('a card with an empty list of branches is the same as one without the field', () => {
    expect(src([{...skill, branches: []}])).toBe(golden.skillOnly);
  });
});
