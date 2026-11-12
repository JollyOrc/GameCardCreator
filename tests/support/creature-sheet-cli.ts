// Test support: one process that writes the PDF of a mixed deck with creature
// cards (the real fixture answers), for US-004 AC-8. usage: <out>
import {writeFileSync} from 'node:fs';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {readCreature} from '../../src/core/creature/read';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {readSkill} from '../../src/core/skill/read';
import {DEFAULT_SIZES, DEFAULT_SKILL} from '../../src/core/skill/settings';
import {EXAMPLE_CREATURE_NOTE, FEN_HARE_WITH_CREDIT} from './creature-fixtures';
import {EXAMPLE_NOTE} from './skill-fixtures';
import {compileWithFacts} from './typst-node';
import {FIT_LABEL} from '../../src/core/skill/fit';

const out = process.argv[2] ?? '';
const creature = {
  ...readCreature(
    'creatures/Fen Hare.md',
    EXAMPLE_CREATURE_NOTE,
    DEFAULT_CREATURE,
  ).card,
  statblock: FEN_HARE_WITH_CREDIT,
};
const cards = [
  creature,
  readSkill('skills/Reed Sweep.md', EXAMPLE_NOTE, DEFAULT_SKILL).card,
  creature,
];
const typst = cardSheetTypst(cards, DEFAULT_SHEET, DEFAULT_SIZES);
if (!typst.ok) throw new Error(typst.message);
const {pdf} = await compileWithFacts(typst.source, FIT_LABEL, typst.files);
writeFileSync(out, pdf);
