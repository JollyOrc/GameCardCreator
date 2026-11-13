// US-009 AC-1, AC-7: reading the scheme note into its rows. Expected values come
// from the story's example (invented, SCAR-035) and its rules. The table forms
// are tested one syntax rule at a time (SCAR-028). Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {schemeCode} from '../../src/core/card/warning';
import {readScheme} from '../../src/core/scheme/read';
import {
  EXAMPLE_ROWS,
  EXAMPLE_SCHEME,
  SCHEME_PATH,
} from '../support/scheme-fixtures';

// a byte-order mark as a character code (a literal one is irregular whitespace for the linter)
const BOM = String.fromCharCode(0xfeff);
const read = (text: string) => readScheme(SCHEME_PATH, text);
const warn = (name: string, detail: string) => ({
  code: schemeCode(name),
  path: SCHEME_PATH,
  detail,
});
/** A note with one table made from `rows` (cells joined by pipes), header `Tag | Colour | Icon`. */
const table = (...rows: string[]) =>
  ['| Tag | Colour | Icon |', '|---|---|---|', ...rows, ''].join('\n');

describe('US-009 AC-1: the example note', () => {
  const r = read(EXAMPLE_SCHEME);
  it('gives the four rows in the order of the table, with their note lines', () => {
    expect(r.scheme.rows).toEqual(EXAMPLE_ROWS);
    expect(r.warnings).toEqual([]);
  });
  it('gives the credit text of the front matter', () => {
    expect(r.scheme.credit).toBe(
      'Icons: Game-icons.net (CC BY 3.0), via RPG Awesome',
    );
  });
});

describe('US-009 AC-1: the table, one syntax rule at a time', () => {
  it('pipes at the ends of the lines are optional', () => {
    const r = read(
      'Tag | Colour | Icon\n---|---|---\nSwordplay | #F4D6B0 | sword\n',
    );
    expect(r.scheme.rows).toEqual([
      {tag: 'Swordplay', colour: '#f4d6b0', icon: 'sword', line: 3},
    ]);
    expect(r.warnings).toEqual([]);
  });
  it('the alignment row may carry colons and spaces', () => {
    const r = read(
      '| Tag | Colour | Icon |\n| :--- | :-: | ---: |\n| Hexes | #E4F0A8 | skull |\n',
    );
    expect(r.scheme.rows.map((x) => x.tag)).toEqual(['Hexes']);
  });
  it('the header cells are found in any case and any order, with any spaces', () => {
    const r = read(
      '|  ICON | colour |   tag  |\n|---|---|---|\n| skull | #E4F0A8 | Hexes |\n',
    );
    expect(r.scheme.rows).toEqual([
      {tag: 'Hexes', colour: '#e4f0a8', icon: 'skull', line: 3},
    ]);
  });
  it('other columns (Label, Group, anything) are ignored, wherever they stand', () => {
    const r = read(
      '| Group | Tag | Notes | Colour | Label | Icon |\n|---|---|---|---|---|---|\n| Magic | Hexes | a, b | #E4F0A8 | The Hexes | skull |\n',
    );
    expect(r.scheme.rows).toEqual([
      {tag: 'Hexes', colour: '#e4f0a8', icon: 'skull', line: 3},
    ]);
    expect(r.warnings).toEqual([]);
  });
  it('backticks around a cell and a # before the tag are not part of the value', () => {
    const r = read(table('| `#Hexes` | `#E4F0A8` | `skull` |'));
    expect(r.scheme.rows).toEqual([
      {tag: 'Hexes', colour: '#e4f0a8', icon: 'skull', line: 3},
    ]);
  });
  it('an escaped pipe in a cell does not shift the columns', () => {
    const r = read(
      '| Label | Tag | Colour | Icon |\n|---|---|---|---|\n| A \\| B | Hexes | #E4F0A8 | skull |\n',
    );
    expect(r.scheme.rows).toEqual([
      {tag: 'Hexes', colour: '#e4f0a8', icon: 'skull', line: 3},
    ]);
    expect(r.warnings).toEqual([]);
  });
  it('prose before and after the table is allowed; a blank line ends the table', () => {
    const r = read(
      `The scheme.\n\n${table('| Hexes | #E4F0A8 | skull |')}\n| Stray | #000000 | sword |\n\nMore prose.\n`,
    );
    expect(r.scheme.rows.map((x) => x.tag)).toEqual(['Hexes']);
  });
  it('the first table with the three columns is the scheme; an earlier one without them is skipped', () => {
    const r = read(
      `| Name | Size |\n|---|---|\n| a | b |\n\n${table('| Hexes | #E4F0A8 | skull |')}`,
    );
    expect(r.scheme.rows.map((x) => x.tag)).toEqual(['Hexes']);
    expect(r.scheme.rows[0]!.line).toBe(7);
  });
  it('a later table is not read', () => {
    const r = read(
      `${table('| Hexes | #E4F0A8 | skull |')}\n${table('| Other | #000000 | sword |')}`,
    );
    expect(r.scheme.rows.map((x) => x.tag)).toEqual(['Hexes']);
  });
  it('a table inside a quote or a list item is not the scheme (SCAR-041)', () => {
    const quoted = read(
      '> | Tag | Colour | Icon |\n> |---|---|---|\n> | Hexes | #E4F0A8 | skull |\n',
    );
    expect(quoted.scheme.rows).toEqual([]);
    expect(quoted.warnings).toEqual([warn('TABLE_MISSING', '')]);
    const listed = read(
      '- item\n  | Tag | Colour | Icon |\n  |---|---|---|\n  | Hexes | #E4F0A8 | skull |\n',
    );
    expect(listed.scheme.rows).toEqual([]);
    // a top-level table after a quoted one is the scheme
    const both = read(
      `> | Tag | Colour | Icon |\n> |---|---|---|\n> | Quoted | #000000 | sword |\n\n${table('| Hexes | #E4F0A8 | skull |')}`,
    );
    expect(both.scheme.rows.map((x) => x.tag)).toEqual(['Hexes']);
  });
  it('a table inside a code fence is not a table', () => {
    const r = read(
      '```\n| Tag | Colour | Icon |\n|---|---|---|\n| Hexes | #E4F0A8 | skull |\n```\n',
    );
    expect(r.warnings).toEqual([warn('TABLE_MISSING', '')]);
  });
  it('CRLF line ends and a byte-order mark are read; line numbers count lines of the note', () => {
    const text = BOM + EXAMPLE_SCHEME.replace(/\n/g, '\r\n');
    const r = read(text);
    expect(r.scheme.rows).toEqual(EXAMPLE_ROWS);
    expect(r.scheme.credit).toBe(
      'Icons: Game-icons.net (CC BY 3.0), via RPG Awesome',
    );
  });
  it('the front matter is removed once: a table-like line inside it is no table (SCAR-034)', () => {
    const r = read(
      '---\ncredit: "| Tag | Colour | Icon |"\n---\nno table here\n',
    );
    expect(r.warnings).toEqual([warn('TABLE_MISSING', '')]);
  });
  it('never throws: an empty note, plain prose and binary-looking text give the table warning', () => {
    for (const text of ['', 'just words\n', '\u0000\u0001|||\n|\n']) {
      const r = read(text);
      expect(r.scheme.rows).toEqual([]);
      expect(r.warnings).toEqual([warn('TABLE_MISSING', '')]);
    }
  });
});

describe('US-009 AC-1: the front matter', () => {
  const withHead = (head: string) =>
    `---\n${head}\n---\n${table('| Hexes | #E4F0A8 | skull |')}`;
  it('schemeVersion 1 and iconSet rpg-awesome are accepted, and so is their absence', () => {
    for (const head of [
      'schemeVersion: 1\niconSet: rpg-awesome',
      'schemeVersion: 1',
      'iconSet: rpg-awesome',
      'other: x',
    ]) {
      const r = read(withHead(head));
      expect(r.scheme.rows, head).toHaveLength(1);
      expect(r.warnings, head).toEqual([]);
    }
  });
  it('credit: absent is null, empty is the empty text, a text is the text', () => {
    expect(read(withHead('other: x')).scheme.credit).toBeNull();
    expect(read(withHead('credit: ""')).scheme.credit).toBe('');
    expect(read(withHead('credit: "Icons by a person"')).scheme.credit).toBe(
      'Icons by a person',
    );
    expect(read(withHead('credit: Icons by a person')).scheme.credit).toBe(
      'Icons by a person',
    );
  });
});

describe('US-009 AC-7: what is refused, with the note path and the detail as written', () => {
  it('another schemeVersion: SCHEME_UNSUPPORTED, no rows, nothing else', () => {
    const r = read(
      `---\nschemeVersion: 2\n---\n${table('| Hexes | #E4F0A8 | skull |')}`,
    );
    expect(r.scheme.rows).toEqual([]);
    expect(r.warnings).toEqual([warn('UNSUPPORTED', 'schemeVersion: 2')]);
  });
  it('another iconSet: SCHEME_UNSUPPORTED naming the value', () => {
    const r = read(
      `---\niconSet: other\n---\n${table('| Hexes | #E4F0A8 | skull |')}`,
    );
    expect(r.scheme.rows).toEqual([]);
    expect(r.warnings).toEqual([warn('UNSUPPORTED', 'iconSet: other')]);
  });
  it('no table with the three columns: SCHEME_TABLE_MISSING', () => {
    const r = read('| Tag | Colour |\n|---|---|\n| Hexes | #E4F0A8 |\n');
    expect(r.scheme.rows).toEqual([]);
    expect(r.warnings).toEqual([warn('TABLE_MISSING', '')]);
  });
  it.each([
    ['an empty tag', '|  | #E4F0A8 | skull |', 'line 3: empty tag'],
    [
      'a colour with three digits',
      '| A | #fff | skull |',
      'line 3: bad colour "#fff"',
    ],
    [
      'a colour without #',
      '| A | E4F0A8 | skull |',
      'line 3: bad colour "E4F0A8"',
    ],
    [
      'a colour with a wrong digit',
      '| A | #E4F0AG | skull |',
      'line 3: bad colour "#E4F0AG"',
    ],
    [
      'a colour with an alpha part',
      '| A | #E4F0A8FF | skull |',
      'line 3: bad colour "#E4F0A8FF"',
    ],
    ['an empty colour', '| A |  | skull |', 'line 3: bad colour ""'],
    [
      'an unknown icon',
      '| A | #E4F0A8 | nonesuch |',
      'line 3: unknown icon "nonesuch"',
    ],
    ['an empty icon', '| A | #E4F0A8 |  |', 'line 3: unknown icon ""'],
    ['a row with fewer cells', '| A | #E4F0A8 |', 'line 3: unknown icon ""'],
  ])('%s: SCHEME_ROW_INVALID, the row is ignored', (_n, row, detail) => {
    const r = read(table(row, '| Good | #E4F0A8 | skull |'));
    expect(r.warnings).toEqual([warn('ROW_INVALID', detail)]);
    expect(r.scheme.rows.map((x) => x.tag)).toEqual(['Good']);
  });
  it('the colour is stored in lower case, an icon name without case', () => {
    const r = read(table('| A | #AbCdEf | Sword |'));
    expect(r.scheme.rows).toEqual([
      {tag: 'A', colour: '#abcdef', icon: 'sword', line: 3},
    ]);
    expect(r.warnings).toEqual([]);
  });
  it('a tag used twice (without case, #, spaces): the earlier row stays, the later is refused', () => {
    const r = read(
      table(
        '| Swordplay | #F4D6B0 | sword |',
        '| #swordplay | #000000 | anvil |',
        '| Other | #111111 | fire |',
      ),
    );
    expect(r.scheme.rows.map((x) => [x.tag, x.colour])).toEqual([
      ['Swordplay', '#f4d6b0'],
      ['Other', '#111111'],
    ]);
    expect(r.warnings).toEqual([
      warn('ROW_INVALID', 'line 4: duplicate tag "#swordplay"'),
    ]);
  });
  it('several problems come one per row in the order of the rows', () => {
    const r = read(table('| A | #zzz | skull |', '| B | #E4F0A8 | nope |'));
    expect(r.warnings.map((w) => w.detail)).toEqual([
      'line 3: bad colour "#zzz"',
      'line 4: unknown icon "nope"',
    ]);
  });
  it('a table whose rows are all invalid gives its row warnings and no table warning', () => {
    const r = read(table('| A | #zzz | skull |'));
    expect(r.scheme.rows).toEqual([]);
    expect(r.warnings.map((w) => w.code)).toEqual([schemeCode('ROW_INVALID')]);
  });
  it('the reader does not change its input and gives the same result twice (rule 7)', () => {
    const text = EXAMPLE_SCHEME;
    expect(read(text)).toEqual(read(text));
    expect(text).toBe(EXAMPLE_SCHEME);
  });
});
