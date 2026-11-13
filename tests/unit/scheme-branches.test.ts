// US-009 AC-2: which rows a note's tags select, and in which order. Rows are those
// of the story's example (invented, SCAR-035). Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {branchesOf} from '../../src/core/scheme/branches';
import {EXAMPLE_ROWS} from '../support/scheme-fixtures';

const rows = EXAMPLE_ROWS.map((r) => ({...r}));
const tags = (...t: string[]) => branchesOf(t, rows).map((b) => b.tag);

describe('US-009 AC-2: the branches of a note', () => {
  it('one mapped tag among others: only the mapped one counts (CombatSkill has no row)', () => {
    expect(tags('CombatSkill', 'Swordplay')).toEqual(['Swordplay']);
  });
  it("several mapped tags come in the order of the NOTE's tags, not of the table", () => {
    expect(tags('Pyromancy', 'Hexes')).toEqual(['Pyromancy', 'Hexes']);
    expect(tags('Hexes', 'Pyromancy')).toEqual(['Hexes', 'Pyromancy']);
  });
  it('tags compare without case, a leading #, backticks and surrounding spaces', () => {
    expect(tags('#swordplay ')).toEqual(['Swordplay']);
    expect(tags(' `HEXES` ')).toEqual(['Hexes']);
    expect(tags('##Stonework')).toEqual([]); // one # only
  });
  it('a note with no mapped tag and a note with no tags have no branch', () => {
    expect(tags('Misc', 'CombatSkill')).toEqual([]);
    expect(tags()).toEqual([]);
  });
  it('a tag written twice in the note gives its branch once, at its first place', () => {
    expect(tags('Hexes', 'Pyromancy', '#hexes')).toEqual([
      'Hexes',
      'Pyromancy',
    ]);
  });
  it('the branch carries the colour and the icon of its row', () => {
    expect(branchesOf(['Hexes'], rows)).toEqual([
      {tag: 'Hexes', colour: '#e4f0a8', icon: 'skull', line: 11},
    ]);
  });
  it('no rows: no branch for any note', () => {
    expect(branchesOf(['Hexes'], [])).toEqual([]);
  });
  it('does not change its inputs and gives the same result twice (rule 7)', () => {
    const t = ['Pyromancy', 'Hexes'];
    const a = branchesOf(t, rows);
    expect(branchesOf(t, rows)).toEqual(a);
    expect(t).toEqual(['Pyromancy', 'Hexes']);
    expect(rows).toEqual(EXAMPLE_ROWS.map((r) => ({...r})));
  });
});
