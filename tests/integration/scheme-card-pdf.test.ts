// US-009 AC-3 to AC-5, AC-8, AC-9, AC-10, AC-15 at the PDF level: skill and spell
// cards with branches, compiled with the pinned Typst and read back (text, fills,
// gradients, strokes, positions) through the instrument checked in
// `pdf-graphics.test.ts` (SCAR-028). Cards carry the branches the run would give
// them; colours and icons are the story's invented example (SCAR-035). Bounds that
// depend on a typeface's metrics are stated as bounds; they are tightened from the
// first green run only with the measured value written next to them. Red until the
// code ticket.
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {describe, expect, it} from 'vitest';
import {readCreature} from '../../src/core/creature/read';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import type {Block, SkillCard} from '../../src/core/skill/read';
import {runBox, runText} from '../support/card-pdf';
import {makeSheet} from '../support/card-sheet';
import {
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_WITH_CREDIT,
  words14,
} from '../support/creature-fixtures';
import {pagePaints, type Fill} from '../support/pdf/graphics';
import {openPdf} from '../support/pdf/reader';

const LIMIT = 120_000;
const para = (text: string): Block => ({kind: 'paragraph', runs: [{text}]});
const br = (tag: string, colour: string, icon: string) => ({
  tag,
  colour,
  icon,
  line: 1,
});
const SWORD = br('Swordplay', '#f4d6b0', 'sword');
const FIRE = br('Pyromancy', '#ffb4a2', 'fire');
const SKULL = br('Hexes', '#e4f0a8', 'skull');
const ANVIL = br('Stonework', '#cbd5e8', 'anvil');
const CP = {sword: 0xe946, fire: 0xe9c3, skull: 0xeaa1, anvil: 0xe909};
const CREDIT = 'Icons: Game-icons.net (CC BY 3.0), via RPG Awesome';

type B = ReturnType<typeof br>;
const card = (
  kind: 'skill' | 'spell',
  name: string,
  branches: B[],
  over: Partial<SkillCard> = {},
): SkillCard =>
  ({
    kind,
    path: `${kind}s/${name}.md`,
    name,
    tags: kind === 'skill' ? ['Combat Skill', 'Swordplay'] : ['Pyromancy'],
    rawTags: kind === 'skill' ? ['CombatSkill', 'Swordplay'] : ['Pyromancy'],
    details: kind === 'skill' ? [{label: 'Time', value: 'reaction'}] : [],
    blocks: [para('You turn a blow aside.')],
    branches,
    ...over,
  }) as SkillCard;
const creature = () => ({
  ...readCreature(
    'creatures/Fen Hare.md',
    EXAMPLE_CREATURE_NOTE,
    DEFAULT_CREATURE,
  ).card,
  statblock: FEN_HARE_WITH_CREDIT,
});

type Sheet = Awaited<ReturnType<typeof makeSheet>>;
/** Fills whose centre lies in card `i`'s frame. */
const fillsOf = (m: Sheet, i: number): Fill[] => {
  const c = m.placed[i]!;
  const all = pagePaints(openPdf(m.pdf))[c.page]!.fills;
  return all.filter((f) => {
    const cx = (f.x0 + f.x1) / 2;
    const cy = (f.y0 + f.y1) / 2;
    return cx > c.x && cx < c.x + 62 && cy > c.y && cy < c.y + 88;
  });
};
/**
 * The place of the LAST stroke that is card `i`'s frame in the drawing order. The sheet
 * draws every frame once before the card's content (US-001); a card whose band must lie
 * under its frame (AC-3) may have it drawn again after the band, so the last one counts.
 */
const frameSeq = (m: Sheet, i: number): number => {
  const c = m.placed[i]!;
  const strokes = pagePaints(openPdf(m.pdf))[c.page]!.strokes;
  const mine = strokes.filter(
    (x) =>
      Math.abs(x.x0 - c.x) < 0.3 &&
      Math.abs(x.y0 - c.y) < 0.3 &&
      Math.abs(x.x1 - c.x - 62) < 0.3 &&
      Math.abs(x.y1 - c.y - 88) < 0.3,
  );
  if (mine.length === 0) throw new Error(`no frame stroke for card ${i}`);
  return Math.max(...mine.map((s) => s.seq));
};
/** The icon runs of card `i` (18 pt), left to right. */
const iconRuns = (m: Sheet, i: number) =>
  m
    .runsOf(i)
    .filter((r) => Math.abs(r.size - 18) < 0.3)
    .sort((a, b) => a.x0 - b.x0);
const near = (a: number, b: number, tol = 0.1) =>
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const baseline = (m: Sheet, i: number, text: string) => {
  const r = m.runsOf(i).find((x) => runText(x).includes(text));
  if (r === undefined) throw new Error(`no run "${text}": ${m.textOf(i)}`);
  return runBox(r);
};

describe('US-009 AC-3: the band of one branch', () => {
  it(
    'a skill: a flat band of the colour from the top edge, as wide as the card, the header on it, the text under it',
    async () => {
      const m = await makeSheet([card('skill', 'Parry', [SWORD])]);
      expect(m.diagnostics).toEqual([]);
      const c = m.placed[0]!;
      const fills = fillsOf(m, 0);
      expect(fills).toHaveLength(1);
      const band = fills[0]!;
      expect(band.paint).toEqual({kind: 'flat', rgb: rgb('#f4d6b0')});
      near(band.x0, c.x, 0.05);
      near(band.x1, c.x + 62, 0.05);
      near(band.y0, c.y, 0.05);
      // 4 mm padding + header + 2 mm: more than the three lines, less than a fifth of the card
      expect(band.y1 - band.y0).toBeGreaterThan(12);
      expect(band.y1 - band.y0).toBeLessThan(25);
      // the header (tags, title, details) is on the band, 4 mm from the left edge
      for (const part of ['Combat Skill', 'Parry', 'Time: reaction']) {
        const b = baseline(m, 0, part);
        expect(b.y, part).toBeGreaterThan(band.y0 + 3);
        expect(b.y, part).toBeLessThan(band.y1 - 0.5);
      }
      near(baseline(m, 0, 'Combat Skill').x0, c.x + 4, 0.15);
      near(baseline(m, 0, 'Parry').x0, c.x + 4, 0.15);
      // the band ends 2 mm under the header's last line (that line's descent is under 1.6 mm)
      const gapBelow = band.y1 - baseline(m, 0, 'Time: reaction').y;
      expect(gapBelow).toBeGreaterThanOrEqual(2.0);
      expect(gapBelow).toBeLessThanOrEqual(3.6);
      // the text starts 2 mm under the band (its first baseline a line's ascent below that)
      const body = baseline(m, 0, 'You turn a blow aside.');
      expect(body.y - band.y1).toBeGreaterThanOrEqual(2.0);
      expect(body.y - band.y1).toBeLessThan(2 + 3.6);
    },
    LIMIT,
  );
  it(
    'a spell: the same band, no details row, so a lower band',
    async () => {
      const m = await makeSheet([
        card('skill', 'Parry', [SWORD]),
        card('spell', 'Ember Spark', [FIRE]),
      ]);
      const skill = fillsOf(m, 0)[0]!;
      const spell = fillsOf(m, 1)[0]!;
      expect(spell.paint).toEqual({kind: 'flat', rgb: rgb('#ffb4a2')});
      near(spell.y0, m.placed[1]!.y, 0.05);
      // with no details row the title is the last line of the header
      const titleGap = spell.y1 - baseline(m, 1, 'Ember Spark').y;
      expect(titleGap).toBeGreaterThanOrEqual(2.0);
      expect(titleGap).toBeLessThanOrEqual(3.6);
      expect(spell.y1 - spell.y0).toBeLessThan(skill.y1 - skill.y0 - 2);
    },
    LIMIT,
  );
  it(
    "the card's frame is drawn over the band, not under it",
    async () => {
      const m = await makeSheet([card('skill', 'Parry', [SWORD])]);
      expect(frameSeq(m, 0)).toBeGreaterThan(fillsOf(m, 0)[0]!.seq);
    },
    LIMIT,
  );
  it(
    'a card with no branch has no band (a plain header as before)',
    async () => {
      const m = await makeSheet([card('skill', 'Plain', [])]);
      expect(fillsOf(m, 0)).toEqual([]);
      expect(iconRuns(m, 0)).toEqual([]);
      near(baseline(m, 0, 'Combat Skill').x0, m.placed[0]!.x + 4, 0.15);
    },
    LIMIT,
  );
});

describe('US-009 AC-4: several branches make a gradient', () => {
  it(
    'two branches: one gradient from the first colour at the left edge to the last at the right edge',
    async () => {
      const m = await makeSheet([card('spell', 'Scorch Hex', [FIRE, SKULL])]);
      const c = m.placed[0]!;
      const fills = fillsOf(m, 0);
      expect(fills).toHaveLength(1);
      const band = fills[0]!;
      expect(band.paint.kind).toBe('gradient');
      if (band.paint.kind !== 'gradient') return;
      expect(band.paint.stops).toEqual([
        {offset: 0, rgb: rgb('#ffb4a2')},
        {offset: 1, rgb: rgb('#e4f0a8')},
      ]);
      near(band.paint.axis.x0, c.x, 0.05);
      near(band.paint.axis.x1, c.x + 62, 0.05);
      near(band.x0, c.x, 0.05);
      near(band.x1, c.x + 62, 0.05);
    },
    LIMIT,
  );
  it(
    'three branches: equal steps, the second colour in the middle',
    async () => {
      const m = await makeSheet([
        card('spell', 'Triple', [FIRE, SKULL, ANVIL]),
      ]);
      const band = fillsOf(m, 0)[0]!;
      expect(band.paint.kind).toBe('gradient');
      if (band.paint.kind !== 'gradient') return;
      expect(band.paint.stops).toEqual([
        {offset: 0, rgb: rgb('#ffb4a2')},
        {offset: 0.5, rgb: rgb('#e4f0a8')},
        {offset: 1, rgb: rgb('#cbd5e8')},
      ]);
    },
    LIMIT,
  );
  it(
    "the order of the branches is the order given (the note's tags), not sorted",
    async () => {
      const m = await makeSheet([card('spell', 'Reversed', [SKULL, FIRE])]);
      const band = fillsOf(m, 0)[0]!;
      if (band.paint.kind !== 'gradient') throw new Error('not a gradient');
      expect(band.paint.stops.map((s) => s.rgb)).toEqual([
        rgb('#e4f0a8'),
        rgb('#ffb4a2'),
      ]);
    },
    LIMIT,
  );
});

describe('US-009 AC-5: the icons', () => {
  it(
    'one icon: 18 pt, the glyph of its name, at the right edge of the text area, inside the band',
    async () => {
      const m = await makeSheet([card('spell', 'Ember Spark', [FIRE])]);
      const c = m.placed[0]!;
      const runs = iconRuns(m, 0);
      expect(runs).toHaveLength(1);
      expect(runText(runs[0]!)).toBe(String.fromCodePoint(CP.fire));
      near(runBox(runs[0]!).x1, c.x + 62 - 4, 0.4);
      const band = fillsOf(m, 0)[0]!;
      expect(runBox(runs[0]!).y).toBeGreaterThan(band.y0);
      expect(runBox(runs[0]!).y).toBeLessThan(band.y1);
    },
    LIMIT,
  );
  it(
    'two icons: in the order of the colours, left to right, the last at the right edge, not overlapping',
    async () => {
      const m = await makeSheet([card('spell', 'Scorch Hex', [FIRE, SKULL])]);
      const c = m.placed[0]!;
      const runs = iconRuns(m, 0);
      expect(runs.map(runText)).toEqual([
        String.fromCodePoint(CP.fire),
        String.fromCodePoint(CP.skull),
      ]);
      near(runBox(runs[1]!).x1, c.x + 58, 0.4);
      expect(runBox(runs[0]!).x1).toBeLessThanOrEqual(
        runBox(runs[1]!).x0 + 0.01,
      );
    },
    LIMIT,
  );
  it(
    'three icons and a long title: the title and the tags wrap before the icons, and the band grows with the lines',
    async () => {
      const long =
        'A Very Long Title That Needs Several Lines Beside Three Icons';
      const m = await makeSheet([
        card('spell', 'Short', [FIRE, SKULL, ANVIL], {name: 'Short'}),
        card('spell', 'Long', [FIRE, SKULL, ANVIL], {
          name: long,
          path: 'spells/Long.md',
        }),
      ]);
      const first = iconRuns(m, 1)[0]!;
      const left = runBox(first).x0;
      const bandLong = fillsOf(m, 1)[0]!;
      // blank runs (the spaces between icons) are no text of the header
      const header = m
        .runsOf(1)
        .filter(
          (r) =>
            Math.abs(r.size - 18) >= 0.3 &&
            runText(r).trim() !== '' &&
            runBox(r).y < bandLong.y1,
        );
      expect(header.length).toBeGreaterThan(1);
      for (const r of header)
        expect(runBox(r).x1, runText(r)).toBeLessThanOrEqual(left - 0.3);
      const titleLines = new Set(
        header
          .filter((r) => r.size > 8)
          .map((r) => Math.round(runBox(r).y * 10)),
      );
      expect(titleLines.size).toBeGreaterThanOrEqual(2);
      const bandShort = fillsOf(m, 0)[0]!;
      expect(bandLong.y1 - bandLong.y0).toBeGreaterThan(
        bandShort.y1 - bandShort.y0 + 3,
      );
    },
    LIMIT,
  );
});

describe('US-009 AC-8: the text room', () => {
  it(
    'a body that fitted at 7 pt still does: the sizes are unchanged, the last line stays inside the text area',
    async () => {
      const body = words14(55).map(para);
      const cards = [
        card('skill', 'Long Text', [SWORD], {blocks: body}),
        card('spell', 'Long Spell', [FIRE, SKULL, ANVIL], {blocks: body}),
      ];
      const m = await makeSheet(cards);
      const facts = (
        m.facts as {i: number; size: number; fits: boolean}[]
      ).sort((a, b) => a.i - b.i);
      expect(facts).toEqual([
        {i: 0, size: 7, fits: true},
        {i: 1, size: 7, fits: true},
      ]);
      cards.forEach((_, i) => {
        const c = m.placed[i]!;
        const band = fillsOf(m, i)[0]!;
        const runs = m
          .runsOf(i)
          .filter(
            (r) => Math.abs(r.size - 7) < 0.3 && runText(r).trim() !== '',
          );
        const last = Math.max(...runs.map((r) => runBox(r).y));
        expect(last).toBeLessThanOrEqual(c.y + 88 - 4 + 0.1);
        expect(Math.min(...runs.map((r) => runBox(r).y))).toBeGreaterThan(
          band.y1 + 2,
        );
      });
    },
    LIMIT,
  );
  it(
    'a body too long for the lower text area is cut or shrunk by the rules of US-002 (a band does not remove them)',
    async () => {
      const m = await makeSheet([
        card('skill', 'Huge', [SWORD], {blocks: words14(400).map(para)}),
      ]);
      const f = (m.facts as {size: number; fits: boolean}[])[0]!;
      expect(f.size).toBe(5.5);
      expect(f.fits).toBe(false);
    },
    LIMIT,
  );
});

describe('US-009 AC-9: a mixed deck', () => {
  it(
    'skill, spell and creature cards: bands on the first two only; every band inside its frame, the header inside its padding',
    async () => {
      const cards = [
        card('skill', 'Parry', [SWORD]),
        card('spell', 'Scorch Hex', [FIRE, SKULL]),
        creature(),
      ];
      const m = await makeSheet(cards);
      expect(m.diagnostics).toEqual([]);
      expect(fillsOf(m, 0)).toHaveLength(1);
      expect(fillsOf(m, 1)).toHaveLength(1);
      const sheetColours = [rgb('#f4d6b0'), rgb('#ffb4a2'), rgb('#e4f0a8')];
      for (const f of fillsOf(m, 2)) {
        expect(f.paint.kind).toBe('flat');
        if (f.paint.kind === 'flat')
          for (const col of sheetColours) expect(f.paint.rgb).not.toEqual(col);
      }
      expect(m.textOf(2)).toContain('Behaviour');
      [0, 1].forEach((i) => {
        const c = m.placed[i]!;
        const band = fillsOf(m, i)[0]!;
        expect(band.x0).toBeGreaterThanOrEqual(c.x - 0.1);
        expect(band.x1).toBeLessThanOrEqual(c.x + 62 + 0.1);
        expect(band.y0).toBeGreaterThanOrEqual(c.y - 0.1);
        for (const r of m.runsOf(i)) {
          const b = runBox(r);
          expect(b.x0).toBeGreaterThanOrEqual(c.x + 4 - 0.1);
          expect(b.x1).toBeLessThanOrEqual(c.x + 58 + 0.1);
        }
      });
    },
    LIMIT,
  );
});

describe('US-009 AC-10: the credit line', () => {
  const bandTop = 297 - 16.5;
  const creditText = (m: Sheet, page = 0) =>
    (m.pages[page] ?? [])
      .filter((r) => runBox(r).y >= bandTop - 0.1)
      .map(runText)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  it(
    'icons only: the credit once, 5 pt, centred, in the bottom band',
    async () => {
      const m = await makeSheet(
        [card('skill', 'Parry', [SWORD]), card('spell', 'Ember Spark', [FIRE])],
        DEFAULT_SHEET,
        undefined,
        {iconCredit: CREDIT},
      );
      expect(creditText(m)).toBe(CREDIT);
      const runs = m.pages[0]!.filter((r) => runBox(r).y >= bandTop - 0.1);
      for (const r of runs) near(r.size, 5, 0.05);
      const x0 = Math.min(...runs.map((r) => runBox(r).x0));
      const x1 = Math.max(...runs.map((r) => runBox(r).x1));
      near((x0 + x1) / 2, 105, 0.5);
    },
    LIMIT,
  );
  it(
    'with a creature credit on the same sheet: the creature credit first, a full stop added when it has none',
    async () => {
      const m = await makeSheet(
        [creature(), card('skill', 'Parry', [SWORD])],
        DEFAULT_SHEET,
        undefined,
        {iconCredit: CREDIT},
      );
      const first = FEN_HARE_WITH_CREDIT.credit!;
      expect(creditText(m)).toBe(
        `${first}${/[.!?]$/.test(first) ? '' : '.'} ${CREDIT}`,
      );
    },
    LIMIT,
  );
  it(
    'an empty credit, or no icon on the sheet: no line from the icons',
    async () => {
      const a = await makeSheet(
        [card('skill', 'Parry', [SWORD])],
        DEFAULT_SHEET,
        undefined,
        {
          iconCredit: '',
        },
      );
      expect(creditText(a)).toBe('');
      const b = await makeSheet(
        [card('skill', 'Plain', [])],
        DEFAULT_SHEET,
        undefined,
        {
          iconCredit: CREDIT,
        },
      );
      expect(creditText(b)).toBe('');
    },
    LIMIT,
  );
  it(
    'only the sheet that has an icon gets it: icon cards on page 2 only',
    async () => {
      const plain = Array.from({length: 9}, (_, i) =>
        card('skill', `P${i}`, []),
      );
      const m = await makeSheet(
        [...plain, card('skill', 'Parry', [SWORD])],
        DEFAULT_SHEET,
        undefined,
        {
          iconCredit: CREDIT,
        },
      );
      expect(creditText(m, 0)).toBe('');
      expect(creditText(m, 1)).toBe(CREDIT);
    },
    LIMIT,
  );
});

describe('US-009 AC-15: the bleed', () => {
  const cards6 = () =>
    Array.from({length: 6}, (_, i) =>
      card('skill', `S${i}`, [SWORD], {path: `skills/S${i}.md`}),
    );
  /** The expected box of the band of card `i` of `n` (3 per row), per the story. */
  const expected = (
    m: Sheet,
    i: number,
    n: number,
    bleed: number,
    gap: number,
  ) => {
    const c = m.placed[i]!;
    // the columns that fit depend on the gap (three at gap 0 to 2, two at gap 4)
    const columns = Math.max(...m.placed.map((p) => p.col)) + 1;
    const side = (has: boolean) => (has ? Math.min(bleed, gap / 2) : bleed);
    return {
      x0: c.x - side(c.col > 0),
      x1: c.x + 62 + side(c.col < columns - 1 && i + 1 < n),
      y0: c.y - side(c.row > 0),
    };
  };
  it.each([
    ['gap 0, bleed 0', 0, 0, true],
    ['gap 0, bleed 1', 0, 1, true],
    ['gap 1, bleed 1', 1, 1, true],
    ['gap 2, bleed 1', 2, 1, true],
    ['gap 0, bleed 3, cut marks off', 0, 3, false],
    ['gap 4, bleed 3, cut marks off', 4, 3, false],
  ])(
    '%s: every band reaches beyond its frame as the story says',
    async (_n, gap, bleed, cutMarks) => {
      const sheet = {...DEFAULT_SHEET, gap, bleed, cutMarks};
      const m = await makeSheet(cards6(), sheet);
      expect(m.diagnostics).toEqual([]);
      for (let i = 0; i < 6; i++) {
        const band = fillsOf(m, i)[0];
        if (band === undefined) throw new Error(`card ${i} has no band`);
        const e = expected(m, i, 6, bleed, gap);
        near(band.x0, e.x0, 0.06);
        near(band.x1, e.x1, 0.06);
        near(band.y0, e.y0, 0.06);
      }
    },
    LIMIT,
  );
  it(
    'a card with no neighbour to its right (the last of four) has the full bleed there',
    async () => {
      const sheet = {...DEFAULT_SHEET, gap: 0, bleed: 1};
      const m = await makeSheet(cards6().slice(0, 4), sheet);
      const band = fillsOf(m, 3)[0]!;
      near(band.x1, m.placed[3]!.x + 62 + 1, 0.06);
    },
    LIMIT,
  );
  it(
    'a gradient band is as wide as the extended band, not as the frame',
    async () => {
      const sheet = {...DEFAULT_SHEET, gap: 0, bleed: 1};
      const m = await makeSheet(
        [card('spell', 'Scorch Hex', [FIRE, SKULL])],
        sheet,
      );
      const band = fillsOf(m, 0)[0]!;
      if (band.paint.kind !== 'gradient') throw new Error('not a gradient');
      near(band.paint.axis.x0, band.x0, 0.06);
      near(band.paint.axis.x1, band.x1, 0.06);
      near(band.x0, m.placed[0]!.x - 1, 0.06);
    },
    LIMIT,
  );
  it(
    'the bottom of the band is not extended and the frame stays where it is',
    async () => {
      const plain = await makeSheet([card('skill', 'Parry', [SWORD])]);
      const bled = await makeSheet([card('skill', 'Parry', [SWORD])], {
        ...DEFAULT_SHEET,
        bleed: 1,
      });
      near(fillsOf(bled, 0)[0]!.y1, fillsOf(plain, 0)[0]!.y1, 0.06);
      expect(frameSeq(bled, 0)).toBeGreaterThan(fillsOf(bled, 0)[0]!.seq);
    },
    LIMIT,
  );
  it(
    'the bleed does not move the text: the header stays 4 mm inside the frame',
    async () => {
      const m = await makeSheet([card('skill', 'Parry', [SWORD])], {
        ...DEFAULT_SHEET,
        bleed: 1,
      });
      near(baseline(m, 0, 'Parry').x0, m.placed[0]!.x + 4, 0.15);
    },
    LIMIT,
  );
});

describe('US-009 AC-13: the same bytes from separate processes', () => {
  it(
    'two fresh processes, 1.1 s apart, write the same PDF for a deck with branches, icons and a credit',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gcc-scheme-'));
      try {
        const bundle = join(dir, 'cli.mjs');
        await build({
          entryPoints: ['tests/support/scheme-sheet-cli.ts'],
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
    LIMIT,
  );
});
