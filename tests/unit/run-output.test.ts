// US-005 AC-5 (the output folder), AC-6 (the names), AC-8 (the warnings
// file). Expected values from the story's tables and examples (SCAR-033).
// Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {outputNames, runName} from '../../src/core/run/names';
import {checkOutputFolder} from '../../src/core/run/output';
import {warningsFile} from '../../src/core/run/report';

const VAULT = '/v';

describe('US-005 AC-5: checkOutputFolder', () => {
  it.each([
    ['/tmp/out', '/tmp/out'],
    ['/tmp/out/', '/tmp/out'],
    ['/tmp/out///', '/tmp/out'],
    ['/tmp//out/', '/tmp/out'],
    ['/tmp/./out', '/tmp/out'],
    ['/v/Cards', '/v/Cards'],
    ['/vault2', '/vault2'],
    ['/v-extra/out', '/v-extra/out'],
    ['C:\\out', 'C:\\out'],
    ['C:/out/', 'C:/out'],
    ['D:\\Cards\\Decks\\', 'D:\\Cards\\Decks'],
  ])('%j is accepted as %j', (text, folder) => {
    expect(checkOutputFolder(text, VAULT)).toEqual({ok: true, folder});
  });
  it.each([
    [''],
    ['   '],
    ['out'],
    ['./out'],
    ['~/out'],
    ['~'],
    ['/a/../b'],
    ['/a/..'],
    ['C:\\a\\..\\b'],
    ['/v'],
    ['/v/'],
    ['/v/.obsidian'],
    ['/v/.obsidian/plugins/x'],
    ['/'],
    ['C:\\'],
    ['C:/'],
  ])('%j is refused, naming the setting and the value', (text) => {
    const r = checkOutputFolder(text, VAULT);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/output folder/i);
    if (text.trim() !== '') expect(r.message).toContain(text);
  });
  it('the vault root is compared with its trailing slash too', () => {
    expect(checkOutputFolder('/v', '/v/').ok).toBe(false);
    expect(checkOutputFolder('/v/', '/v/').ok).toBe(false);
    expect(checkOutputFolder('/v/Cards', '/v/').ok).toBe(true);
  });
});

describe('US-005 AC-6: the names', () => {
  it.each([
    [
      'Reed / Hare: Opening',
      'Reed Hare Opening cards.pdf',
      'Reed Hare Opening cards warnings.md',
    ],
    ['.hidden', 'hidden cards.pdf', 'hidden cards warnings.md'],
    ['A  B', 'A B cards.pdf', 'A B cards warnings.md'],
    [
      'Opening Deck',
      'Opening Deck cards.pdf',
      'Opening Deck cards warnings.md',
    ],
    ['a*b?c"d<e>f|g\\h', 'abcdefgh cards.pdf', 'abcdefgh cards warnings.md'],
    ['...', 'Cards cards.pdf', 'Cards cards warnings.md'],
    ['', 'Cards cards.pdf', 'Cards cards warnings.md'],
    [' / : ', 'Cards cards.pdf', 'Cards cards warnings.md'],
  ])('%j gives %s and %s', (name, pdf, warnings) => {
    expect(outputNames(name)).toEqual({pdf, warnings});
  });
  it('a run from one folder is named after the folder, other choices Cards', () => {
    expect(runName([{path: 'Rulebook/Skills', isFolder: true}])).toBe('Skills');
    expect(runName([{path: 'A.md', isFolder: false}])).toBe('Cards');
    expect(
      runName([
        {path: 'A.md', isFolder: false},
        {path: 'B.md', isFolder: false},
      ]),
    ).toBe('Cards');
    expect(
      runName([
        {path: 'X', isFolder: true},
        {path: 'Y', isFolder: true},
      ]),
    ).toBe('Cards');
    expect(runName([])).toBe('Cards');
    expect(runName([{path: 'a/Skills/', isFolder: true}])).toBe('Skills');
    expect(runName([{path: '/', isFolder: true}])).toBe('Cards');
  });
});

describe('US-005 AC-8: the warnings file', () => {
  it('no warnings', () => {
    expect(warningsFile('Opening Deck', [])).toBe(
      '# Opening Deck cards: warnings\n\nNo warnings.\n',
    );
  });
  it('the example: one line per warning, in order, a line break at the end', () => {
    expect(
      warningsFile('Opening Deck', [
        {
          code: 'SKILL_IMAGE_OMITTED',
          path: 'skills/Reed Sweep.md',
          detail: 'pics/reed.png',
        },
        {code: 'SKILL_EMPTY', path: 'skills/Bare.md', detail: ''},
      ]),
    ).toBe(
      '# Opening Deck cards: warnings\n\n' +
        '- SKILL_IMAGE_OMITTED — skills/Reed Sweep.md — pics/reed.png\n' +
        '- SKILL_EMPTY — skills/Bare.md\n',
    );
  });
  it('contains no date and is the same text on every call', () => {
    const w = [{code: 'X', path: 'a.md', detail: 'd'}];
    expect(warningsFile('N', w)).toBe(warningsFile('N', w));
    expect(warningsFile('N', w)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
