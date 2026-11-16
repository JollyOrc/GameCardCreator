// US-012 AC-1 to AC-8, AC-10 to AC-12: equal title bands on creature cards, compiled with the
// pinned Typst (typst.ts 0.7.0) and read back from the PDF: the band's text size and lines,
// the creature fact (size, height, wrapped, widest), the rule under each band. Expected
// values: the story's examples, measured 2026-11-16 with the Typst CLI 0.14.2, the bundled
// fonts and the fixture's prelude (SCAR-024: this file shows the plugin's compile path gives
// the same numbers, heights to 0.05 mm). The answers are the real ones for each name
// (band-fixtures, checked against the recording). Invented names (SCAR-035). Scope: the
// default card size and text sizes unless stated. Red until the code tickets (G2, 2026-11-16).
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {describe, expect, it} from 'vitest';
import {titleWarnings, type TitleSettings} from '../../src/core/card/titles';
import type {CreatureCard} from '../../src/core/creature/read';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import type {SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SIZES, type CardSizes} from '../../src/core/skill/settings';
import {runBox, runText} from '../support/card-pdf';
import {makeSheet} from '../support/card-sheet';
import {pagePaints} from '../support/pdf/graphics';
import {openPdf} from '../support/pdf/reader';
import {
  FEN,
  FERRY,
  MARSH,
  OFF_C,
  ON_C,
  REED,
  THORN,
  creatureNamed,
  runA,
  runB,
} from '../support/band-fixtures';
import {ON, parry, riverbank, titleFacts} from '../support/title-fixtures';

const T = 120_000; // SCAR-030: one compile of a sheet takes 1 to 3 s in a full run
const HEIGHT_MM = 0.05; // the story's heights are given to 0.01 mm, measured by the CLI

type Card = SkillCard | CreatureCard;
type Sheet = Awaited<ReturnType<typeof makeSheet>>;
const sheetOf = (
  cards: Card[],
  titles: {skill?: TitleSettings; creature?: TitleSettings},
  sizes: CardSizes = DEFAULT_SIZES,
) => makeSheet(cards, DEFAULT_SHEET, sizes, {titles});
type CreatureFact = {
  titles: 'creature';
  size: number;
  height: number;
  wrapped: number[];
  widest: number;
};
const factOf = (m: Sheet): CreatureFact => {
  const f = titleFacts(m.facts as unknown[]).filter(
    (x) => (x.titles as string) === 'creature',
  );
  expect(f, 'one creature fact').toHaveLength(1);
  return f[0] as unknown as CreatureFact;
};
const fitOf = (m: Sheet, i: number) =>
  (m.facts as {i?: number; size: number; dropped?: string[]}[]).find(
    (f) => f.i === i,
  )!;
/** The runs of card `i`'s band (or own title): its words and ◆, at the largest size in the top 25 mm. */
function bandRuns(m: Sheet, i: number, name: string) {
  const c = m.placed[i]!;
  const words = new Set([...name.split(' '), '◆']);
  const top = m
    .runsOf(i)
    .filter((r) => runBox(r).y < c.y + 25)
    .filter((r) =>
      runText(r)
        .split(' ')
        .some((w) => words.has(w)),
    );
  const size = Math.max(...top.map((r) => r.size));
  return top.filter((r) => Math.abs(r.size - size) < 0.01);
}
const bandSize = (m: Sheet, i: number, name: string): number =>
  bandRuns(m, i, name)[0]!.size;
/** The number of baselines the name's words stand on (the ◆ marks of a wrapped name sit between its lines, US-041, and are not counted). */
const bandLines = (m: Sheet, i: number, name: string): number => {
  const words = new Set(name.split(' '));
  return new Set(
    bandRuns(m, i, name)
      .filter((r) =>
        runText(r)
          .split(' ')
          .some((w) => words.has(w)),
      )
      .map((r) => Math.round(runBox(r).y * 10)),
  ).size;
};
/** The rule under card `i`'s band: the topmost 50 mm horizontal stroke inside the statblock (54 mm less 2 x 2 mm inset). */
function bandRuleY(m: Sheet, i: number): number {
  const c = m.placed[i]!;
  const rules = pagePaints(openPdf(m.pdf))[c.page]!.strokes.filter(
    (s) =>
      Math.abs(s.y1 - s.y0) < 0.05 &&
      Math.abs(s.x1 - s.x0 - 50) < 0.5 &&
      s.x0 > c.x &&
      s.x1 < c.x + 62 &&
      s.y0 > c.y &&
      s.y0 < c.y + 40,
  );
  expect(rules.length, `rules in card ${i}'s statblock`).toBeGreaterThan(0);
  return Math.min(...rules.map((r) => (r.y0 + r.y1) / 2)) - c.y;
}
/** AC-12: the band rules of `cards` all at one distance from the card's top (to 0.1 mm), counted. */
function expectLevelBands(m: Sheet, indexes: number[]) {
  const ys = indexes.map((i) => bandRuleY(m, i));
  expect(ys, 'one rule per creature card checked').toHaveLength(indexes.length);
  for (const y of ys) expect(Math.abs(y - ys[0]!)).toBeLessThan(0.1);
}

describe('US-012 AC-1: off is today (the band follows the text size)', () => {
  it(
    'run A off: every band at 11.5 pt (text size 7); a 260-word Fen Hare at 6 pt has its band at 9.86 pt',
    async () => {
      const m = await sheetOf(
        [creatureNamed(FEN, 260), creatureNamed(REED), creatureNamed(MARSH)],
        {creature: OFF_C},
      );
      expect(titleFacts(m.facts as unknown[])).toEqual([]);
      expect(fitOf(m, 0).size).toBe(6);
      expect(bandSize(m, 0, FEN)).toBeCloseTo(9.86, 2);
      expect(bandSize(m, 1, REED)).toBeCloseTo(11.5, 2);
    },
    T,
  );
});

describe('US-012 AC-2: one name size (shrink first)', () => {
  it(
    'run A: 11.5 pt on every card, one line each, bands 6.67 mm',
    async () => {
      const m = await sheetOf(runA(), {creature: ON_C});
      const f = factOf(m);
      expect(f).toMatchObject({size: 11.5, wrapped: []});
      expect(f.height).toBeCloseTo(6.67, 1);
      expect(Math.abs(f.height - 6.67)).toBeLessThan(HEIGHT_MM);
      [FEN, REED, MARSH].forEach((n, i) => {
        expect(bandSize(m, i, n), n).toBeCloseTo(11.5, 2);
        expect(bandLines(m, i, n), n).toBe(1);
      });
    },
    T,
  );
  it(
    'run B: 7.75 pt on every card (8 is above the 7.9 that fits), bands 5.80 mm',
    async () => {
      const m = await sheetOf(runB(), {creature: ON_C});
      const f = factOf(m);
      expect(f).toMatchObject({size: 7.75, wrapped: []});
      expect(Math.abs(f.height - 5.8)).toBeLessThan(HEIGHT_MM);
      [FEN, REED, MARSH, FERRY].forEach((n, i) => {
        expect(bandSize(m, i, n), n).toBeCloseTo(7.75, 2);
        expect(bandLines(m, i, n), n).toBe(1);
      });
    },
    T,
  );
  it(
    'Thornwhisperingbramblequeen with run A: 11.5 pt (one word, one line, US-041 D3 composed)',
    async () => {
      const m = await sheetOf([...runA(), creatureNamed(THORN)], {
        creature: ON_C,
      });
      expect(factOf(m)).toMatchObject({size: 11.5, wrapped: []});
      expect(bandLines(m, 3, THORN)).toBe(1);
    },
    T,
  );
});

describe('US-012 AC-3: the name size does not follow the text size', () => {
  it(
    'run A with a 260-word Fen Hare: its band at 11.5 pt like the others; its other sizes at S / 7',
    async () => {
      const m = await sheetOf(
        [creatureNamed(FEN, 260), creatureNamed(REED), creatureNamed(MARSH)],
        {creature: ON_C},
      );
      const s = fitOf(m, 0).size;
      expect(s).toBeLessThan(7);
      expect(bandSize(m, 0, FEN)).toBeCloseTo(11.5, 2);
      // the box label VIGOUR (5.5 pt at 7) still scales: 5.5 x S / 7
      const label = m.runsOf(0).find((r) => runText(r).includes('VIGOUR'))!;
      expect(label.size).toBeCloseTo((5.5 * s) / 7, 2);
      expectLevelBands(m, [0, 1, 2]);
    },
    T,
  );
});

describe('US-012 AC-4: still too long at the smallest size: wrap, one warning', () => {
  it(
    'run B, smallest 9: 9 pt, the ferryman wraps (10.24 mm), the others one line; the warning',
    async () => {
      const cards = runB();
      const m = await sheetOf(cards, {
        creature: {...ON_C, minTitleSize: 9},
      });
      const f = factOf(m);
      expect(f).toMatchObject({size: 9, wrapped: [3], widest: 3});
      expect(Math.abs(f.height - 10.24)).toBeLessThan(HEIGHT_MM);
      expect(bandLines(m, 3, FERRY)).toBe(2);
      [FEN, REED, MARSH].forEach((n, i) =>
        expect(bandLines(m, i, n), n).toBe(1),
      );
      expect(titleWarnings(m.facts as unknown[], cards)).toEqual([
        {
          code: 'CREATURE_TITLE_WRAPPED',
          path: 'creatures/Old Grey Ferryman of the Sunken Weir.md',
          detail: '1 of 4 titles wrap at 9 pt',
        },
      ]);
      expectLevelBands(m, [0, 1, 2]);
      expect(bandRuleY(m, 3) - bandRuleY(m, 0)).toBeGreaterThan(3);
    },
    T,
  );
});

describe('US-012 AC-5: a card without a statblock', () => {
  it(
    'Fen Hare, Reedmother with statblocks, the ferryman refused: 8.5 pt, his own title one line at 8.5',
    async () => {
      const m = await sheetOf(
        [
          creatureNamed(FEN),
          creatureNamed(REED),
          creatureNamed(FERRY, 40, false),
        ],
        {creature: ON_C},
      );
      expect(factOf(m)).toMatchObject({size: 8.5, wrapped: []});
      expect(bandSize(m, 0, FEN)).toBeCloseTo(8.5, 2);
      expect(bandSize(m, 2, FERRY)).toBeCloseTo(8.5, 2);
      expect(bandLines(m, 2, FERRY)).toBe(1);
      expectLevelBands(m, [0, 1]);
    },
    T,
  );
});

describe('US-012 AC-6, AC-11: stable and deterministic', () => {
  it(
    'two compiles of run B give the same facts (the fit cannot change t)',
    async () => {
      const a = await sheetOf(runB(), {creature: ON_C});
      const b = await sheetOf(runB(), {creature: ON_C});
      expect(b.facts).toEqual(a.facts);
    },
    T,
  );
  it(
    'the order of the notes does not change t',
    async () => {
      const m = await sheetOf([...runB()].reverse(), {creature: ON_C});
      expect(factOf(m)).toMatchObject({size: 7.75, wrapped: []});
    },
    T,
  );
  it(
    'two fresh processes write the same PDF bytes',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gcc-us012-'));
      try {
        const bundle = join(dir, 'cli.mjs');
        await build({
          entryPoints: ['tests/support/creature-titles-cli.ts'],
          bundle: true,
          platform: 'node',
          format: 'esm',
          outfile: bundle,
          banner: {
            js: "import {createRequire} from 'node:module'; const require = createRequire(import.meta.url);",
          },
          logLevel: 'silent',
        });
        const run = (name: string): Buffer => {
          const out = join(dir, name);
          const r = spawnSync('node', [bundle, out], {
            cwd: process.cwd(),
            encoding: 'utf8',
          });
          expect(r.status, r.stderr).toBe(0);
          return readFileSync(out);
        };
        const first = run('a.pdf');
        await new Promise((r) => setTimeout(r, 1100));
        const second = run('b.pdf');
        expect(first.length).toBeGreaterThan(1000);
        expect(second.equals(first)).toBe(true);
      } finally {
        rmSync(dir, {recursive: true, force: true});
      }
    },
    T,
  );
});

describe('US-012 AC-8: the settings at the default, the ends, a middle value, equal bounds, another step', () => {
  it.each([
    ['upper end: title 20', {titleSize: 20}, DEFAULT_SIZES, 13.75],
    ['a middle value: title 14', {titleSize: 14}, DEFAULT_SIZES, 13.75],
    [
      'lower ends: title 6, smallest 4',
      {titleSize: 6, minTitleSize: 4},
      DEFAULT_SIZES,
      6,
    ],
    [
      'size step 0.3, title 20',
      {titleSize: 20},
      {...DEFAULT_SIZES, sizeStep: 0.3},
      13.7,
    ],
  ] as const)(
    'run A, %s: t = %s',
    async (_n, over, sizes, t) => {
      const m = await sheetOf(runA(), {creature: {...ON_C, ...over}}, sizes);
      expect(factOf(m)).toMatchObject({size: t, wrapped: []});
      expect(bandSize(m, 2, MARSH)).toBeCloseTo(t, 2);
    },
    T,
  );
  it(
    'run B, title and smallest 11.5: the ferryman wraps at 11.5',
    async () => {
      const cards = runB();
      const m = await sheetOf(cards, {
        creature: {...ON_C, minTitleSize: 11.5},
      });
      expect(factOf(m)).toMatchObject({size: 11.5, wrapped: [3], widest: 3});
      expect(titleWarnings(m.facts as unknown[], cards)[0]?.detail).toBe(
        '1 of 4 titles wrap at 11.5 pt',
      );
    },
    T,
  );
});

describe('US-012 AC-10: composed with skill cards in equal mode', () => {
  it(
    'Parry, Riverbank Ambush and run B: skill 8.1, creature 7.75, each its own fact',
    async () => {
      const m = await sheetOf([parry(), riverbank(), ...runB()], {
        skill: ON,
        creature: ON_C,
      });
      const facts = titleFacts(m.facts as unknown[]);
      expect(facts.map((f) => [f.titles, f.size]).sort()).toEqual([
        ['creature', 7.75],
        ['skill', 8.1],
      ]);
      expect(bandSize(m, 5, FERRY)).toBeCloseTo(7.75, 2);
    },
    T,
  );
});

describe('US-012 AC-12: the bands of a run lie level', () => {
  it(
    'run A and run B: every band rule at one distance from its card top, counted',
    async () => {
      const a = await sheetOf(runA(), {creature: ON_C});
      expectLevelBands(a, [0, 1, 2]);
      const b = await sheetOf(runB(), {creature: ON_C});
      expectLevelBands(b, [0, 1, 2, 3]);
    },
    T,
  );
  it(
    'off, the same run B: the bands are not level (the guard can fail, SCAR-023)',
    async () => {
      const m = await sheetOf(runB(), {creature: OFF_C});
      expect(bandLines(m, 3, FERRY)).toBe(2);
      expect(Math.abs(bandRuleY(m, 3) - bandRuleY(m, 0))).toBeGreaterThan(1);
    },
    T,
  );
});
