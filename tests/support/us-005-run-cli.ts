// Test support: one process that makes the composed example's cards (US-005
// AC-12) and prints a hash of the PDF and the warnings file, for AC-11 (two
// fresh processes). No argument.
import {createHash} from 'node:crypto';
import {createCardsRunner} from '../../src/plugin/runner';
import {mixedDeps, type Recorded} from './run-fixtures';

const rec: Recorded = {writes: [], notices: []};
const runner = createCardsRunner(mixedDeps(rec) as never);
await runner.runDeck({path: 'Mixed Deck.md', name: 'Mixed Deck'});
const pdf =
  rec.writes.find((w) => w.path.endsWith('.pdf'))?.bytes ?? new Uint8Array();
const md = rec.writes.find((w) => w.path.endsWith('.md'))?.text ?? '';
process.stdout.write(
  JSON.stringify({
    pdf: createHash('sha256').update(pdf).digest('hex'),
    size: pdf.length,
    md,
    notices: rec.notices,
  }),
);
