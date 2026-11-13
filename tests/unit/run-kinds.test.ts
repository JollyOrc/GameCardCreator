// US-005 AC-3: the kind of a note by folder rules; AC-2: the notes of a
// selection. Expected values from the story's tables. Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {checkKindRules, kindOf, type KindRule} from '../../src/core/run/kinds';
import {expandSelection} from '../../src/core/run/select';

const rules: KindRule[] = [
  {folder: 'Skills', kind: 'skill'},
  {folder: 'Skills/Magic', kind: 'spell'},
  {folder: 'Spells', kind: 'spell'},
];

describe('US-005 AC-3: kindOf', () => {
  it.each([
    ['Skills/A.md', 'skill'],
    ['Skills/Magic/B.md', 'spell'],
    ['Skills/Magic/Deep/C.md', 'spell'],
    ['Spells/D.md', 'spell'],
    ['Skills Extra/E.md', null],
    ['Other/Skills/F.md', null],
    ['skills/G.md', null],
    ['Skills.md', null],
    ['Spells', null],
  ])('%s is %s', (path, kind) => {
    expect(kindOf(path, rules)).toBe(kind);
  });
  it('the order of the rules does not matter: the longest folder wins', () => {
    expect(kindOf('Skills/Magic/B.md', [...rules].reverse())).toBe('spell');
  });
  it('a folder written with a trailing slash is the same folder', () => {
    expect(kindOf('Skills/A.md', [{folder: 'Skills/', kind: 'skill'}])).toBe(
      'skill',
    );
    expect(
      kindOf('Skills Extra/E.md', [{folder: 'Skills/', kind: 'skill'}]),
    ).toBeNull();
  });
  it('no rules: no kind', () => {
    expect(kindOf('Skills/A.md', [])).toBeNull();
  });
});

describe('US-005 AC-3: checkKindRules', () => {
  it('valid rules give no message', () => {
    expect(checkKindRules(rules)).toEqual([]);
    expect(checkKindRules([])).toEqual([]);
  });
  it.each([
    [[{folder: '', kind: 'skill'}], /folder/i],
    [[{folder: '   ', kind: 'skill'}], /folder/i],
    [[{folder: '/', kind: 'skill'}], /folder/i],
    [[{folder: 'A', kind: 'monster'}], /kind/i], // creature is a kind since US-004
    [
      [
        {folder: 'A', kind: 'skill'},
        {folder: 'A/', kind: 'spell'},
      ],
      /twice|both|same/i,
    ],
  ])('%j is refused', (bad, pattern) => {
    const issues = checkKindRules(bad as unknown as KindRule[]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(pattern);
  });
});

describe('US-005 AC-2: expandSelection', () => {
  const below = (folder: string): string[] =>
    ({
      Skills: [
        'Skills/B.md',
        'Skills/a.md',
        'Skills/Sub/C.md',
        'Skills/pic.png',
        'Skills/Sub/doc.pdf',
      ],
      Empty: [],
    })[folder] ?? [];
  it('the example: Z and the folder Skills give Z, a, B, C', () => {
    const out = expandSelection(
      [
        {path: 'Z.md', isFolder: false},
        {path: 'Skills', isFolder: true},
      ],
      below,
    );
    expect(out).toEqual([
      'Z.md',
      'Skills/a.md',
      'Skills/B.md',
      'Skills/Sub/C.md',
    ]);
  });
  it('a note chosen by itself and by its folder counts at its first place', () => {
    const out = expandSelection(
      [
        {path: 'Skills/B.md', isFolder: false},
        {path: 'Skills', isFolder: true},
      ],
      below,
    );
    expect(out).toEqual(['Skills/B.md', 'Skills/a.md', 'Skills/Sub/C.md']);
  });
  it('files that are not notes are skipped, also when chosen directly', () => {
    expect(
      expandSelection(
        [
          {path: 'Skills/pic.png', isFolder: false},
          {path: 'x.pdf', isFolder: false},
        ],
        below,
      ),
    ).toEqual([]);
  });
  it('an empty folder and no choice give nothing', () => {
    expect(expandSelection([{path: 'Empty', isFolder: true}], below)).toEqual(
      [],
    );
    expect(expandSelection([], below)).toEqual([]);
  });
  it('names that differ only by case keep a fixed order (upper case first)', () => {
    expect(
      expandSelection([{path: 'x', isFolder: true}], () => [
        'x/a.md',
        'x/A.md',
      ]),
    ).toEqual(['x/A.md', 'x/a.md']);
  });
  it('the same note chosen twice is one card', () => {
    expect(
      expandSelection(
        [
          {path: 'A.md', isFolder: false},
          {path: 'A.md', isFolder: false},
        ],
        below,
      ),
    ).toEqual(['A.md']);
  });
});
