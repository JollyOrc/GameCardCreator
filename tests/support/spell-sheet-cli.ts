// Test support: one process that writes the PDF of a mixed deck (the example
// spell, the example skill and invented cards), for US-003 AC-9. usage: <out>
import {writeFileSync} from 'node:fs';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {readSkill} from '../../src/core/skill/read';
import {DEFAULT_SIZES, DEFAULT_SKILL} from '../../src/core/skill/settings';
import {readSpell} from '../../src/core/spell/read';
import {DEFAULT_SPELL} from '../../src/core/spell/settings';
import {EXAMPLE_SPELL_NOTE} from './spell-fixtures';
import {EXAMPLE_NOTE, inventedParagraphs} from './skill-fixtures';
import {compilePdf} from './typst-node';

const out = process.argv[2] ?? '';
const note = (n: number) =>
  `---\ntags:\n  - Wizardry\n---\n${inventedParagraphs(20 + n * 15).join('\n\n')}\n`;
const cards = [
  readSpell('spells/Reed Whisper.md', EXAMPLE_SPELL_NOTE, DEFAULT_SPELL).card,
  readSkill('skills/Reed Sweep.md', EXAMPLE_NOTE, DEFAULT_SKILL).card,
  ...Array.from({length: 9}, (_, i) =>
    i % 2 === 0
      ? readSpell(`spells/Spell ${i}.md`, note(i), DEFAULT_SPELL).card
      : readSkill(`skills/Skill ${i}.md`, note(i), DEFAULT_SKILL).card,
  ),
];
const typst = cardSheetTypst(cards, DEFAULT_SHEET, DEFAULT_SIZES);
if (!typst.ok) throw new Error(typst.message);
writeFileSync(out, await compilePdf(typst.source));
