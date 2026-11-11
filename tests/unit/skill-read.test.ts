// US-002 AC-1 to AC-4, AC-8, AC-9, AC-10: reading a skill note into a card.
// Every expected value is taken from the story's example and rules. The
// notes are invented (SCAR-035). Red until ticket #3 (docs/technical/tests.md).
import {describe, expect, it} from 'vitest';
import {DEFAULT_SKILL, type SkillSettings} from '../../src/core/skill/settings';
import {readSkill, tagLabel, type Block} from '../../src/core/skill/read';
import {EXAMPLE_NOTE as EXAMPLE, FENCE} from '../support/skill-fixtures';

const s = (over: Partial<SkillSettings> = {}): SkillSettings => ({
  ...DEFAULT_SKILL,
  ...over,
});
const PATH = 'skills/Reed Sweep.md';

const read = (body: string, over: Partial<SkillSettings> = {}, path = PATH) =>
  readSkill(path, body, s(over));
/** A note whose front matter is empty and whose body is `body`. */
const body = (text: string, over: Partial<SkillSettings> = {}) =>
  read(`---\ntags: []\n---\n${text}\n`, over);
const para = (b: Block | undefined) => {
  if (b?.kind !== 'paragraph')
    throw new Error(`not a paragraph: ${JSON.stringify(b)}`);
  return b.runs;
};
const plain = (b: Block | undefined) =>
  para(b)
    .map((r) => r.text)
    .join('');

describe('US-002 AC-1: reading the example note', () => {
  const {card, warnings} = read(EXAMPLE);
  it('title, tags, details', () => {
    expect(card.path).toBe(PATH);
    expect(card.name).toBe('Reed Sweep');
    expect(card.tags).toEqual(['Field Craft', 'Melee']);
    expect(card.details).toEqual([
      {label: 'Time', value: 'action'},
      {label: 'Type', value: 'attack'},
      {label: 'Requires', value: 'Basket Knots'},
    ]);
  });
  it('description: a paragraph with bold and italic, a list of two items', () => {
    expect(card.blocks).toHaveLength(2);
    expect(para(card.blocks[0])).toEqual([
      {text: 'You sweep a '},
      {text: 'reed staff', bold: true},
      {text: ' low. Spend a success to knock an adjacent enemy '},
      {text: 'prone', italic: true},
      {text: '.'},
    ]);
    const list = card.blocks[1]!;
    expect(list.kind).toBe('list');
    if (list.kind !== 'list') return;
    expect(list.ordered).toBe(false);
    expect(list.items).toHaveLength(2);
    expect(plain(list.items[0]![0])).toBe('Works only with a staff.');
    expect(plain(list.items[1]![0])).toBe('Costs one stamina.');
  });
  it('exactly one warning: the image, with its target', () => {
    expect(warnings).toEqual([
      {code: 'SKILL_IMAGE_OMITTED', path: PATH, detail: 'pics/reed.png'},
    ]);
  });
});

describe('US-002 AC-1: the header is removed once, before every rule (SCAR-034)', () => {
  it('a --- line in the middle is a rule, not a second header', () => {
    const {card} = body('First.\n\n---\n\nSecond.');
    expect(card.blocks.map((b) => b.kind)).toEqual([
      'paragraph',
      'rule',
      'paragraph',
    ]);
  });
  it('a front matter without its closing line is content', () => {
    const {card} = read('---\ntags:\n  - A\nNo end here.\n');
    expect(card.tags).toEqual([]);
    expect(card.blocks.length).toBeGreaterThan(0);
    const text = JSON.stringify(card.blocks);
    expect(text).toContain('No end here.');
  });
  it('a byte-order mark before the header does not hide it', () => {
    const {card} = read('﻿---\ntags:\n  - FieldCraft\n---\nText.\n');
    expect(card.tags).toEqual(['Field Craft']);
    expect(plain(card.blocks[0])).toBe('Text.');
  });
  it('CRLF line ends are read like LF', () => {
    const {card} = read(
      '---\r\ntags:\r\n  - Melee\r\n---\r\nOne.\r\n\r\nTwo.\r\n',
    );
    expect(card.tags).toEqual(['Melee']);
    expect(card.blocks).toHaveLength(2);
  });
  it('a view block with a header that looks like a heading is dropped silently', () => {
    const {card, warnings} = read(
      [
        '---',
        'tags: []',
        '---',
        FENCE + 'dataview',
        '# not a heading',
        FENCE,
        'Text.',
      ].join('\n'),
    );
    expect(card.blocks).toHaveLength(1);
    expect(warnings).toEqual([]);
  });
  it('a dataviewjs block in the middle is dropped as well', () => {
    const {card} = body(
      ['One.', '', FENCE + 'dataviewjs', 'x()', FENCE, '', 'Two.'].join('\n'),
    );
    expect(card.blocks).toHaveLength(2);
  });
});

describe('US-002 AC-2: tag labels', () => {
  it.each([
    ['FieldCraft', 'Field Craft'],
    ['melee', 'Melee'],
    ['Two-Hand', 'Two-Hand'],
    ['#Ward2Off', 'Ward2 Off'],
    ['Ward2Off', 'Ward2 Off'],
    ['a/b', 'a/b'],
    ['#a/b', 'a/b'],
  ])('%s shows %s', (tag, shown) => {
    expect(tagLabel(tag)).toBe(shown);
  });
  it('no tags: none', () => {
    expect(read('---\ntimings: x\n---\nText.\n').card.tags).toEqual([]);
  });
  it('five tags are five labels', () => {
    const {card} = read(
      '---\ntags:\n  - A1\n  - BeeCee\n  - c\n  - D\n  - eF\n---\nx\n',
    );
    expect(card.tags).toEqual(['A1', 'Bee Cee', 'C', 'D', 'E F']);
  });
  it('a string value is one tag', () => {
    expect(read('---\ntags: solo\n---\nx\n').card.tags).toEqual(['Solo']);
  });
});

describe('US-002 AC-3: the details row', () => {
  const details = (front: string, over: Partial<SkillSettings> = {}) =>
    read(`---\n${front}\n---\nText.\n`, over);
  it('absent and empty properties are left out; order is timing, kind, requires', () => {
    const {card} = details('requires: Cord Work\nkind: tested\ntiming: ""');
    expect(card.details).toEqual([
      {label: 'Type', value: 'tested'},
      {label: 'Requires', value: 'Cord Work'},
    ]);
  });
  it('all absent: no row', () => {
    expect(details('tags: []').card.details).toEqual([]);
  });
  it('a link shows its page name, an alias shows the alias', () => {
    expect(details('requires: "[[Basket Knots]]"').card.details[0]!.value).toBe(
      'Basket Knots',
    );
    expect(
      details('requires: "[[Basket Knots|knots]]"').card.details[0]!.value,
    ).toBe('knots');
  });
  it('a number and a boolean are shown as written', () => {
    const {card} = details('timing: 2\nkind: true');
    expect(card.details).toEqual([
      {label: 'Time', value: '2'},
      {label: 'Type', value: 'true'},
    ]);
  });
  it('values are never interpreted: none stays none', () => {
    expect(details('timing: none').card.details).toEqual([
      {label: 'Time', value: 'none'},
    ]);
  });
  it('a list or a map is left out with SKILL_VALUE_NOT_TEXT naming the property', () => {
    const r = details('kind:\n  - a\n  - b\ntiming:\n  x: 1\nrequires: Ok');
    expect(r.card.details).toEqual([{label: 'Requires', value: 'Ok'}]);
    expect(r.warnings).toEqual([
      {code: 'SKILL_VALUE_NOT_TEXT', path: PATH, detail: 'kind'},
      {code: 'SKILL_VALUE_NOT_TEXT', path: PATH, detail: 'timing'},
    ]);
  });
});

describe('US-002 AC-10: settings reach the reader (SCAR-019, SCAR-037)', () => {
  const NOTE = '---\ntiming: action\npace: slow\ntags: []\n---\nText.\n';
  it('the default reads timing, not pace', () => {
    expect(read(NOTE).card.details).toEqual([{label: 'Time', value: 'action'}]);
  });
  it('timing property pace, label Speed: the note with pace shows Speed: slow', () => {
    const r = read(NOTE, {timingProperty: 'pace', timingLabel: 'Speed'});
    expect(r.card.details).toEqual([{label: 'Speed', value: 'slow'}]);
  });
  it('the example note, which has timing and not pace, then shows no timing', () => {
    const r = read(EXAMPLE, {timingProperty: 'pace', timingLabel: 'Speed'});
    expect(r.card.details.map((d) => d.label)).toEqual(['Type', 'Requires']);
  });
  it('a property name is matched without case', () => {
    const r = read(NOTE, {timingProperty: 'PACE', timingLabel: 'Speed'});
    expect(r.card.details).toEqual([{label: 'Speed', value: 'slow'}]);
  });
  it('the tags property can be renamed', () => {
    const r = read('---\nlabels:\n  - FieldCraft\ntags:\n  - x\n---\nT\n', {
      tagsProperty: 'labels',
    });
    expect(r.card.tags).toEqual(['Field Craft']);
  });
});

describe('US-002 AC-4: the description text', () => {
  it('links show their text; wikilinks their alias or their name', () => {
    const {card} = body(
      'See [one stamina](Stamina.md), [[Stamina|stamina]] and [[Stamina]].',
    );
    expect(plain(card.blocks[0])).toBe('See one stamina, stamina and Stamina.');
  });
  it('a heading becomes a bold paragraph without its #s', () => {
    const {card} = body('### Warm up\n\nThen go.');
    expect(para(card.blocks[0])).toEqual([{text: 'Warm up', bold: true}]);
    expect(plain(card.blocks[1])).toBe('Then go.');
  });
  it('a callout becomes a paragraph that starts with its bold title', () => {
    const {card} = body('> [!note] Careful\n> Mind the reed.');
    expect(card.blocks).toHaveLength(1);
    const runs = para(card.blocks[0]);
    expect(runs[0]).toEqual({text: 'Careful', bold: true});
    expect(runs.map((r) => r.text).join('')).toBe('Careful Mind the reed.');
  });
  it('a numbered list is ordered', () => {
    const {card} = body('1. One\n2. Two');
    const list = card.blocks[0]!;
    expect(list.kind === 'list' && list.ordered).toBe(true);
    expect(list.kind === 'list' && list.items.length).toBe(2);
  });
  it('a list inside a list item is nested', () => {
    const {card} = body('- Outer\n  - Inner one\n  - Inner two\n- Next');
    const list = card.blocks[0]!;
    if (list.kind !== 'list') throw new Error('no list');
    expect(list.items).toHaveLength(2);
    expect(plain(list.items[0]![0])).toBe('Outer');
    const inner = list.items[0]![1]!;
    expect(inner.kind).toBe('list');
    expect(inner.kind === 'list' && inner.items.length).toBe(2);
  });
  it('a rule is a rule', () => {
    expect(body('***').card.blocks.map((b) => b.kind)).toEqual(['rule']);
  });
  it('an embed ![[x.png]] is omitted with its target', () => {
    const r = body('Text.\n\n![[pics/x.png]]');
    expect(r.card.blocks).toHaveLength(1);
    expect(r.warnings).toEqual([
      {code: 'SKILL_IMAGE_OMITTED', path: PATH, detail: 'pics/x.png'},
    ]);
  });
  it('an image inside a paragraph is omitted, the text around it stays', () => {
    const r = body('Before ![alt](pics/y.png) after.');
    expect(plain(r.card.blocks[0]).replace(/\s+/g, ' ')).toBe('Before after.');
    expect(r.warnings.map((w) => w.detail)).toEqual(['pics/y.png']);
  });
  it('a table is shown as plain text lines with SKILL_BLOCK_UNSUPPORTED table', () => {
    const r = body('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(r.warnings).toEqual([
      {code: 'SKILL_BLOCK_UNSUPPORTED', path: PATH, detail: 'table'},
    ]);
    const text = JSON.stringify(r.card.blocks);
    expect(text).toContain('a');
    expect(text).toContain('2');
  });
  it('html is shown as its text with SKILL_BLOCK_UNSUPPORTED html', () => {
    const r = body('<div>Inside</div>');
    expect(r.warnings).toEqual([
      {code: 'SKILL_BLOCK_UNSUPPORTED', path: PATH, detail: 'html'},
    ]);
    expect(JSON.stringify(r.card.blocks)).toContain('Inside');
  });
  it('another code block is its lines as text with SKILL_BLOCK_UNSUPPORTED code', () => {
    const r = body([FENCE + 'js', 'let x = 1;', FENCE].join('\n'));
    expect(r.warnings).toEqual([
      {code: 'SKILL_BLOCK_UNSUPPORTED', path: PATH, detail: 'code'},
    ]);
    expect(JSON.stringify(r.card.blocks)).toContain('let x = 1;');
  });
  it('plain paragraphs: a blank line splits, a line break joins with a space', () => {
    const {card} = body('One\ntwo.\n\nThree.');
    expect(card.blocks.map(plain)).toEqual(['One two.', 'Three.']);
  });
  it('adjacent text of equal formatting is one run', () => {
    const {card} = body('a **b** c');
    expect(para(card.blocks[0])).toEqual([
      {text: 'a '},
      {text: 'b', bold: true},
      {text: ' c'},
    ]);
  });
});

describe('US-002 AC-8, AC-9: warnings, empty parts', () => {
  it('warnings come in note order, each with the path', () => {
    const r = body('![](a.png)\n\n| x |\n|---|\n| y |\n\n![[b.png]]');
    expect(r.warnings.map((w) => [w.code, w.detail])).toEqual([
      ['SKILL_IMAGE_OMITTED', 'a.png'],
      ['SKILL_BLOCK_UNSUPPORTED', 'table'],
      ['SKILL_IMAGE_OMITTED', 'b.png'],
    ]);
    for (const w of r.warnings) expect(w.path).toBe(PATH);
  });
  it('no description: tags, title and row only', () => {
    const {card, warnings} = read(
      '---\ntags:\n  - Melee\ntiming: action\n---\n',
    );
    expect(card.blocks).toEqual([]);
    expect(card.tags).toEqual(['Melee']);
    expect(card.details).toHaveLength(1);
    expect(warnings).toEqual([]);
  });
  it('no properties: title and description', () => {
    const {card, warnings} = read('Just text.\n');
    expect(card.tags).toEqual([]);
    expect(card.details).toEqual([]);
    expect(plain(card.blocks[0])).toBe('Just text.');
    expect(warnings).toEqual([]);
  });
  it('nothing but a title: SKILL_EMPTY', () => {
    const r = read('---\ntags: []\n---\n', {}, 'skills/Bare.md');
    expect(r.card.name).toBe('Bare');
    expect(r.card.blocks).toEqual([]);
    expect(r.warnings).toEqual([
      {code: 'SKILL_EMPTY', path: 'skills/Bare.md', detail: ''},
    ]);
  });
  it('an empty file is nothing but a title as well', () => {
    expect(read('', {}, 'a/B.md').warnings.map((w) => w.code)).toEqual([
      'SKILL_EMPTY',
    ]);
  });
  it('the title is the file name without .md, for a name with dots and spaces', () => {
    expect(read('x', {}, 'a/b/Two.Hand Fighting.md').card.name).toBe(
      'Two.Hand Fighting',
    );
  });
});
