// Test support: one process that writes the PDF of run B of US-012 with equal title bands on
// (the defaults), for US-012 AC-11 (two fresh processes). usage: <out>
import {writeFileSync} from 'node:fs';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {FIT_LABEL} from '../../src/core/skill/fit';
import {DEFAULT_SIZES} from '../../src/core/skill/settings';
import {ON_C, runB} from './band-fixtures';
import {compileWithFacts} from './typst-node';

const out = process.argv[2] ?? '';
const typst = cardSheetTypst(
  runB(),
  DEFAULT_SHEET,
  DEFAULT_SIZES,
  DEFAULT_CREATURE,
  {
    titles: {creature: ON_C},
  },
);
if (!typst.ok) throw new Error(typst.message);
const {pdf} = await compileWithFacts(typst.source, FIT_LABEL, typst.files);
writeFileSync(out, pdf);
