// US-001 AC-5, AC-7, AC-9, AC-10 at the PDF level: the sheet is compiled with
// the pinned Typst and read back from the file. Expected positions come from
// the story's examples (AC-1, AC-6, AC-7), not from the code under test.
// Time limits (SCAR-030): one compile takes about 0.1 s alone; the 30 s limit
// leaves room for the first WASM initialisation in a parallel run.
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_SHEET,
  cutMarks,
  placeCards,
  type SheetSettings,
} from '../../src/core/sheet/layout';
import {sheetTypst} from '../../src/core/sheet/typst';
import {readSheet} from '../support/pdf-sheet';
import {compilePdf} from '../support/typst-node';

const LIMIT = 30_000;
const s = (over: Partial<SheetSettings> = {}): SheetSettings => ({
  ...DEFAULT_SHEET,
  ...over,
});

/** The sheet of `count` cards as pages read back from the compiled PDF. */
async function sheet(count: number, settings: SheetSettings) {
  const typst = sheetTypst(count, settings);
  if (!typst.ok) throw new Error(typst.message);
  return readSheet(await compilePdf(typst.source));
}

describe(
  'support: the PDF reader reads what Typst drew (SCAR-028)',
  () => {
    const doc = (shape: string) =>
      `#set page(width: 210mm, height: 297mm, margin: 0pt)\n#set document(date: none)\n${shape}\n`;
    it('a stroked frame at 10 / 20 mm, 30 x 40 mm', async () => {
      const [p] = readSheet(
        await compilePdf(
          doc(
            '#place(top + left, dx: 10mm, dy: 20mm, rect(width: 30mm, height: 40mm, stroke: 0.2pt))',
          ),
        ),
      );
      expect(p!.frames).toHaveLength(1);
      const f = p!.frames[0]!;
      expect([f.x, f.y, f.w, f.h].map((v) => +v.toFixed(2))).toEqual([
        10, 20, 30, 40,
      ]);
    });
    it('a filled frame without stroke is read at the same place', async () => {
      const [p] = readSheet(
        await compilePdf(
          doc(
            '#place(top + left, dx: 10mm, dy: 20mm, rect(width: 30mm, height: 40mm, fill: black, stroke: none))',
          ),
        ),
      );
      const f = p!.frames[0]!;
      expect([f.x, f.y, f.w, f.h].map((v) => +v.toFixed(2))).toEqual([
        10, 20, 30, 40,
      ]);
    });
    it('a line from 5 / 6 mm to 5 / 9 mm', async () => {
      const [p] = readSheet(
        await compilePdf(
          doc(
            '#place(top + left, dx: 5mm, dy: 6mm, line(start: (0mm, 0mm), end: (0mm, 3mm), stroke: 0.2pt))',
          ),
        ),
      );
      expect(p!.lines).toHaveLength(1);
      const l = p!.lines[0]!;
      expect([l.x1, l.y1, l.x2, l.y2].map((v) => +v.toFixed(2))).toEqual([
        5, 6, 5, 9,
      ]);
    });
    it('an open four-point path is no frame and no line', async () => {
      const [p] = readSheet(
        await compilePdf(
          doc(
            '#place(top + left, curve(curve.move((0mm, 0mm)), curve.line((10mm, 0mm)), curve.line((10mm, 10mm)), curve.line((0mm, 10mm)), stroke: 1pt))',
          ),
        ),
      );
      expect([p!.frames.length, p!.lines.length]).toEqual([0, 0]);
    });
    it('a closed slanted four-point shape is no frame', async () => {
      const [p] = readSheet(
        await compilePdf(
          doc(
            '#place(top + left, polygon((0mm, 0mm), (10mm, 0mm), (14mm, 10mm), (4mm, 10mm), stroke: 1pt))',
          ),
        ),
      );
      expect([p!.frames.length, p!.lines.length]).toEqual([0, 0]);
    });
    it('guard: an empty page reads as no frames and no lines (the blank result)', async () => {
      const [p] = readSheet(await compilePdf(doc('#[]')));
      expect([p!.frames.length, p!.lines.length]).toEqual([0, 0]);
    });
  },
  LIMIT,
);

describe('US-001 AC-9: pages are A4', () => {
  it(
    'every page of a 20-card sheet is 595.2756 x 841.8898 pt',
    async () => {
      const pages = await sheet(20, s());
      expect(pages).toHaveLength(3);
      for (const p of pages) {
        expect(p.widthPt).toBeCloseTo(595.28, 1);
        expect(p.heightPt).toBeCloseTo(841.89, 1);
      }
    },
    LIMIT,
  );
});

describe('US-001 AC-9: frames are where AC-1 and AC-6 put them', () => {
  const cases: [string, Partial<SheetSettings>][] = [
    ['defaults', {}],
    [
      'margin 15, gap 2, card 70 x 90',
      {margin: 15, gap: 2, cardWidth: 70, cardHeight: 90},
    ],
    ['gap 5', {gap: 5}],
  ];
  it.each(cases)(
    '%s',
    async (_name, over) => {
      const settings = s(over);
      const placed = placeCards(10, settings);
      if (!placed.ok) throw new Error(placed.message);
      const pages = await sheet(10, settings);
      const found = pages.reduce((n, p) => n + p.frames.length, 0);
      expect(found).toBe(10); // every card found, none missing or extra
      // frames of each page, in reading order, equal the placed cards' corners
      for (let page = 0; page < pages.length; page++) {
        const want = placed.cards.filter((c) => c.page === page);
        const got = pages[page]!.frames.slice().sort(
          (a, b) => a.y - b.y || a.x - b.x,
        );
        const wantSorted = want.slice().sort((a, b) => a.y - b.y || a.x - b.x);
        expect(got).toHaveLength(wantSorted.length);
        wantSorted.forEach((c, i) => {
          expect(got[i]!.x).toBeCloseTo(c.x, 2);
          expect(got[i]!.y).toBeCloseTo(c.y, 2);
          expect(got[i]!.w).toBeCloseTo(settings.cardWidth, 2);
          expect(got[i]!.h).toBeCloseTo(settings.cardHeight, 2);
        });
      }
    },
    LIMIT,
  );

  it(
    'the default first frame is at 12 / 16.5 mm (AC-1)',
    async () => {
      const [p] = await sheet(1, s());
      expect(p!.frames).toHaveLength(1);
      expect(p!.frames[0]!.x).toBeCloseTo(12, 2);
      expect(p!.frames[0]!.y).toBeCloseTo(16.5, 2);
    },
    LIMIT,
  );
});

describe('US-001 AC-5, AC-9: page count of the PDF', () => {
  it.each([
    [1, 1],
    [9, 1],
    [10, 2],
    [20, 3],
  ])(
    '%i cards give %i pages',
    async (n, pages) => {
      expect(await sheet(n, s())).toHaveLength(pages);
    },
    LIMIT,
  );
  it('0 cards write no PDF and say so', () => {
    expect(sheetTypst(0, s())).toEqual({
      ok: false,
      message: 'There are no cards to print',
    });
  });
  it('invalid settings write no PDF', () => {
    expect(sheetTypst(3, s({margin: 51})).ok).toBe(false);
  });
});

describe('US-001 AC-7: cut marks in the PDF', () => {
  it(
    'every page has the 16 ticks of the default sheet at their positions',
    async () => {
      const pages = await sheet(10, s());
      const want = cutMarks(s()).marks;
      expect(want).toHaveLength(16);
      for (const p of pages) {
        expect(p.lines).toHaveLength(want.length);
        const key = (t: {x1: number; y1: number; x2: number; y2: number}) =>
          [t.x1, t.y1, t.x2, t.y2].map((v) => v.toFixed(2)).join(',');
        expect(p.lines.map(key).sort()).toEqual(want.map(key).sort());
      }
    },
    LIMIT,
  );
  it(
    'cut marks off: no lines in the PDF',
    async () => {
      const pages = await sheet(3, s({cutMarks: false}));
      expect(pages[0]!.lines).toHaveLength(0);
      expect(pages[0]!.frames).toHaveLength(3);
    },
    LIMIT,
  );
});

describe('US-001 AC-10: byte-identical PDF from separate processes', () => {
  it(
    'two fresh processes, 1.1 s apart, write the same bytes',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gcc-'));
      try {
        const bundle = join(dir, 'cli.mjs');
        await build({
          entryPoints: ['tests/support/compile-sheet-cli.ts'],
          bundle: true,
          platform: 'node',
          format: 'esm',
          outfile: bundle,
          logLevel: 'silent',
        });
        const run = (name: string): Buffer => {
          const out = join(dir, name);
          const r = spawnSync('node', [bundle, out, '10'], {
            cwd: process.cwd(),
            encoding: 'utf8',
          });
          expect(r.status, r.stderr).toBe(0);
          return readFileSync(out);
        };
        const first = run('a.pdf');
        await new Promise((r) => setTimeout(r, 1100)); // a clock in the PDF shows
        const second = run('b.pdf');
        expect(first.length).toBeGreaterThan(1000);
        expect(second.equals(first)).toBe(true);
      } finally {
        rmSync(dir, {recursive: true, force: true});
      }
    },
    LIMIT,
  );
  it(
    'guard: without the date line two runs 1.1 s apart differ',
    async () => {
      const typst = sheetTypst(1, s());
      if (!typst.ok) throw new Error(typst.message);
      const dated = typst.source.replace('#set document(date: none)\n', '');
      expect(dated).not.toBe(typst.source);
      const a = await compilePdf(dated);
      await new Promise((r) => setTimeout(r, 1100));
      const b = await compilePdf(dated);
      expect(Buffer.from(b).equals(Buffer.from(a))).toBe(false);
    },
    LIMIT,
  );
});
