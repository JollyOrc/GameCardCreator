// US-009 AC-10 (and US-004 AC-9): the credit line of a sheet at the source level: one
// function makes the line for both credits; the omitted-credit report applies to the
// joined line. Invented texts (SCAR-035).
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {readCreature} from '../../src/core/creature/read';
import type {SkillCard} from '../../src/core/skill/read';
import {
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_WITH_CREDIT,
} from '../support/creature-fixtures';
import {DEFAULT_SIZES} from '../../src/core/skill/settings';

const banded = (name: string): SkillCard => ({
  kind: 'skill',
  path: `skills/${name}.md`,
  name,
  tags: [],
  rawTags: [],
  details: [],
  blocks: [{kind: 'paragraph', runs: [{text: 'Text.'}]}],
  branches: [{tag: 'T', colour: '#f4d6b0', icon: 'sword', line: 1}],
});
const plain = (name: string): SkillCard => ({...banded(name), branches: []});
const hare = (credit: string) => ({
  ...readCreature(
    'creatures/Fen Hare.md',
    EXAMPLE_CREATURE_NOTE,
    DEFAULT_CREATURE,
  ).card,
  statblock: {...FEN_HARE_WITH_CREDIT, credit},
});
const make = (
  cards: (SkillCard | ReturnType<typeof hare>)[],
  iconCredit: string | undefined,
  sheet = DEFAULT_SHEET,
) => {
  const r = cardSheetTypst(
    cards,
    sheet,
    DEFAULT_SIZES,
    DEFAULT_CREATURE,
    iconCredit === undefined ? {} : {iconCredit},
  );
  if (!r.ok) throw new Error(r.message);
  return r;
};
const calls = (source: string): string[] =>
  [...source.matchAll(/gcc-credit\("((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!);

describe('US-009 AC-10: the icon credit in the source', () => {
  it('a sheet with an icon prints the text once, trimmed', () => {
    const r = make([banded('A'), banded('B')], '  Icons: X  ');
    expect(calls(r.source)).toEqual(['Icons: X']);
    expect(r.creditOmitted).toBeNull();
  });
  it('no icon on the sheet, an empty text or no option: no call', () => {
    expect(calls(make([plain('A')], 'Icons: X').source)).toEqual([]);
    expect(calls(make([banded('A')], '   ').source)).toEqual([]);
    expect(calls(make([banded('A')], undefined).source)).toEqual([]);
  });
  it('the helper is defined only when a credit can be printed', () => {
    expect(make([banded('A')], 'Icons: X').source).toContain(
      '#let gcc-credit(',
    );
    expect(make([plain('A')], 'Icons: X').source).not.toContain(
      '#let gcc-credit(',
    );
  });
  it('one text per sheet that has an icon, none for a sheet without', () => {
    const cards = [
      ...Array.from({length: 9}, (_, i) => plain(`P${i}`)),
      banded('B'),
    ];
    expect(calls(make(cards, 'Icons: X').source)).toEqual(['Icons: X']);
  });
  it('a text with a quote or a backslash goes through the escaping function', () => {
    const r = make([banded('A')], 'Icons "by" X \\ Y');
    expect(calls(r.source)).toEqual(['Icons \\"by\\" X \\\\ Y']);
  });
  it('a band under 3 mm: the line is left out and the height reported (the joined line counts)', () => {
    const tall = {...DEFAULT_SHEET, cardHeight: 98, margin: 1};
    const r = make([banded('A')], 'Icons: X', tall);
    expect(r.creditOmitted).toBe(1.5);
    expect(calls(r.source)).toEqual([]);
    expect(make([banded('A')], '', tall).creditOmitted).toBeNull();
    expect(make([plain('A')], 'Icons: X', tall).creditOmitted).toBeNull();
  });
  it('with a creature credit: it comes first, a full stop is added only when it has none', () => {
    expect(
      calls(make([hare('Art by A'), banded('B')], 'Icons: X').source),
    ).toEqual(['Art by A. Icons: X']);
    for (const end of ['.', '!', '?']) {
      expect(
        calls(make([hare(`Art by A${end}`), banded('B')], 'Icons: X').source),
      ).toEqual([`Art by A${end} Icons: X`]);
    }
  });
  it('a creature credit alone or an icon credit with no icon on the sheet: no full stop added', () => {
    expect(calls(make([hare('Art by A')], 'Icons: X').source)).toEqual([
      'Art by A',
    ]);
    expect(
      calls(make([hare('Art by A'), plain('B')], 'Icons: X').source),
    ).toEqual(['Art by A']);
  });
  it('a blank icon credit on a low band reports nothing', () => {
    const tall = {...DEFAULT_SHEET, cardHeight: 98, margin: 1};
    expect(make([banded('A')], '   ', tall).creditOmitted).toBeNull();
  });
});
