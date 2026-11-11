// Test support: one process that writes the PDF of a default sheet, for the
// determinism test (US-001 AC-10: two fresh processes). usage: <out> <count>
import {writeFileSync} from 'node:fs';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {sheetTypst} from '../../src/core/sheet/typst';
import {compilePdf} from './typst-node';

const [out, count] = [process.argv[2] ?? '', Number(process.argv[3])];
const typst = sheetTypst(count, DEFAULT_SHEET);
if (!typst.ok) throw new Error(typst.message);
writeFileSync(out, await compilePdf(typst.source));
