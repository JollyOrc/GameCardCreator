// US-003 AC-1 to AC-4: reading a spell note into its card. Expected values
// come from the story's example and rules; the notes are invented (SCAR-035).
// Red until the code ticket.
import {describe, expect, it} from 'vitest';
import type {Block} from '../../src/core/skill/read';
import {DEFAULT_SPELL, type SpellSettings} from '../../src/core/spell/settings';
import {readSpell} from '../../src/core/spell/read';
import {EXAMPLE_SPELL_NOTE, FENCE} from '../support/spell-fixtures';

const PATH = 'spells/Reed Whisper.md';
const read = (text: string, over: Partial<SpellSettings> = {}, path = PATH) =>
  readSpell(path, text, {...DEFAULT_SPELL, ...over});
const body = (text: string) => read(`---\ntags: []\n---\n${text}\n`);
const para = (b: Block | undefined) => {
  if (b?.kind !== 'paragraph')
    throw new Error(`not a paragraph: ${JSON.stringify(b)}`);
  return b.runs;
};
const plain = (b: Block | undefined) =>
  para(b)
    .map((r) => r.text)
    .join('');

describe('US-003 AC-1: reading the example note', () => {
  const {card, warnings} = read(EXAMPLE_SPELL_NOTE);
  it('is a spell card with title and tags and no details', () => {
    expect(card.kind).toBe('spell');
    expect(card.path).toBe(PATH);
    expect(card.name).toBe('Reed Whisper');
    expect(card.tags).toEqual(['Wizardry', 'Elemental Magic']);
    expect(card.details).toEqual([]);
  });
  it('two paragraphs, the first with thin breeze bold', () => {
    expect(card.blocks).toHaveLength(2);
    expect(para(card.blocks[0])).toEqual([
      {text: 'A '},
      {text: 'thin breeze', bold: true},
      {text: ' carries your voice to one listener within sight.'},
    ]);
    expect(plain(card.blocks[1])).toBe(
      'The target hears you as a whisper, however far away. They can answer only if they know this spell.',
    );
  });
  it('no warnings', () => {
    expect(warnings).toEqual([]);
  });
});

describe('US-003 AC-1: notes of other shapes', () => {
  it('a note without front matter: title and one paragraph, no warning', () => {
    const r = read('Just words.\n', {}, 'spells/Plain.md');
    expect(r.card.name).toBe('Plain');
    expect(r.card.tags).toEqual([]);
    expect(r.card.blocks).toHaveLength(1);
    expect(plain(r.card.blocks[0])).toBe('Just words.');
    expect(r.warnings).toEqual([]);
  });
  it('front matter without tags: no tag line', () => {
    const r = read('---\nother: x\n---\nText.\n');
    expect(r.card.tags).toEqual([]);
  });
  it('the header is read once: a --- line in the text is a rule', () => {
    const r = body('One.\n\n---\n\nTwo.');
    expect(r.card.blocks.map((b) => b.kind)).toEqual([
      'paragraph',
      'rule',
      'paragraph',
    ]);
  });
});

describe('US-003 AC-2: no details row', () => {
  it('a timing property changes nothing: the card equals the example card', () => {
    const plainCard = read(EXAMPLE_SPELL_NOTE).card;
    const withTiming = read(
      EXAMPLE_SPELL_NOTE.replace(
        '---\nA **thin',
        'timing: action\nkind: attack\nrequires: x\n---\nA **thin',
      ),
    );
    expect(withTiming.card).toEqual(plainCard);
    expect(withTiming.warnings).toEqual([]);
    expect(withTiming.card.details).toEqual([]);
  });
  it('a list-valued property that a skill would warn about is ignored', () => {
    const r = read('---\ntags: []\nkind:\n  - a\n---\nText.\n');
    expect(r.warnings).toEqual([]);
  });
  it('a tags value of one string is one tag', () => {
    expect(read('---\ntags: solo\n---\nx\n').card.tags).toEqual(['Solo']);
  });
  it('the tags property can be renamed', () => {
    const r = read('---\nlabels:\n  - Wizardry\ntags:\n  - x\n---\nT\n', {
      tagsProperty: 'labels',
    });
    expect(r.card.tags).toEqual(['Wizardry']);
  });
});

describe('US-003 AC-3: text forms, with spell codes', () => {
  it('links show their text, wikilinks their alias or name', () => {
    const {card} = body(
      'See [Stone Skin](Stone%20Skin.md), [[Stone Skin|the skin spell]] and [[Stone Skin]].',
    );
    expect(plain(card.blocks[0])).toBe(
      'See Stone Skin, the skin spell and Stone Skin.',
    );
  });
  it('a bullet list and a numbered list', () => {
    const {card} = body('- One\n- Two\n\n1. First\n2. Second');
    const [a, b] = card.blocks;
    expect(a?.kind === 'list' && !a.ordered && a.items.length).toBe(2);
    expect(b?.kind === 'list' && b.ordered && b.items.length).toBe(2);
  });
  it('an image is left out with SPELL_IMAGE_OMITTED and its target', () => {
    const r = body('Text.\n\n![](pics/breeze.png)');
    expect(r.card.blocks).toHaveLength(1);
    expect(r.warnings).toEqual([
      {code: 'SPELL_IMAGE_OMITTED', path: PATH, detail: 'pics/breeze.png'},
    ]);
  });
  it('a table, html and a code block give SPELL_BLOCK_UNSUPPORTED', () => {
    expect(body('| a | b |\n|---|---|\n| 1 | 2 |').warnings).toEqual([
      {code: 'SPELL_BLOCK_UNSUPPORTED', path: PATH, detail: 'table'},
    ]);
    expect(body('<div>Inside</div>').warnings).toEqual([
      {code: 'SPELL_BLOCK_UNSUPPORTED', path: PATH, detail: 'html'},
    ]);
    expect(body([FENCE + 'js', 'x();', FENCE].join('\n')).warnings).toEqual([
      {code: 'SPELL_BLOCK_UNSUPPORTED', path: PATH, detail: 'code'},
    ]);
  });
  it('a view block (dataview) is dropped without a warning', () => {
    const r = body(
      [FENCE + 'dataviewjs', 'x()', FENCE, '', 'Text.'].join('\n'),
    );
    expect(r.warnings).toEqual([]);
    expect(r.card.blocks).toHaveLength(1);
  });
});

describe('US-003 AC-4: the warnings of a spell', () => {
  it('invalid front matter: SPELL_PROPERTIES_INVALID, the text is still read', () => {
    const r = read('---\ntags: [unclosed\n---\nText.\n');
    expect(r.warnings).toEqual([
      {code: 'SPELL_PROPERTIES_INVALID', path: PATH, detail: 'yaml'},
    ]);
    expect(r.card.blocks).toHaveLength(1);
  });
  it('nothing but a title: SPELL_EMPTY', () => {
    const r = read('---\ntags: []\n---\n', {}, 'spells/Bare.md');
    expect(r.warnings).toEqual([
      {code: 'SPELL_EMPTY', path: 'spells/Bare.md', detail: ''},
    ]);
  });
  it('warnings come in note order and none is a SKILL_ code', () => {
    const r = read(
      '---\ntags: [unclosed\n---\n![](a.png)\n\n| x |\n|---|\n| y |\n',
    );
    expect(r.warnings.map((w) => w.code)).toEqual([
      'SPELL_PROPERTIES_INVALID',
      'SPELL_IMAGE_OMITTED',
      'SPELL_BLOCK_UNSUPPORTED',
    ]);
    for (const w of r.warnings) expect(w.code).not.toMatch(/^SKILL_/);
  });
});
