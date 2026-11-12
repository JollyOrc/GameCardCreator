// US-004 AC-1, AC-2, AC-6 (section text): reading a creature note into its
// card. Expected values come from the story's example and rules; the notes are
// invented (SCAR-035). Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {cardCode} from '../../src/core/card/warning';
import {readCreature} from '../../src/core/creature/read';
import {
  DEFAULT_CREATURE,
  type CreatureSettings,
} from '../../src/core/creature/settings';
import type {Block} from '../../src/core/skill/read';
import {EXAMPLE_CREATURE_NOTE, FENCE} from '../support/creature-fixtures';

const PATH = 'creatures/Fen Hare.md';
const read = (
  text: string,
  over: Partial<CreatureSettings> = {},
  path = PATH,
) => readCreature(path, text, {...DEFAULT_CREATURE, ...over});
const plain = (b: Block | undefined) => {
  if (b?.kind !== 'paragraph')
    throw new Error(`not a paragraph: ${JSON.stringify(b)}`);
  return b.runs.map((r) => r.text).join('');
};
const items = (b: Block | undefined) => {
  if (b?.kind !== 'list') throw new Error(`not a list: ${JSON.stringify(b)}`);
  return b.items.map((item) => plain(item[0]));
};

describe('US-004 AC-1: the code of the creature kind', () => {
  it('cardCode(creature, X) is CREATURE_X', () => {
    expect(cardCode('creature', 'IMAGE_OMITTED')).toBe(
      'CREATURE_IMAGE_OMITTED',
    );
    expect(cardCode('creature', 'SECTION_MISSING')).toBe(
      'CREATURE_SECTION_MISSING',
    );
  });
});

describe('US-004 AC-1: reading the example note', () => {
  const {card, warnings} = read(EXAMPLE_CREATURE_NOTE);
  it('is a creature card with the title from the file name and no statblock yet', () => {
    expect(card.kind).toBe('creature');
    expect(card.path).toBe(PATH);
    expect(card.name).toBe('Fen Hare');
    expect(card.statblock).toBeNull();
  });
  it('the properties as plain values, as the statblock reads them', () => {
    expect(card.properties).toEqual({
      vigour: 11,
      might: 4,
      wits: 2,
      speed: 5,
      attacks: ['Kick: 2d6', '**Bite**: 1d6'],
      skills: ['Quick Step'],
      tags: ['beast'],
    });
  });
  it('Instincts: a bullet list of two items', () => {
    expect(card.instincts).toHaveLength(1);
    expect(items(card.instincts[0])).toEqual([
      'flee at the first sound',
      'never fight unless cornered',
    ]);
  });
  it('Actions: a bullet list of two items', () => {
    expect(card.actions).toHaveLength(1);
    expect(items(card.actions[0])).toEqual([
      'sprint: 12 squares over two Actions',
      'kick, 2d6',
    ]);
  });
  it('Signs: one paragraph; nothing from the lead paragraph', () => {
    expect(card.signs).toHaveLength(1);
    expect(plain(card.signs[0])).toBe('Flattened reeds in a ring.');
    const all = JSON.stringify([card.instincts, card.actions, card.signs]);
    expect(all).not.toContain('quick and shy');
  });
  it('no warnings', () => {
    expect(warnings).toEqual([]);
  });
});

describe('US-004 AC-1: the text rules of US-002 with the creature codes', () => {
  const section = (text: string) =>
    read(`---\nvigour: 1\n---\n### Actions\n${text}\n`);
  it('a link shows its text; an image is left out with CREATURE_IMAGE_OMITTED', () => {
    const r = section('See [[Reed Whisper|the spell]].\n\n![](pics/reed.png)');
    expect(r.card.actions).toHaveLength(1);
    expect(plain(r.card.actions[0])).toBe('See the spell.');
    expect(r.warnings.map((w) => w.code)).toEqual(['CREATURE_IMAGE_OMITTED']);
    expect(r.warnings[0]!.path).toBe(PATH);
  });
  it('a code block is left out with CREATURE_BLOCK_UNSUPPORTED (code)', () => {
    const r = section(`${FENCE}js\nlet x = 1;\n${FENCE}\n\nText.`);
    expect(plain(r.card.actions[0])).toBe('Text.');
    expect(r.card.actions).toHaveLength(1);
    expect(r.warnings).toEqual([
      {code: 'CREATURE_BLOCK_UNSUPPORTED', path: PATH, detail: 'code'},
    ]);
  });
});

describe('US-004 AC-2: finding sections', () => {
  const note = (body: string) => `---\nvigour: 3\n---\nLead.\n\n${body}\n`;
  it('the heading is found without case: ### behaviour finds Behaviour', () => {
    const r = read(note('### behaviour\nRun.\n\n### Actions\nBite.'));
    expect(plain(r.card.instincts[0])).toBe('Run.');
    expect(r.warnings).toEqual([]);
  });
  it('at any level: ## and ###', () => {
    const r = read(note('## Behaviour\nRun.\n\n## ACTIONS\nBite.'));
    expect(plain(r.card.instincts[0])).toBe('Run.');
    expect(plain(r.card.actions[0])).toBe('Bite.');
  });
  it('a section ends at the next heading of the same or a higher level, not a lower one', () => {
    const r = read(
      note(
        '### Actions\nBite.\n\n#### Detail\nDeep.\n\n### Behaviour\nRun.\n\n## Other\nNo.',
      ),
    );
    expect(
      r.card.actions.map((b) => (b.kind === 'paragraph' ? plain(b) : '?')),
    ).toEqual(['Bite.', 'Deep.']);
    expect(
      r.card.instincts.map((b) => (b.kind === 'paragraph' ? plain(b) : '?')),
    ).toEqual(['Run.']);
    expect(JSON.stringify(r.card)).not.toContain('No.');
  });
  it('a missing Actions section: no block and one CREATURE_SECTION_MISSING with the heading as set', () => {
    const r = read(note('### Behaviour\nRun.'));
    expect(r.card.actions).toEqual([]);
    expect(r.warnings).toEqual([
      {code: 'CREATURE_SECTION_MISSING', path: PATH, detail: 'Actions'},
    ]);
  });
  it('a missing Instincts section: one warning with its heading', () => {
    const r = read(note('### Actions\nBite.'));
    expect(r.card.instincts).toEqual([]);
    expect(r.warnings).toEqual([
      {code: 'CREATURE_SECTION_MISSING', path: PATH, detail: 'Behaviour'},
    ]);
  });
  it('a missing Signs section: no block and no warning (the part is optional)', () => {
    const r = read(note('### Behaviour\nRun.\n\n### Actions\nBite.'));
    expect(r.card.signs).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('a section with a heading and no text: no block, no warning', () => {
    const r = read(note('### Behaviour\n\n### Actions\nBite.\n\n### Signs\n'));
    expect(r.card.instincts).toEqual([]);
    expect(r.card.signs).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('the example without its Actions section gives one warning; without Signs none', () => {
    const noActions = EXAMPLE_CREATURE_NOTE.replace(/### Actions[\s\S]*$/, '');
    const noSigns = EXAMPLE_CREATURE_NOTE.replace(/### Signs\n.*\n\n/, '');
    expect(noActions).not.toBe(EXAMPLE_CREATURE_NOTE);
    expect(noSigns).not.toBe(EXAMPLE_CREATURE_NOTE);
    expect(read(noActions).warnings).toHaveLength(1);
    expect(read(noSigns).warnings).toEqual([]);
    expect(read(noSigns).card.signs).toEqual([]);
  });
  it('the headings are settings (SCAR-019): other words find other sections', () => {
    const r = read(
      note('### Instinct\nRun.\n\n### Moves\nBite.\n\n### Tracks\nRings.'),
      {
        instinctsHeading: 'Instinct',
        actionsHeading: 'Moves',
        signsHeading: 'Tracks',
      },
    );
    expect(plain(r.card.instincts[0])).toBe('Run.');
    expect(plain(r.card.actions[0])).toBe('Bite.');
    expect(plain(r.card.signs[0])).toBe('Rings.');
    expect(r.warnings).toEqual([]);
    // the defaults no longer find anything: both required sections are missing
    const d = read(note('### Instinct\nRun.\n\n### Moves\nBite.'));
    expect(d.warnings.map((w) => w.detail)).toEqual(['Behaviour', 'Actions']);
  });
});

describe('US-004 AC-1: notes of other shapes', () => {
  it('a note without front matter: no properties, the sections still read', () => {
    const r = read('### Actions\nBite.\n', {}, 'creatures/Plain.md');
    expect(r.card.name).toBe('Plain');
    expect(r.card.properties).toEqual({});
    expect(plain(r.card.actions[0])).toBe('Bite.');
  });
  it('a heading inside a code fence is not a section', () => {
    const r = read(
      `---\nvigour: 1\n---\n${FENCE}\n### Actions\nFake.\n${FENCE}\n`,
    );
    expect(r.card.actions).toEqual([]);
  });
});
