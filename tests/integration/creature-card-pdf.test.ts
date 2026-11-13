// US-004 AC-1, AC-4 to AC-9, AC-12 at the PDF level: creature cards on the sheet,
// compiled with the pinned Typst and read back (text, size, position, fit facts).
// The statblock is the REAL 0.15.1 answer (fixtures, SCAR-023). Expected values
// come from the story. Where the story's numbers were measured with the spike's
// statblock (AC-5), these tests state the owner's rule as invariants that hold
// for any statblock height; the story's exact triples are re-measured at the
// code ticket against this fixture (not claimed here). Red until the code ticket.
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {readCreature, type CreatureCard} from '../../src/core/creature/read';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {fitWarnings} from '../../src/core/skill/fit';
import type {Block, SkillCard} from '../../src/core/skill/read';
import {runBox, runText} from '../support/card-pdf';
import {makeSheet} from '../support/card-sheet';
import {
  CREDIT_TEXT,
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_ANSWER,
  FEN_HARE_WITH_CREDIT,
  LITERAL_ANSWER,
  REFUSED,
  words14,
  type StatblockAnswer,
} from '../support/creature-fixtures';

const LIMIT = 120_000;
const para = (text: string): Block => ({kind: 'paragraph', runs: [{text}]});
const section = (n: number): Block[] => (n === 0 ? [] : words14(n).map(para));

/** The example creature with the real answer attached; sections replaceable. */
function creature(
  over: Partial<CreatureCard> = {},
  statblock: StatblockAnswer = FEN_HARE_ANSWER,
): CreatureCard {
  const {card} = readCreature(
    'creatures/Fen Hare.md',
    EXAMPLE_CREATURE_NOTE,
    DEFAULT_CREATURE,
  );
  return {...card, statblock: statblock.ok ? statblock : null, ...over};
}
const sized = (
  signs: number,
  instincts: number,
  actions: number,
  path = 'creatures/Fen Hare.md',
) =>
  creature({
    path,
    signs: section(signs),
    instincts: section(instincts),
    actions: section(actions),
  });
const skill = (): SkillCard => ({
  kind: 'skill',
  path: 'skills/Reed Sweep.md',
  name: 'Reed Sweep',
  tags: ['Field Craft'],
  details: [{label: 'Time', value: 'action'}],
  blocks: [para('One short sentence.')],
});
const spell = (): SkillCard => ({
  kind: 'spell',
  path: 'spells/Reed Whisper.md',
  name: 'Reed Whisper',
  tags: ['Wizardry'],
  details: [],
  blocks: [para('One short sentence.')],
});
type Fact = {i: number; size: number; fits: boolean; dropped: string[]};
const factsOf = (m: {facts: unknown[]}): Fact[] =>
  [...(m.facts as Fact[])].sort((a, b) => a.i - b.i);

describe('US-004 AC-1, AC-3: the example creature on a card', () => {
  const card = creature();
  it(
    'shows the statblock, then Behaviour, Actions and Signs with their headings; not the lead paragraph',
    async () => {
      const m = await makeSheet([card]);
      expect(m.diagnostics).toEqual([]);
      const text = m.textOf(0);
      const order = [
        'Fen Hare', // the band of the statblock
        'Kick',
        'Bite',
        'Quick Step',
        'Behaviour',
        'flee at the first sound',
        'Actions',
        'sprint: 12 squares over two Actions',
        'Signs',
        'Flattened reeds in a ring.',
      ].map((part) => text.indexOf(part));
      expect(
        order.every((i) => i >= 0),
        text,
      ).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(text).not.toContain('quick and shy');
    },
    LIMIT,
  );
  it(
    'the example fits at 7 pt with nothing dropped; no warning',
    async () => {
      const m = await makeSheet([card]);
      expect(factsOf(m)).toEqual([{i: 0, size: 7, fits: true, dropped: []}]);
      expect(fitWarnings(m.facts, [card])).toEqual([]);
    },
    LIMIT,
  );
});

describe('US-004 AC-4: the statblock scales with the text size', () => {
  const bandSize = async (size: number) => {
    const m = await makeSheet([creature()], DEFAULT_SHEET, {
      maxSize: size,
      minSize: size,
      sizeStep: 0.25,
    });
    // the band is the one run of the statblock that says the creature's name
    const run = m.runsOf(0).find((r) => runText(r).includes('Fen Hare'));
    expect(run, m.textOf(0)).toBeDefined();
    return run!.size;
  };
  it(
    'the band is 11.5 pt at 7 pt text (factor 1), 9.04 pt at 5.5 pt (5.5 / 7), 16.43 pt at 10 pt (10 / 7)',
    async () => {
      expect(await bandSize(7)).toBeCloseTo(11.5, 1);
      expect(await bandSize(5.5)).toBeCloseTo((11.5 * 5.5) / 7, 1);
      expect(await bandSize(10)).toBeCloseTo((11.5 * 10) / 7, 1);
    },
    LIMIT,
  );
  it("the answer's data text is used as given, not edited (the card binds it)", () => {
    const r = cardSheetTypst([creature()], DEFAULT_SHEET, {
      maxSize: 7,
      minSize: 5.5,
      sizeStep: 0.25,
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.source).toContain(FEN_HARE_ANSWER.data);
    expect(r.files.map((f) => f.path)).toEqual(
      FEN_HARE_ANSWER.files.map((f) => f.path),
    );
  });
});

describe("US-004 AC-5: drop first, then shrink (the owner's rule, as invariants)", () => {
  it(
    'a scan of 0 to 160 words in Signs (Instincts 25, Actions 25): the dropped parts are a prefix of Signs, Instincts, Skills; below 7 pt only when all three are dropped; the size never grows',
    async () => {
      const counts = Array.from({length: 17}, (_, i) => i * 10);
      const cards = counts.map((n, i) =>
        sized(n, 25, 25, `creatures/C${i}.md`),
      );
      const m = await makeSheet(cards);
      expect(m.diagnostics).toEqual([]);
      const facts = factsOf(m);
      expect(facts).toHaveLength(cards.length); // one fact per card (SCAR-023)
      const order = ['Signs', 'Instincts', 'Skills'];
      facts.forEach((f, k) => {
        expect(f.i).toBe(k);
        // a prefix of the order: nothing is dropped before what ranks lower
        expect(f.dropped, `${counts[k]} words`).toEqual(
          order.slice(0, f.dropped.length),
        );
        if (f.size < 7) expect(f.dropped, `${counts[k]} words`).toEqual(order);
        if (k > 0) {
          expect(f.dropped.length).toBeGreaterThanOrEqual(
            facts[k - 1]!.dropped.length,
          );
          expect(f.size).toBeLessThanOrEqual(facts[k - 1]!.size);
        }
      });
      expect(facts[0]!.dropped).toEqual([]);
      expect(facts.at(-1)!.dropped.length).toBeGreaterThan(0);
    },
    LIMIT,
  );
  it(
    'a scan of 0 to 400 words of Actions: sizes never grow, overflow only at the smallest size and only at the top, Actions is never dropped',
    async () => {
      const counts = Array.from({length: 21}, (_, i) => i * 20);
      const cards = counts.map((n, i) =>
        sized(15, 15, n, `creatures/D${i}.md`),
      );
      const m = await makeSheet(cards);
      const facts = factsOf(m);
      expect(facts).toHaveLength(cards.length);
      for (let k = 1; k < facts.length; k++) {
        expect(facts[k]!.size, `${counts[k]} words`).toBeLessThanOrEqual(
          facts[k - 1]!.size,
        );
      }
      const first = facts.findIndex((f) => !f.fits);
      expect(first).toBeGreaterThan(0);
      for (let k = first; k < facts.length; k++) {
        expect(facts[k]!.fits).toBe(false);
        expect(facts[k]!.size).toBe(5.5);
      }
      for (const f of facts) expect(f.dropped).not.toContain('Actions');
      // the text of the biggest card still has its Actions heading (cut, not dropped)
      expect(m.textOf(cards.length - 1)).toContain('Actions');
    },
    LIMIT,
  );
  it(
    'a creature that cannot fit is made at 5.5 pt with all droppable parts dropped and warned: CREATURE_PART_DROPPED for Instincts and Skills, then CREATURE_TEXT_OVERFLOW',
    async () => {
      const cards = [sized(40, 60, 300, 'creatures/Huge.md')];
      const m = await makeSheet(cards);
      expect(factsOf(m)).toEqual([
        {
          i: 0,
          size: 5.5,
          fits: false,
          dropped: ['Signs', 'Instincts', 'Skills'],
        },
      ]);
      expect(fitWarnings(m.facts, cards)).toEqual([
        {
          code: 'CREATURE_PART_DROPPED',
          path: 'creatures/Huge.md',
          detail: 'Instincts',
        },
        {
          code: 'CREATURE_PART_DROPPED',
          path: 'creatures/Huge.md',
          detail: 'Skills',
        },
        {
          code: 'CREATURE_TEXT_OVERFLOW',
          path: 'creatures/Huge.md',
          detail: '5.5 pt',
        },
      ]);
    },
    LIMIT,
  );
  it(
    'a dropped part is gone from the card: no Signs text, no Instincts text, no Skills line',
    async () => {
      const cards = [sized(40, 60, 300, 'creatures/Huge.md')];
      const m = await makeSheet(cards);
      const text = m.textOf(0);
      expect(text).not.toContain('Signs');
      expect(text).not.toContain('Behaviour');
      expect(text).not.toContain('Quick Step'); // the statblock's Skills line
      expect(text).toContain('Kick'); // the statblock itself stays
      expect(text).toContain('Actions');
    },
    LIMIT,
  );
  it(
    'a creature without a Signs section and without skills reports nothing dropped that it never had',
    async () => {
      const card = creature({
        signs: [],
        instincts: section(150),
        actions: section(120),
      });
      const m = await makeSheet([card]);
      const f = factsOf(m)[0]!;
      expect(f.dropped).not.toContain('Signs');
    },
    LIMIT,
  );
});

describe("US-004 AC-5: the story's triples, measured again at ticket #24 against the real answer (2026-11-13)", () => {
  // (Signs, Instincts, Actions words) -> size, fits, dropped. Scope: this layout,
  // this fixture statblock (with a Skills line), invented words, default sizes.
  const triples: [[number, number, number], number, boolean, string[]][] = [
    [[0, 30, 40], 7, true, ['Instincts']],
    [[20, 25, 25], 7, true, ['Signs']],
    [[25, 40, 60], 6.75, true, ['Signs', 'Instincts', 'Skills']],
    [[25, 40, 100], 6, true, ['Signs', 'Instincts', 'Skills']],
    [[30, 60, 150], 5.5, false, ['Signs', 'Instincts', 'Skills']],
  ];
  it(
    "the five triples give the story's size and dropped parts",
    async () => {
      const m = await makeSheet(
        triples.map(([w], k) =>
          sized(w[0]!, w[1]!, w[2]!, `creatures/T${k}.md`),
        ),
      );
      const facts = factsOf(m);
      expect(facts).toHaveLength(triples.length);
      triples.forEach(([w, size, fits, dropped], k) => {
        expect(facts[k], JSON.stringify(w)).toEqual({
          i: k,
          size,
          fits,
          dropped,
        });
      });
    },
    LIMIT,
  );
  it("two creature cards share one copy of the answer's definitions", () => {
    const r = cardSheetTypst(
      [creature(), creature({path: 'creatures/B.md'})],
      DEFAULT_SHEET,
      {maxSize: 7, minSize: 5.5, sizeStep: 0.25},
    );
    if (!r.ok) throw new Error(r.message);
    expect(r.source.split(FEN_HARE_ANSWER.prelude).length - 1).toBe(1);
    expect(r.source.split(FEN_HARE_ANSWER.data).length - 1).toBe(2);
    expect(r.files.map((f) => f.path)).toEqual([
      'o2t-icons/1.svg',
      'o2t-icons/2.svg',
      'o2t-icons/3.svg',
      'o2t-icons/5.svg',
    ]);
  });
});

describe('US-004 AC-11 (D2): a card without a statblock', () => {
  it(
    'is the title and the sections, fitted without the statblock; no prelude, no icon file',
    async () => {
      const card = creature({}, REFUSED);
      expect(card.statblock).toBeNull();
      const r = cardSheetTypst([card], DEFAULT_SHEET, {
        maxSize: 7,
        minSize: 5.5,
        sizeStep: 0.25,
      });
      if (!r.ok) throw new Error(r.message);
      expect(r.source).not.toContain('o2t-sb-box');
      expect(r.files).toEqual([]);
      const m = await makeSheet([card]);
      const text = m.textOf(0);
      expect(text).toContain('Fen Hare');
      expect(text).toContain('Behaviour');
      expect(text).toContain('sprint: 12 squares over two Actions');
      expect(factsOf(m)[0]).toEqual({i: 0, size: 7, fits: true, dropped: []});
    },
    LIMIT,
  );
  it(
    'without a statblock there is no Skills step: only Signs and Instincts can be dropped',
    async () => {
      const card = creature(
        {signs: section(60), instincts: section(80), actions: section(330)},
        REFUSED,
      );
      const m = await makeSheet([card]);
      const f = factsOf(m)[0]!;
      expect(f.dropped).not.toContain('Skills');
    },
    LIMIT,
  );
});

describe("US-004 AC-6: statblock values are the API's own escaping; section text is literal", () => {
  it(
    "the API's measured attacks show their text: bold Bite, a#b $c, = x, Kick (tag dropped), a link as its text",
    async () => {
      const card = creature({}, LITERAL_ANSWER);
      const m = await makeSheet([card]);
      expect(m.diagnostics).toEqual([]);
      const text = m.textOf(0);
      for (const part of [
        'Kick',
        'Bite',
        'a#b $c',
        '= x',
        'Whisper',
        '1d4',
        '2d6',
      ]) {
        expect(text, part).toContain(part);
      }
      const bite = m.runsOf(0).find((r) => runText(r).trim() === 'Bite');
      expect(bite, 'Bite as its own run').toBeDefined();
    },
    LIMIT,
  );
  it(
    'special characters in a section and in the title appear literally',
    async () => {
      const specials = [
        '#let x = 1',
        '$x$',
        '@ref',
        '*',
        '_',
        '<x>',
        '`',
        '//',
        '= x',
        '- x',
      ];
      const cards = specials.map((s, i) =>
        creature({
          path: `creatures/S${i}.md`,
          name: `a${s}b`,
          actions: [para(`a${s}b`)],
          instincts: [],
          signs: [],
        }),
      );
      const m = await makeSheet(cards);
      expect(m.diagnostics).toEqual([]);
      specials.forEach((s, i) => {
        expect(m.textOf(i), s).toContain(`a${s}b`.replace(/\s+/g, ' '));
      });
    },
    LIMIT,
  );
});

describe('US-004 AC-7: creature, skill and spell cards on one sheet', () => {
  const cards = [
    creature(),
    skill(),
    spell(),
    creature({path: 'creatures/Two.md', name: 'Two'}),
  ];
  it(
    'each card sits in its slot, in the given order, with its own content',
    async () => {
      const m = await makeSheet(cards);
      expect(m.textOf(0)).toContain('Behaviour');
      expect(m.textOf(1)).toContain('Time: action');
      expect(m.textOf(2)).toContain('Reed Whisper');
      expect(m.textOf(2)).not.toContain('Behaviour');
      // the band of a statblock is the API's (the fixture's answer says Fen Hare)
      expect(m.textOf(3)).toContain('Fen Hare');
      expect(m.textOf(3)).toContain('Behaviour');
    },
    LIMIT,
  );
  it(
    'every run of every card lies inside its text area (4 mm padding), to 0.1 mm',
    async () => {
      const m = await makeSheet(cards);
      let checked = 0;
      cards.forEach((_, i) => {
        const c = m.placed[i]!;
        expect(m.runsOf(i).length).toBeGreaterThan(0);
        for (const r of m.runsOf(i)) {
          const b = runBox(r);
          expect(b.x0).toBeGreaterThanOrEqual(c.x + 4 - 0.1);
          expect(b.x1).toBeLessThanOrEqual(c.x + 62 - 4 + 0.1);
          expect(b.y).toBeGreaterThanOrEqual(c.y + 4 - 0.1);
          expect(b.y).toBeLessThanOrEqual(c.y + 88 - 4 + 0.1);
          checked++;
        }
      });
      expect(checked).toBeGreaterThanOrEqual(cards.length * 5);
    },
    LIMIT,
  );
});

describe('US-004 AC-9: the credit', () => {
  /** Runs of one page at 5 pt below the last card row (the bottom margin band). */
  const creditRuns = (
    m: Awaited<ReturnType<typeof makeSheet>>,
    page: number,
  ) => {
    const bandTop = 297 - 16.5;
    return (m.pages[page] ?? []).filter((r) => {
      const b = runBox(r);
      return b.y >= bandTop - 0.1;
    });
  };
  const ten = (at: number, answer = FEN_HARE_WITH_CREDIT) =>
    Array.from({length: 10}, (_, i) =>
      i === at ? creature({}, answer) : i % 2 === 0 ? skill() : spell(),
    );
  it(
    'a sheet with a creature card prints the credit once, 5 pt, centred, inside the bottom margin band',
    async () => {
      const m = await makeSheet(ten(0));
      const runs = creditRuns(m, 0);
      expect(runs.length).toBeGreaterThan(0);
      const text = runs.map(runText).join('').replace(/\s+/g, ' ').trim();
      expect(text).toBe(CREDIT_TEXT);
      for (const r of runs) {
        expect(r.size).toBeCloseTo(5, 2);
        const b = runBox(r);
        expect(b.y).toBeLessThanOrEqual(297 + 0.1);
        expect(b.y).toBeGreaterThanOrEqual(297 - 16.5 - 0.1);
      }
      const x0 = Math.min(...runs.map((r) => runBox(r).x0));
      const x1 = Math.max(...runs.map((r) => runBox(r).x1));
      expect((x0 + x1) / 2).toBeCloseTo(105, 0);
    },
    LIMIT,
  );
  it(
    'only the sheet (page) that has a creature card gets it: creature on page 1 only, or page 2 only',
    async () => {
      const first = await makeSheet(ten(0));
      expect(creditRuns(first, 0).length).toBeGreaterThan(0);
      expect(creditRuns(first, 1)).toEqual([]);
      const last = await makeSheet(ten(9));
      expect(creditRuns(last, 0)).toEqual([]);
      expect(creditRuns(last, 1).length).toBeGreaterThan(0);
    },
    LIMIT,
  );
  it(
    'several creature cards on a page share one credit line; a sheet without a creature card has none',
    async () => {
      const many = await makeSheet(
        [creature(), creature({path: 'creatures/B.md'}), skill()].map((c) =>
          'statblock' in c ? {...c, statblock: FEN_HARE_WITH_CREDIT} : c,
        ),
      );
      const text = creditRuns(many, 0)
        .map(runText)
        .join('')
        .replace(/\s+/g, ' ');
      expect(text.split(CREDIT_TEXT).length - 1).toBe(1);
      const none = await makeSheet([skill(), spell()]);
      expect(creditRuns(none, 0)).toEqual([]);
    },
    LIMIT,
  );
  it(
    'null or an empty credit: no line',
    async () => {
      const a = await makeSheet([creature()]); // the real answer has credit null
      expect(creditRuns(a, 0)).toEqual([]);
      const b = await makeSheet([
        creature({}, {...FEN_HARE_ANSWER, credit: ''}),
      ]);
      expect(creditRuns(b, 0)).toEqual([]);
    },
    LIMIT,
  );
  it(
    'a very long credit is at most two lines and stays inside the band; it covers no card',
    async () => {
      const long = {
        ...FEN_HARE_ANSWER,
        credit: `${CREDIT_TEXT}; `.repeat(12).trim(),
      };
      const m = await makeSheet(ten(0, long));
      const runs = creditRuns(m, 0);
      const baselines = new Set(runs.map((r) => Math.round(runBox(r).y * 10)));
      expect(baselines.size).toBeGreaterThan(0);
      expect(baselines.size).toBeLessThanOrEqual(2);
      for (const r of runs) {
        const b = runBox(r);
        expect(b.y).toBeLessThanOrEqual(297 + 0.1);
        expect(b.x0).toBeGreaterThanOrEqual(10 - 0.1);
        expect(b.x1).toBeLessThanOrEqual(200 + 0.1);
      }
      // no card frame reaches into the band
      const sheet = m.placed.filter((c) => c.page === 0);
      for (const c of sheet)
        expect(c.y + 88).toBeLessThanOrEqual(297 - 16.5 + 0.1);
    },
    LIMIT,
  );
  it(
    "the credit is not on the cards: no card's text holds it",
    async () => {
      const m = await makeSheet(ten(0));
      for (let i = 0; i < 10; i++) expect(m.textOf(i)).not.toContain('CC BY');
    },
    LIMIT,
  );
});

describe('US-004 AC-9 (amended 2026-11-13, ticket #27): a band with no room for the credit', () => {
  const sizes = {maxSize: 7, minSize: 5.5, sizeStep: 0.25};
  // three rows of 98 mm cards with a 1 mm margin: the block is 294 mm high, the band 1.5 mm
  const tall = {...DEFAULT_SHEET, cardHeight: 98, margin: 1};
  const make = (sheet: typeof DEFAULT_SHEET, answer = FEN_HARE_WITH_CREDIT) => {
    const r = cardSheetTypst([creature({}, answer)], sheet, sizes);
    if (!r.ok) throw new Error(r.message);
    return r;
  };
  it('a band under 3 mm: no credit in the source, the band height reported', () => {
    const r = make(tall);
    expect(r.creditOmitted).toBe(1.5);
    expect(r.source).not.toContain('gcc-credit("'); // the call; the definition stays
    expect(r.source).not.toContain(CREDIT_TEXT);
  });
  it('the default sheet (band 16.5 mm) prints it and reports nothing', () => {
    const r = make(DEFAULT_SHEET);
    expect(r.creditOmitted).toBeNull();
    expect(r.source).toContain(CREDIT_TEXT);
  });
  it('the height is reported to one decimal', () => {
    // 3 rows of 98.27 mm: block 294.81 mm, band 1.095 mm
    const r = make({...DEFAULT_SHEET, cardHeight: 98.27, margin: 1});
    expect(r.creditOmitted).toBe(1.1);
  });
  it('no credit to print, no report, even with a narrow band (null and an empty text)', () => {
    expect(make(tall, FEN_HARE_ANSWER).creditOmitted).toBeNull();
    expect(
      make(tall, {...FEN_HARE_ANSWER, credit: '  '}).creditOmitted,
    ).toBeNull();
  });
  it('a band of exactly 3 mm prints the line (the limit is inclusive)', () => {
    // 3 rows of 97 mm: 291 mm, band 3 mm
    const r = make({...DEFAULT_SHEET, cardHeight: 97, margin: 1});
    expect(r.creditOmitted).toBeNull();
    expect(r.source).toContain(CREDIT_TEXT);
  });
});

describe("US-004 AC-12: icons come from the answer's files", () => {
  it(
    'the card compiles with the files at their paths and without a compiler warning',
    async () => {
      const m = await makeSheet([creature()]);
      expect(m.diagnostics).toEqual([]);
      expect(m.pdf.length).toBeGreaterThan(1000);
    },
    LIMIT,
  );
});

describe('US-004 AC-8: byte-identical PDF from separate processes', () => {
  it(
    'two fresh processes, 1.1 s apart, write the same bytes for a deck with creature cards',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gcc-'));
      try {
        const bundle = join(dir, 'cli.mjs');
        await build({
          entryPoints: ['tests/support/creature-sheet-cli.ts'],
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
