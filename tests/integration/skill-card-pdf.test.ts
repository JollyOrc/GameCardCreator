// US-002 AC-1, AC-2, AC-5, AC-6, AC-7, AC-9, AC-10, AC-11, AC-12 at the PDF
// level: skill cards are put on the sheet, compiled with the pinned Typst and
// read back (text, size, position, fit facts). Expected values come from the
// story. Red until ticket #3 (docs/technical/tests.md). Each compile takes
// about 0.1 to 0.5 s; limit 60 s per test (SCAR-030).
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_SHEET,
  placeCards,
  type SheetSettings,
} from '../../src/core/sheet/layout';
import {FIT_LABEL, fitWarnings} from '../../src/core/skill/fit';
import {readSkill, type Block, type SkillCard} from '../../src/core/skill/read';
import {skillSheetTypst} from '../../src/core/skill/sheet';
import {DEFAULT_SKILL, type SkillSettings} from '../../src/core/skill/settings';
import {runBox, runsIn, textOf, runText} from '../support/card-pdf';
import {openPdf} from '../support/pdf/reader';
import {pageRuns, type TextRun} from '../support/pdf/text';
import {readSheet} from '../support/pdf-sheet';
import {EXAMPLE_NOTE, inventedParagraphs} from '../support/skill-fixtures';
import {compileWithFacts} from '../support/typst-node';

const LIMIT = 60_000;
const para = (text: string): Block => ({kind: 'paragraph', runs: [{text}]});
const mk = (over: Partial<SkillCard> = {}): SkillCard => ({
  path: 'skills/Card.md',
  name: 'Card',
  tags: [],
  details: [],
  blocks: [],
  ...over,
});
const words = (n: number): Block[] => inventedParagraphs(n).map(para);

/** Compiles cards onto a sheet; returns the pages' runs and the fit facts. */
async function make(
  cards: SkillCard[],
  sheet: SheetSettings = DEFAULT_SHEET,
  skill: SkillSettings = DEFAULT_SKILL,
) {
  const typst = skillSheetTypst(cards, sheet, skill);
  if (!typst.ok) throw new Error(typst.message);
  const {pdf, facts} = await compileWithFacts(typst.source, FIT_LABEL);
  const placed = placeCards(cards.length, sheet);
  if (!placed.ok) throw new Error(placed.message);
  const pages = pageRuns(openPdf(pdf));
  const area = (c: {x: number; y: number}) => ({
    x: c.x,
    y: c.y,
    w: sheet.cardWidth,
    h: sheet.cardHeight,
  });
  /** The runs of card `i`. */
  const runsOf = (i: number): TextRun[] => {
    const c = placed.cards[i]!;
    return runsIn(pages[c.page] ?? [], area(c));
  };
  return {
    pdf,
    facts,
    pages,
    placed: placed.cards,
    runsOf,
    textOf: (i: number) => textOf(runsOf(i)),
  };
}

describe('US-002 AC-1, layout: the example note on a card', () => {
  const {card} = readSkill('skills/Reed Sweep.md', EXAMPLE_NOTE, DEFAULT_SKILL);
  it(
    'shows tags, title, row and description in order, without the image',
    async () => {
      const m = await make([card]);
      const text = m.textOf(0);
      const order = [
        'Field Craft · Melee',
        'Reed Sweep',
        'Time: action · Type: attack · Requires: Basket Knots',
        'You sweep a reed staff low. Spend a success to knock an adjacent enemy prone.',
        'Works only with a staff.',
        'Costs one stamina.',
      ].map((part) => text.indexOf(part));
      expect(
        order.every((i) => i >= 0),
        text,
      ).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(text).not.toContain('reed.png');
      expect(text).not.toContain('pics');
    },
    LIMIT,
  );

  it(
    'sizes follow the layout at 7 pt: tags 5.6, title 9.1, row 6.3, text 7',
    async () => {
      const m = await make([card]);
      const sizeOf = (part: string) =>
        m.runsOf(0).find((r) => runText(r).includes(part))?.size;
      expect(sizeOf('Field Craft')).toBeCloseTo(5.6, 2);
      expect(sizeOf('Reed Sweep')).toBeCloseTo(9.1, 2);
      expect(sizeOf('Time:')).toBeCloseTo(6.3, 2);
      expect(sizeOf('You sweep')).toBeCloseTo(7, 2);
    },
    LIMIT,
  );

  it(
    'the fit fact of the card: index 0, 7 pt, fits',
    async () => {
      const m = await make([card]);
      expect(m.facts).toEqual([{i: 0, size: 7, fits: true}]);
    },
    LIMIT,
  );
});

describe('US-002 AC-2: five tags wrap onto a second line', () => {
  it(
    'tag runs sit on at least two baselines',
    async () => {
      const tags = [
        'Alpha Bravo',
        'Charlie Delta',
        'Echo Foxtrot',
        'Golf Hotel',
        'India Juliet',
      ];
      const m = await make([mk({tags, blocks: [para('Text.')]})]);
      const tagRuns = m.runsOf(0).filter((r) => Math.abs(r.size - 5.6) < 0.01);
      expect(tagRuns.length).toBeGreaterThan(0);
      expect(
        new Set(tagRuns.map((r) => runBox(r).y.toFixed(1))).size,
      ).toBeGreaterThanOrEqual(2);
      for (const t of tags) expect(m.textOf(0)).toContain(t);
    },
    LIMIT,
  );
});

describe('US-002 AC-7: user text appears literally (rule 6)', () => {
  const specials = [
    '#',
    '$',
    '*',
    '_',
    '@',
    '<x>',
    '\\',
    '`',
    '//',
    '"',
    '[',
    ']',
    '#let x = 1',
    '@ref',
    '$x$',
    '*b*',
    '_i_',
    '<lbl>',
    '/* c */',
    '~',
    '%',
    '&',
    '{',
    '}',
    '; x',
  ];
  const starts = [
    '= x',
    '== x',
    '- x',
    '+ x',
    '/ x: y',
    '1. x',
    '> x',
    '--- x',
  ];
  type Where = 'title' | 'tag' | 'row' | 'paragraph' | 'bold' | 'list item';
  const place = (where: Where, text: string): SkillCard => {
    switch (where) {
      case 'title':
        return mk({name: text, blocks: [para('x')]});
      case 'tag':
        return mk({tags: [text], blocks: [para('x')]});
      case 'row':
        return mk({details: [{label: 'Time', value: text}]});
      case 'paragraph':
        return mk({blocks: [para(text)]});
      case 'bold':
        return mk({
          blocks: [
            {
              kind: 'paragraph',
              runs: [{text: 'a '}, {text, bold: true}, {text: ' b'}],
            },
          ],
        });
      case 'list item':
        return mk({
          blocks: [{kind: 'list', ordered: false, items: [[para(text)]]}],
        });
    }
  };
  const cases: {where: Where; text: string}[] = [];
  for (const where of [
    'title',
    'tag',
    'row',
    'paragraph',
    'bold',
    'list item',
  ] as Where[]) {
    for (const s of specials) cases.push({where, text: `a${s}b`});
  }
  for (const where of ['paragraph', 'list item', 'title'] as Where[]) {
    for (const s of starts) cases.push({where, text: s});
  }
  it(
    `${cases.length} cases compile and show their text literally`,
    async () => {
      const m = await make(cases.map((c) => place(c.where, c.text)));
      expect(m.placed).toHaveLength(cases.length); // every case was placed
      cases.forEach((c, i) => {
        const got = m.textOf(i);
        expect(got, `${c.where}: ${c.text}`).toContain(
          c.text.replace(/\s+/g, ' '),
        );
      });
    },
    LIMIT,
  );
  it(
    'a text that starts with = is not a heading: it keeps the text size',
    async () => {
      const m = await make([mk({blocks: [para('= not a heading')]})]);
      const run = m.runsOf(0).find((r) => runText(r).includes('not a heading'));
      expect(run?.size).toBeCloseTo(7, 2);
    },
    LIMIT,
  );
});

describe('US-002 AC-5: the size follows the amount of text', () => {
  const sizes: [number, number, boolean][] = [
    [40, 7, true],
    [115, 7, true],
    [140, 7, true],
    [160, 6.25, true],
    [200, 5.75, true],
    [250, 5.5, false],
  ];
  it(
    '40, 115, 140, 160, 200 and 250 words use 7, 7, 7, 6.25, 5.75 and 5.5 pt',
    async () => {
      const m = await make(
        sizes.map(([n]) => mk({name: `W${n}`, blocks: words(n)})),
      );
      expect(m.facts).toHaveLength(sizes.length); // one fact per card (SCAR-023)
      const byIndex = [...m.facts].sort(
        (a, b) => (a as {i: number}).i - (b as {i: number}).i,
      );
      sizes.forEach(([, size, fits], i) => {
        expect(byIndex[i]).toEqual({i, size, fits});
      });
    },
    LIMIT,
  );
  it(
    'the drawn description uses the size the fact reports',
    async () => {
      const m = await make([mk({blocks: words(160)})]);
      const desc = m
        .runsOf(0)
        .filter(
          (r) =>
            runText(r).includes('sweeping') || runText(r).includes('defender'),
        );
      expect(desc.length).toBeGreaterThan(0);
      for (const r of desc) expect(r.size).toBeCloseTo(6.25, 2);
    },
    LIMIT,
  );
});

describe('US-002 AC-6: overflow is cut and warned', () => {
  it(
    '400 words: smallest size, does not fit, one SKILL_TEXT_OVERFLOW',
    async () => {
      const cards = [
        mk({path: 'skills/Long.md', name: 'Long', blocks: words(400)}),
        mk({name: 'Short', blocks: words(40)}),
      ];
      const m = await make(cards);
      expect(m.facts).toEqual([
        {i: 0, size: 5.5, fits: false},
        {i: 1, size: 7, fits: true},
      ]);
      expect(fitWarnings(m.facts, cards)).toEqual([
        {code: 'SKILL_TEXT_OVERFLOW', path: 'skills/Long.md', detail: '5.5 pt'},
      ]);
      // the card is still made: its title and the first words are drawn
      expect(m.textOf(0)).toContain('Long');
      const first = inventedParagraphs(400)[0]!
        .split(' ')
        .slice(0, 4)
        .join(' ');
      expect(m.textOf(0)).toContain(first);
    },
    LIMIT,
  );
});

describe('US-002 AC-9: empty parts', () => {
  it(
    'no description, no properties, nothing but a title',
    async () => {
      const m = await make([
        mk({
          name: 'OnlyHead',
          tags: ['Melee'],
          details: [{label: 'Time', value: 'action'}],
        }),
        mk({name: 'OnlyText', blocks: [para('Just text.')]}),
        mk({name: 'Bare'}),
      ]);
      expect(m.textOf(0)).toBe('Melee OnlyHead Time: action');
      expect(m.textOf(1)).toBe('OnlyText Just text.');
      expect(m.textOf(2)).toBe('Bare');
      expect(m.facts).toHaveLength(3);
    },
    LIMIT,
  );
});

describe('US-002 AC-10: sizes at non-default settings', () => {
  const custom: SkillSettings = {
    ...DEFAULT_SKILL,
    maxSize: 5.5,
    minSize: 4,
    sizeStep: 1,
  };
  it(
    'largest 5.5, smallest 4, step 1: a short text 5.5, a long one 4 and not fitting',
    async () => {
      const m = await make(
        [mk({blocks: words(20)}), mk({blocks: words(400)})],
        DEFAULT_SHEET,
        custom,
      );
      expect(m.facts).toEqual([
        {i: 0, size: 5.5, fits: true},
        {i: 1, size: 4, fits: false},
      ]);
    },
    LIMIT,
  );
});

describe('US-002 AC-12: ten skill cards on the sheet (composed with US-001)', () => {
  const cards = Array.from({length: 10}, (_, i) =>
    mk({
      name: `Skill ${i + 1}`,
      tags: ['FieldCraft', 'Melee'].map((t) =>
        t.replace(/([a-z])([A-Z])/, '$1 $2'),
      ),
      details: [{label: 'Time', value: 'action'}],
      blocks: [
        para('One short sentence for the card.'),
        {kind: 'rule'},
        para('Another one.'),
      ],
    }),
  );
  it(
    'two pages of 9 and 1; frames, marks and rules as drawn',
    async () => {
      const m = await make(cards);
      const sheet = readSheet(m.pdf);
      expect(sheet).toHaveLength(2);
      expect(sheet.map((p) => p.frames.length)).toEqual([9, 1]);
      // 16 cut marks, one rule under the title of each card, one rule block per card
      expect(sheet.map((p) => p.lines.length)).toEqual([
        16 + 9 * 2,
        16 + 1 * 2,
      ]);
    },
    LIMIT,
  );
  it(
    'every run of every card lies inside its text area (4 mm padding), to 0.1 mm',
    async () => {
      const m = await make(cards);
      let checked = 0;
      cards.forEach((_, i) => {
        const c = m.placed[i]!;
        const runs = m.runsOf(i);
        expect(runs.length).toBeGreaterThan(0); // SCAR-023: the check ran
        for (const r of runs) {
          const b = runBox(r);
          expect(b.x0).toBeGreaterThanOrEqual(c.x + 4 - 0.1);
          expect(b.x1).toBeLessThanOrEqual(c.x + 62 - 4 + 0.1);
          expect(b.y).toBeGreaterThanOrEqual(c.y + 4 - 0.1);
          expect(b.y).toBeLessThanOrEqual(c.y + 88 - 4 + 0.1);
          checked++;
        }
      });
      expect(checked).toBeGreaterThanOrEqual(10 * 4); // tags, title, row, text at least
    },
    LIMIT,
  );
  it(
    'each card shows its own title',
    async () => {
      const m = await make(cards);
      cards.forEach((c, i) => expect(m.textOf(i)).toContain(c.name));
    },
    LIMIT,
  );
});

describe('US-002 AC-11: byte-identical PDF from separate processes', () => {
  it(
    'two fresh processes, 1.1 s apart, write the same bytes',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gcc-'));
      try {
        const bundle = join(dir, 'cli.mjs');
        await build({
          entryPoints: ['tests/support/skill-sheet-cli.ts'],
          bundle: true,
          platform: 'node',
          format: 'esm',
          outfile: bundle,
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
