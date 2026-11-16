// US-010 AC-1, AC-2 and the terms: the card text, the code points the plugin
// sets on a card, taken from cards made by the real readers (SCAR-023). What is
// not card text stays out: the statblock's own text, the credit, the icons.
// `cardCodePoints(card, headings)` answers the sorted distinct code points of a
// card's text, spaces and invisible characters left out. Loaded at run time;
// red until the code ticket (G2, 2026-11-17). Invented notes (SCAR-035).
import {describe, expect, it} from 'vitest';
import {readCreature} from '../../src/core/creature/read';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {readSkill} from '../../src/core/skill/read';
import {DEFAULT_SKILL} from '../../src/core/skill/settings';
import {readSpell} from '../../src/core/spell/read';
import {DEFAULT_SPELL} from '../../src/core/spell/settings';
import {FEN_HARE_ANSWER} from '../support/creature-fixtures';

const MODULE = '../../src/core/glyph/check';
type Card = Parameters<Module['cardCodePoints']>[0];
interface Module {
  cardCodePoints(card: unknown, headings: typeof DEFAULT_CREATURE): number[];
}
const load = async (): Promise<Module> => {
  const path: string = MODULE;
  return (await import(/* @vite-ignore */ path)) as Module;
};
const cp = (s: string): number[] => [...s].map((c) => c.codePointAt(0)!);
const has = (set: number[], s: string) => cp(s).every((c) => set.includes(c));
const hasNone = (set: number[], s: string) =>
  cp(s).every((c) => !set.includes(c));

const SKILL = [
  '---',
  'tags:',
  '  - CombatSkill',
  '  - Tag☆',
  'timing: rëaction',
  '---',
  'Plain ©, **bold ✓**, *italic ♞*.',
  '',
  '- item one 漢',
  '- item two',
  '  - nested 😀',
  '',
  '---',
  '',
  'After the rule.',
  '',
].join('\n');

describe('US-010 terms: the text of a skill card', () => {
  it('title (the file name), tags, details row, every run and every list item, nested ones too', async () => {
    const {cardCodePoints} = await load();
    const card = readSkill('skills/Pärry.md', SKILL, DEFAULT_SKILL).card;
    const set = cardCodePoints(card as Card, DEFAULT_CREATURE);
    expect(has(set, 'Pärry')).toBe(true); // the title
    expect(has(set, '☆')).toBe(true); // a tag
    expect(has(set, 'ë')).toBe(true); // the details row: `Time: rëaction`
    expect(has(set, '©')).toBe(true); // plain text
    expect(has(set, '✓')).toBe(true); // a bold run
    expect(has(set, '♞')).toBe(true); // an italic run
    expect(has(set, '漢')).toBe(true); // a list item
    expect(has(set, '😀')).toBe(true); // a nested list item, one code point U+1F600
    expect(set).toContain(0x1f600);
    expect(set.filter((c) => c === 0x1f600)).toHaveLength(1);
    expect(set.some((c) => c >= 0xd800 && c <= 0xdfff)).toBe(false); // no surrogate halves
    // (spaces are never in the set, so the words are tested without them)
    expect(has(set, 'Afterrule')).toBe(true);
  });
  it('the result is sorted by code point even when the text is not (later characters have lower code points)', async () => {
    const {cardCodePoints} = await load();
    const card = readSkill('skills/B.md', 'zz ♞ é a\n', DEFAULT_SKILL).card;
    const set = cardCodePoints(card as Card, DEFAULT_CREATURE);
    expect(set).toEqual([...set].sort((a, b) => a - b));
    expect(set.indexOf(0x61)).toBeLessThan(set.indexOf(0xe9));
    expect(set.indexOf(0xe9)).toBeLessThan(set.indexOf(0x265e));
  });
  it('the result is sorted and has each code point once', async () => {
    const {cardCodePoints} = await load();
    const card = readSkill(
      'skills/A.md',
      'aaa bbb aaa ♞♞♞\n',
      DEFAULT_SKILL,
    ).card;
    const set = cardCodePoints(card as Card, DEFAULT_CREATURE);
    expect(set).toEqual([...new Set(set)].sort((a, b) => a - b));
    expect(set.filter((c) => c === 0x265e)).toHaveLength(1);
  });
});

describe('US-010 terms: the text of a spell card', () => {
  it('title, tags and text; there is no details row', async () => {
    const {cardCodePoints} = await load();
    const card = readSpell(
      'spells/Glüh.md',
      '---\ntags:\n  - Pyro☼\n---\nSpark ⌘ here.\n',
      DEFAULT_SPELL,
    ).card;
    const set = cardCodePoints(card as Card, DEFAULT_CREATURE);
    expect(has(set, 'Glüh')).toBe(true);
    expect(has(set, '☼')).toBe(true);
    expect(has(set, '⌘')).toBe(true);
  });
});

describe('US-010 AC-2: characters that are not checked', () => {
  it('spaces, controls, zero-width and direction marks, the word joiner, the byte-order mark and variation selectors are left out', async () => {
    const {cardCodePoints} = await load();
    const text = [
      'a',
      ' ',
      '\t',
      '\u0001',
      '\u007f',
      '\u0085',
      '​',
      '‌',
      '‍',
      '‎',
      '‏',
      '⁠',
      '﻿',
      '️',
      '︀',
      'b',
    ].join('');
    const card = readSkill('skills/Z.md', `${text}\n`, DEFAULT_SKILL).card;
    const set = cardCodePoints(card as Card, DEFAULT_CREATURE);
    for (const c of [
      0x20, 0x09, 0x01, 0x7f, 0x85, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f,
      0x2060, 0xfeff, 0xfe0f, 0xfe00,
    ]) {
      expect(set, `U+${c.toString(16)}`).not.toContain(c);
    }
    expect(set).toContain(0x61);
    expect(set).toContain(0x62);
  });
  it('a no-break space and a dash are checked (they are characters of the text)', async () => {
    const {cardCodePoints} = await load();
    const card = readSkill('skills/Y.md', 'a b — c\n', DEFAULT_SKILL).card;
    const set = cardCodePoints(card as Card, DEFAULT_CREATURE);
    expect(set).toContain(0xa0);
    expect(set).toContain(0x2014);
  });
  it('the icons and the branches are not card text: a private-use code point in a branch or the rawTags does not appear', async () => {
    const {cardCodePoints} = await load();
    const card = {
      ...readSkill(
        'skills/X.md',
        '---\ntags:\n  - Fire\n---\nText\n',
        DEFAULT_SKILL,
      ).card,
      branches: [{tag: 'Fire', colour: '#ffb4a2', icon: 'fire', line: 1}],
    };
    const set = cardCodePoints(card as Card, DEFAULT_CREATURE);
    expect(set.some((c) => c >= 0xe900 && c <= 0xebff)).toBe(false);
  });
});

const CREATURE = [
  '---',
  'vigour: 11',
  'might: 4',
  'attacks:',
  '  - "Kick: 2d6 ⚔"',
  '---',
  '## Behaviour',
  'Flees ☃ at the first sound.',
  '',
  '## Signs',
  'Ringe 漢 im Schilf.',
  '',
].join('\n');
const HEADINGS = {
  ...DEFAULT_CREATURE,
  instinctsHeading: 'Behaviour',
  actionsHeading: 'Actions ♜',
  signsHeading: 'Signs',
};

describe('US-010 terms: the text of a creature card', () => {
  it("the text of the sections and the headings of the sections that are drawn; the statblock's own text stays out", async () => {
    const {cardCodePoints} = await load();
    const card = readCreature('creatures/Fën Hare.md', CREATURE, HEADINGS).card;
    const withStatblock = {...card, statblock: FEN_HARE_ANSWER};
    const set = cardCodePoints(withStatblock as Card, HEADINGS);
    expect(has(set, '☃')).toBe(true); // a section text
    expect(has(set, '漢')).toBe(true);
    expect(has(set, 'Behaviour')).toBe(true); // a drawn heading
    // not drawn: the Actions section is empty, so its heading is not set
    expect(hasNone(set, '♜')).toBe(true);
    // the statblock's text (stats, attacks, skills) is the other plugin's
    expect(hasNone(set, '⚔')).toBe(true);
    // the name is in the statblock's band, not set by the plugin
    expect(hasNone(set, 'ë')).toBe(true);
  });
  it('a card without a statblock shows its name as the title: the name is card text', async () => {
    const {cardCodePoints} = await load();
    const card = readCreature('creatures/Fën Hare.md', CREATURE, HEADINGS).card;
    const set = cardCodePoints({...card, statblock: null} as Card, HEADINGS);
    expect(has(set, 'FënHare')).toBe(true);
    expect(hasNone(set, '⚔')).toBe(true);
  });
  it("a section that has blocks brings its heading (the heading is a setting of the author's)", async () => {
    const {cardCodePoints} = await load();
    const note = `${CREATURE}\n## Actions ♜\nKick.\n`;
    const card = readCreature('creatures/Fen Hare.md', note, HEADINGS).card;
    const set = cardCodePoints({...card, statblock: null} as Card, HEADINGS);
    expect(has(set, '♜')).toBe(true);
  });
});
