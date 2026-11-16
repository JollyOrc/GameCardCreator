// Invented fixtures for US-011 (SCAR-035): the example notes of the story as cards, as
// the reader makes them (tag labels, details row), so that the sheet tests need no
// reader. The text of each card is invented filler of a given length (`words14`).
// Nothing here is a real title, tag or note.
import type {Block, SkillCard} from '../../src/core/skill/read';
import type {TitleSettings} from '../../src/core/card/titles';
import {words14} from './creature-fixtures';

const para = (text: string): Block => ({kind: 'paragraph', runs: [{text}]});

/** The text of a card: `n` invented words in sentences of 14. */
export const body = (n: number): Block[] => words14(n).map(para);

/** The scheme row of the story's example (US-009): `Swordplay`, `sword`. */
export const SWORD_ROW = {
  tag: 'Swordplay',
  colour: '#f4d6b0',
  icon: 'sword',
  line: 8,
} as const;

/** A skill card of the story's table; `banded` gives it the `Swordplay` branch. */
function skill(
  name: string,
  tags: string[],
  details: {label: string; value: string}[],
  words: number,
): (banded?: boolean) => SkillCard {
  return (banded = false) => ({
    kind: 'skill',
    path: `skills/${name}.md`,
    name,
    tags: tags.map((t) => t.replace(/([a-z])([A-Z])/g, '$1 $2')),
    rawTags: tags,
    details,
    blocks: body(words),
    ...(banded && tags.includes('Swordplay')
      ? {branches: [{...SWORD_ROW}]}
      : {}),
  });
}

const reaction = [{label: 'Time', value: 'reaction'}];
const action = [{label: 'Time', value: 'action'}];

/** `Parry.md`: two tags, a details row, 40 words. */
export const parry = skill('Parry', ['CombatSkill', 'Swordplay'], reaction, 40);
/** `Riverbank Ambush of the Reed Wardens.md`: its title fits on one line up to 8.27 pt (54 mm). */
export const riverbank = skill(
  'Riverbank Ambush of the Reed Wardens',
  ['Swordplay'],
  action,
  40,
);
/** `Feint.md`: eight tags, its tags line wraps. */
export const feint = skill(
  'Feint',
  [
    'CombatSkill',
    'Swordplay',
    'Footwork',
    'Misdirection',
    'Trickery',
    'Quickness',
    'Deception',
    'Bluffing',
  ],
  reaction,
  40,
);
/** `The Long Riverbank Ambush of the Hidden Reed Wardens.md`: one line only up to 5.75 pt. */
export const longRiverbank = skill(
  'The Long Riverbank Ambush of the Hidden Reed Wardens',
  ['Swordplay'],
  action,
  40,
);
/** `Long Lesson.md`: 200 words (6 pt today, US-002 AC-5). */
export const longLesson = skill('Long Lesson', ['Swordplay'], action, 200);
/** `Plain.md`: the tag `Misc` (no row in the scheme), no details row. */
export const plain = skill('Plain', ['Misc'], [], 40);

/** A spell card (no details row); `banded` with the `Swordplay` row for simplicity is not used. */
export const spell = (name: string, words = 40): SkillCard => ({
  kind: 'spell',
  path: `spells/${name}.md`,
  name,
  tags: ['Pyromancy'],
  rawTags: ['Pyromancy'],
  details: [],
  blocks: body(words),
});

/** The defaults of the story (D5) with the switch on. */
export const ON: TitleSettings = {
  equalTitles: true,
  titleSize: 9.1,
  minTitleSize: 7,
};
/** The defaults with the switch off. */
export const OFF: TitleSettings = {...ON, equalTitles: false};

/** The fact of a kind in equal mode, as the compile writes it (AC-8). */
export interface TitlesFact {
  titles: 'skill' | 'spell';
  size: number;
  height: number;
  wrapped: number[];
  widest: number;
}

/** The title facts among the facts of a compile. */
export const titleFacts = (facts: readonly unknown[]): TitlesFact[] =>
  facts.filter(
    (f): f is TitlesFact =>
      typeof f === 'object' && f !== null && 'titles' in f,
  );
