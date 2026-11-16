// Test support: one process that writes the PDF of a deck with branches, icons, a
// gradient, a bleed and the credit lines, for US-009 AC-13. usage: <out>
import {writeFileSync} from 'node:fs';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {readCreature} from '../../src/core/creature/read';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {FIT_LABEL} from '../../src/core/skill/fit';
import type {SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SIZES} from '../../src/core/skill/settings';
import {EXAMPLE_CREATURE_NOTE, FEN_HARE_WITH_CREDIT} from './creature-fixtures';
import {compileWithFacts} from './typst-node';

const out = process.argv[2] ?? '';
const b = (tag: string, colour: string, icon: string) => ({
  tag,
  colour,
  icon,
  line: 1,
});
const card = (
  kind: 'skill' | 'spell',
  name: string,
  branches: ReturnType<typeof b>[],
) =>
  ({
    kind,
    path: `${kind}s/${name}.md`,
    name,
    tags: ['Tag'],
    rawTags: ['Tag'],
    details: [],
    blocks: [{kind: 'paragraph', runs: [{text: 'Some text.'}]}],
    branches,
  }) as SkillCard;
const creature = {
  ...readCreature(
    'creatures/Fen Hare.md',
    EXAMPLE_CREATURE_NOTE,
    DEFAULT_CREATURE,
  ).card,
  statblock: FEN_HARE_WITH_CREDIT,
};
const cards = [
  card('skill', 'Parry', [b('Swordplay', '#f4d6b0', 'sword')]),
  card('spell', 'Scorch Hex', [
    b('Pyromancy', '#ffb4a2', 'fire'),
    b('Hexes', '#e4f0a8', 'skull'),
  ]),
  creature,
  card('spell', 'Triple', [
    b('Pyromancy', '#ffb4a2', 'fire'),
    b('Hexes', '#e4f0a8', 'skull'),
    b('Stonework', '#cbd5e8', 'anvil'),
  ]),
];
const typst = cardSheetTypst(
  cards,
  {...DEFAULT_SHEET, bleed: 1},
  DEFAULT_SIZES,
  DEFAULT_CREATURE,
  {
    iconCredit:
      'Icons made by Lorc, Delapouite, sbed and other authors. Available on https://game-icons.net (CC BY 3.0), via RPG Awesome',
  },
);
if (!typst.ok) throw new Error(typst.message);
const {pdf} = await compileWithFacts(typst.source, FIT_LABEL, typst.files);
writeFileSync(out, pdf);
