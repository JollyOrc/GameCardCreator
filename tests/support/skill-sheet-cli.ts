// Test support: one process that writes the PDF of eleven skill cards (the
// story's example note and ten invented ones), for US-002 AC-11. usage: <out>
import {writeFileSync} from 'node:fs';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {readSkill} from '../../src/core/skill/read';
import {skillSheetTypst} from '../../src/core/skill/sheet';
import {DEFAULT_SKILL} from '../../src/core/skill/settings';
import {EXAMPLE_NOTE, inventedParagraphs} from './skill-fixtures';
import {compilePdf} from './typst-node';

const out = process.argv[2] ?? '';
const cards = [
  readSkill('skills/Reed Sweep.md', EXAMPLE_NOTE, DEFAULT_SKILL).card,
  ...Array.from(
    {length: 10},
    (_, i) =>
      readSkill(
        `skills/Card ${i}.md`,
        `---\ntags:\n  - FieldCraft\n---\n${inventedParagraphs(20 + i * 20).join('\n\n')}\n`,
        DEFAULT_SKILL,
      ).card,
  ),
];
const typst = skillSheetTypst(cards, DEFAULT_SHEET, DEFAULT_SKILL);
if (!typst.ok) throw new Error(typst.message);
writeFileSync(out, await compilePdf(typst.source));
