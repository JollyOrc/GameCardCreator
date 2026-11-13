// US-002 AC-7 (rule 6): the one function that turns user text into Typst, and
// a text check that the emitter uses nothing else (SCAR-017, SCAR-023).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {typstString} from '../../src/core/card/escape';

describe('US-002 AC-7: typstString', () => {
  it.each([
    ['plain', '"plain"'],
    ['', '""'],
    ['a"b', '"a\\"b"'],
    ['a\\b', '"a\\\\b"'],
    ['\\"', '"\\\\\\""'],
    ['line\nbreak', '"line\\nbreak"'],
    ['cr\rtab\t', '"cr\\rtab\\t"'],
    ['nul\u0000x', '"nul\\u{0}x"'],
    ['del\u007fx', '"del\\u{7f}x"'],
    ['bell\u0007', '"bell\\u{7}"'],
    ['# $ * _ @ <x> ` // [ ] = - + /', '"# $ * _ @ <x> ` // [ ] = - + /"'],
    ['é ß — “q” 日本 🙂', '"é ß — “q” 日本 🙂"'],
  ])('%j becomes %s', (text, literal) => {
    expect(typstString(text)).toBe(literal);
  });
});

describe('US-002 AC-7: the emitter writes user text only through typstString', () => {
  const source = readFileSync(
    // The builder moved from skill/sheet.ts to card/sheet.ts (US-003 #6).
    join(process.cwd(), 'src', 'core', 'card', 'sheet.ts'),
    'utf8',
  );
  const code = source
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
  /** `typstString(...)` calls removed (balanced to two parenthesis levels). */
  const withoutEscaped = code
    .join('\n')
    .replace(/typstString\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g, 'ESCAPED');
  const interpolations = [...withoutEscaped.matchAll(/\$\{([^}]*)\}/g)].map(
    (m) => m[1]!,
  );
  const userText =
    /\b(card\.(name|tags|path|details|blocks)|run\.text|d\.(label|value)|item\.|tags\b|row\b|\bt\b)/;

  it('writes user text through typstString at exactly seven places: name, tag, row, run (US-002), and since US-004 a creature title, a section heading, the credit', () => {
    expect(withoutEscaped.match(/ESCAPED/g)?.length).toBe(7);
  });
  it('no interpolation left outside typstString names a user-text field', () => {
    expect(interpolations.length).toBeGreaterThan(10); // the check looked at the templates
    const bad = interpolations.filter((i) => userText.test(i));
    // Allowed, each holds text that was escaped when it was built (asserted
    // above): the joined tags, the joined row, the description's blocks (their
    // runs are escaped in `runCode`).
    expect(bad.sort()).toEqual(['blocksCode(card.blocks)', 'row', 'tags']);
  });
});
