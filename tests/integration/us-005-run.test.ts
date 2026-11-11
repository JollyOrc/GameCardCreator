// US-005 AC-4, AC-11, AC-12 at the PDF level: the composed deck is run through
// the runner with the real Typst compile; the PDF and the warnings file are
// read back. Expected values from the story's AC-12. Red until the code
// ticket. Each compile takes 0.1 to 0.5 s; limit 60 s (SCAR-030).
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {describe, expect, it} from 'vitest';
import {createCardsRunner} from '../../src/plugin/runner';
import {runName} from '../../src/core/run/names';
import {textOf} from '../support/card-pdf';
import {openPdf} from '../support/pdf/reader';
import {pageRuns} from '../support/pdf/text';
import {readSheet} from '../support/pdf-sheet';
import {mixedDeps, type Recorded} from '../support/run-fixtures';

const LIMIT = 60_000;

async function runMixed() {
  const rec: Recorded = {writes: [], notices: []};
  const runner = createCardsRunner(mixedDeps(rec) as never);
  await runner.runDeck({path: 'Mixed Deck.md', name: 'Mixed Deck'});
  return rec;
}

describe('US-005 AC-12: the composed deck', () => {
  it(
    'writes one PDF of three cards and the warnings file in the order of the story',
    async () => {
      const rec = await runMixed();
      expect(rec.writes.map((w) => w.path)).toEqual([
        '/out/Mixed Deck cards.pdf',
        '/out/Mixed Deck cards warnings.md',
      ]);
      expect(rec.writes[1]!.text).toBe(
        '# Mixed Deck cards: warnings\n\n' +
          '- DECK_LINK_MISSING — Mixed Deck.md — Gone\n' +
          '- CARD_KIND_UNKNOWN — misc/Loose.md\n' +
          '- SKILL_IMAGE_OMITTED — skills/Reed Sweep.md — pics/reed.png\n' +
          '- SKILL_TEXT_OVERFLOW — skills/Long Drill.md — 5.5 pt\n',
      );
      expect(rec.notices).toEqual([
        '3 cards on 1 page, 4 warnings. Written to /out',
      ]);
    },
    LIMIT,
  );
  it(
    'the PDF holds the three cards in the order of the deck',
    async () => {
      const rec = await runMixed();
      const pdf = rec.writes[0]!.bytes!;
      const sheet = readSheet(pdf);
      expect(sheet).toHaveLength(1);
      expect(sheet[0]!.frames).toHaveLength(3);
      const runs = pageRuns(openPdf(pdf))[0]!;
      // cards sit at x = 12, 74, 136 (mm) in the first row; read each by its column
      const col = (i: number) =>
        textOf(
          runs.filter(
            (r) =>
              (r.x0 * 25.4) / 72 >= 12 + 62 * i - 0.1 &&
              (r.x0 * 25.4) / 72 < 12 + 62 * (i + 1) - 0.1,
          ),
        );
      expect(col(0)).toContain('Reed Sweep');
      expect(col(1)).toContain('Reed Whisper');
      expect(col(2)).toContain('Long Drill');
      expect(col(0)).not.toContain('reed.png');
      expect(col(0)).not.toContain('Loose');
    },
    LIMIT,
  );
  it("the name of a run from one folder is the folder's", () => {
    expect(runName([{path: 'skills', isFolder: true}])).toBe('skills');
  });
});

describe('US-005 AC-11: the same files from separate processes', () => {
  it(
    'two fresh processes, 1.1 s apart, make the same PDF and the same warnings file',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gcc-005-'));
      try {
        const bundle = join(dir, 'cli.mjs');
        await build({
          entryPoints: ['tests/support/us-005-run-cli.ts'],
          bundle: true,
          platform: 'node',
          format: 'esm',
          outfile: bundle,
          banner: {
            js: "import {createRequire} from 'node:module'; const require = createRequire(import.meta.url);",
          },
          logLevel: 'silent',
        });
        const run = (): string => {
          const r = spawnSync('node', [bundle], {
            cwd: process.cwd(),
            encoding: 'utf8',
          });
          expect(r.status, r.stderr).toBe(0);
          return r.stdout;
        };
        const first = run();
        await new Promise((r) => setTimeout(r, 1100));
        const second = run();
        expect(JSON.parse(first).size).toBeGreaterThan(1000);
        expect(second).toBe(first);
      } finally {
        rmSync(dir, {recursive: true, force: true});
      }
    },
    LIMIT,
  );
});
