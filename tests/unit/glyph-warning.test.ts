// US-010 AC-1: the warning of a note whose card has characters no font draws:
// one per note, the code of its kind, the characters in code point order with
// their code points, at most ten and `and N more`. `glyphDetail(codes)` makes
// the detail, `glyphWarnings(cards, has, headings)` the warnings in card order
// (`has(codePoint)`: some font of the compile draws it). Loaded at run time;
// red until the code ticket (G2, 2026-11-17). Invented notes (SCAR-035).
import {describe, expect, it} from 'vitest';
import {readCreature} from '../../src/core/creature/read';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {readSkill} from '../../src/core/skill/read';
import {DEFAULT_SKILL} from '../../src/core/skill/settings';
import {readSpell} from '../../src/core/spell/read';
import {DEFAULT_SPELL} from '../../src/core/spell/settings';

const MODULE = '../../src/core/glyph/check';
interface Warning {
  code: string;
  path: string;
  detail: string;
}
interface Module {
  glyphDetail(codes: readonly number[]): string;
  glyphWarnings(
    cards: readonly unknown[],
    has: (codePoint: number) => boolean,
    headings: typeof DEFAULT_CREATURE,
  ): Warning[];
}
const load = async (): Promise<Module> => {
  const path: string = MODULE;
  return (await import(/* @vite-ignore */ path)) as Module;
};
/** Drawn: U+0020 to U+024F (Latin), as the stand-in font of the unit tests. */
const latin = (c: number) => c >= 0x20 && c < 0x250;
const hex = (c: number) => c.toString(16).toUpperCase().padStart(4, '0');
const skill = (name: string, body: string) =>
  readSkill(`skills/${name}.md`, `${body}\n`, DEFAULT_SKILL).card;

describe('US-010 AC-1: the detail of a warning', () => {
  it('the characters in code point order, each as the character, a space and U+ with its code point', async () => {
    const {glyphDetail} = await load();
    // 😀 (U+1F600) given before 漢 (U+6F22): the order is the code point's
    expect(glyphDetail([0x1f600, 0x6f22])).toBe('漢 U+6F22, 😀 U+1F600');
  });
  it('upper-case hexadecimal of at least four digits: U+00A9, U+2713, U+1F600', async () => {
    const {glyphDetail} = await load();
    expect(glyphDetail([0xa9])).toBe('© U+00A9');
    expect(glyphDetail([0x2713])).toBe('✓ U+2713');
    expect(glyphDetail([0x1f600])).toBe('😀 U+1F600');
  });
  it('ten characters are all listed; twelve give the first ten and `and 2 more`; eleven give `and 1 more`', async () => {
    const {glyphDetail} = await load();
    const codes = (n: number) => Array.from({length: n}, (_, i) => 0x4e00 + i);
    const listed = (n: number) =>
      codes(n)
        .map((c) => `${String.fromCodePoint(c)} U+${hex(c)}`)
        .join(', ');
    expect(glyphDetail(codes(10))).toBe(listed(10));
    expect(glyphDetail(codes(11))).toBe(`${listed(10)} and 1 more`);
    expect(glyphDetail(codes(12))).toBe(`${listed(10)} and 2 more`);
    // the ten are the first ten in code point order even when given in reverse
    expect(glyphDetail(codes(12).reverse())).toBe(`${listed(10)} and 2 more`);
  });
});

describe('US-010 AC-1: one warning per note, with the code of its kind', () => {
  it("a skill with 漢 and 😀: SKILL_GLYPH_MISSING, the note's path, the detail of the story", async () => {
    const {glyphWarnings} = await load();
    const card = skill('Parry', 'Text 😀 and 漢 here.');
    expect(glyphWarnings([card], latin, DEFAULT_CREATURE)).toEqual([
      {
        code: 'SKILL_GLYPH_MISSING',
        path: 'skills/Parry.md',
        detail: '漢 U+6F22, 😀 U+1F600',
      },
    ]);
  });
  it('a spell: SPELL_GLYPH_MISSING; twelve different ideographs: ten and `and 2 more`', async () => {
    const {glyphWarnings} = await load();
    const han = Array.from({length: 12}, (_, i) =>
      String.fromCodePoint(0x4e00 + i),
    ).join('');
    const card = readSpell('spells/Spark.md', `${han}\n`, DEFAULT_SPELL).card;
    const [w] = glyphWarnings([card], latin, DEFAULT_CREATURE);
    expect(w?.code).toBe('SPELL_GLYPH_MISSING');
    expect(w?.path).toBe('spells/Spark.md');
    expect(w?.detail.endsWith(' and 2 more')).toBe(true);
    expect(w?.detail.startsWith('一 U+4E00, 丁 U+4E01')).toBe(true);
  });
  it('a creature whose Signs section holds 漢: CREATURE_GLYPH_MISSING', async () => {
    const {glyphWarnings} = await load();
    const note =
      '---\nvigour: 11\nmight: 4\n---\n## Signs\nSpur 漢 im Schilf.\n';
    const card = readCreature(
      'creatures/Fen Hare.md',
      note,
      DEFAULT_CREATURE,
    ).card;
    const warnings = glyphWarnings(
      [{...card, statblock: null}],
      latin,
      DEFAULT_CREATURE,
    );
    expect(warnings.map((w) => [w.code, w.path])).toEqual([
      ['CREATURE_GLYPH_MISSING', 'creatures/Fen Hare.md'],
    ]);
    expect(warnings[0]!.detail).toBe('漢 U+6F22');
  });
  it('a character that occurs many times in one note is listed once; a note with all characters drawn gives nothing', async () => {
    const {glyphWarnings} = await load();
    const many = skill('Many', '漢 漢 漢 ★★ 漢');
    expect(glyphWarnings([many], latin, DEFAULT_CREATURE)).toEqual([
      {
        code: 'SKILL_GLYPH_MISSING',
        path: 'skills/Many.md',
        detail: '★ U+2605, 漢 U+6F22',
      },
    ]);
    expect(
      glyphWarnings(
        [skill('Plain', 'Only é and ß here.')],
        latin,
        DEFAULT_CREATURE,
      ),
    ).toEqual([]);
  });
});

describe('US-010 AC-1, AC-5: the warnings follow the order of the cards; each note once', () => {
  it('three notes, the middle one clean: two warnings, in the order of the cards', async () => {
    const {glyphWarnings} = await load();
    const cards = [skill('B', '漢'), skill('A', 'clean'), skill('C', '😀')];
    expect(
      glyphWarnings(cards, latin, DEFAULT_CREATURE).map((w) => w.path),
    ).toEqual(['skills/B.md', 'skills/C.md']);
  });
  it('the coverage is asked per code point and only for characters of the card text', async () => {
    const {glyphWarnings} = await load();
    const asked: number[] = [];
    glyphWarnings(
      [skill('Q', 'ab 漢')],
      (c) => (asked.push(c), latin(c)),
      DEFAULT_CREATURE,
    );
    expect(asked).toContain(0x6f22);
    expect(asked).not.toContain(0x20); // spaces are not asked
    expect(new Set(asked).size).toBe(
      asked.filter((c, i) => asked.indexOf(c) === i).length,
    );
  });
  it('the result does not change the cards and the same input gives the same warnings (determinism)', async () => {
    const {glyphWarnings} = await load();
    const card = skill('D', '漢 😀');
    const before = JSON.stringify(card);
    const a = glyphWarnings([card], latin, DEFAULT_CREATURE);
    const b = glyphWarnings([card], latin, DEFAULT_CREATURE);
    expect(b).toEqual(a);
    expect(JSON.stringify(card)).toBe(before);
  });
});
