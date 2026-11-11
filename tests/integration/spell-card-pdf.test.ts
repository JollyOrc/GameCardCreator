// US-003 AC-1, AC-5 to AC-9 at the PDF level: spell cards, alone and mixed
// with skill cards, on the sheet; compiled with the pinned Typst and read back
// (text, size, position, fit facts). Expected values come from the story.
// Red until the code ticket. Each compile takes 0.1 to 0.5 s; limit 60 s.
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {describe, expect, it} from 'vitest';
import {fitWarnings} from '../../src/core/skill/fit';
import type {Block, SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SIZES} from '../../src/core/skill/settings';
import {readSpell} from '../../src/core/spell/read';
import {DEFAULT_SPELL} from '../../src/core/spell/settings';
import {runBox, runText} from '../support/card-pdf';
import {makeSheet} from '../support/card-sheet';
import {readSheet} from '../support/pdf-sheet';
import {inventedParagraphs} from '../support/skill-fixtures';
import {EXAMPLE_SPELL_NOTE} from '../support/spell-fixtures';

const LIMIT = 60_000;
const para = (text: string): Block => ({kind: 'paragraph', runs: [{text}]});
const words = (n: number): Block[] => inventedParagraphs(n).map(para);

/** A spell card shaped like the measured one: two tags, title, no row. */
const spell = (over: Partial<SkillCard> = {}): SkillCard => ({
  kind: 'spell',
  path: 'spells/Reed Whisper.md',
  name: 'Reed Whisper',
  tags: ['Wizardry', 'Elemental Magic'],
  details: [],
  blocks: [],
  ...over,
});
/** A skill card with a details row, for the mixed sheet. */
const skill = (over: Partial<SkillCard> = {}): SkillCard => ({
  kind: 'skill',
  path: 'skills/Reed Sweep.md',
  name: 'Reed Sweep',
  tags: ['Field Craft', 'Melee'],
  details: [{label: 'Time', value: 'action'}],
  blocks: [],
  ...over,
});

describe('US-003 AC-1: the example spell on a card', () => {
  const {card} = readSpell(
    'spells/Reed Whisper.md',
    EXAMPLE_SPELL_NOTE,
    DEFAULT_SPELL,
  );
  it(
    'shows tags, title, description in order; no details row',
    async () => {
      const m = await makeSheet([card]);
      const text = m.textOf(0);
      const order = [
        'Wizardry · Elemental Magic',
        'Reed Whisper',
        'A thin breeze carries your voice to one listener within sight.',
        'if they know this spell.',
      ].map((part) => text.indexOf(part));
      expect(
        order.every((i) => i >= 0),
        text,
      ).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(text).not.toContain('Time:');
      expect(text).not.toContain('Type:');
    },
    LIMIT,
  );
  it(
    'sizes at 7 pt: tags 5.6, title 9.1, text 7; the fit fact',
    async () => {
      const m = await makeSheet([card]);
      const sizeOf = (part: string) =>
        m.runsOf(0).find((r) => runText(r).includes(part))?.size;
      expect(sizeOf('Wizardry')).toBeCloseTo(5.6, 2);
      expect(sizeOf('Reed Whisper')).toBeCloseTo(9.1, 2);
      expect(
        m.runsOf(0).find((r) => runText(r).trim() === 'A')?.size,
      ).toBeCloseTo(7, 2);
      expect(m.facts).toEqual([{i: 0, size: 7, fits: true}]);
    },
    LIMIT,
  );
});

describe('US-003 AC-5: the size follows the amount of text', () => {
  const cases: [number, number, boolean][] = [
    [40, 7, true],
    [80, 7, true],
    [120, 7, true],
    [150, 6.75, true],
    [174, 6.25, true],
    [200, 6, true],
    [230, 5.5, false],
  ];
  it(
    '40, 80, 120, 150, 174, 200 and 230 words use 7, 7, 7, 6.75, 6.25, 6 and 5.5 pt',
    async () => {
      const m = await makeSheet(cases.map(([n]) => spell({blocks: words(n)})));
      expect(m.facts).toHaveLength(cases.length); // one fact per card (SCAR-023)
      const sorted = [...m.facts].sort(
        (a, b) => (a as {i: number}).i - (b as {i: number}).i,
      );
      cases.forEach(([, size, fits], i) =>
        expect(sorted[i]).toEqual({i, size, fits}),
      );
    },
    LIMIT,
  );
  it(
    '230 words are made at 5.5 pt and warned as SPELL_TEXT_OVERFLOW',
    async () => {
      const cards = [spell({path: 'spells/Long.md', blocks: words(230)})];
      const m = await makeSheet(cards);
      expect(fitWarnings(m.facts, cards)).toEqual([
        {code: 'SPELL_TEXT_OVERFLOW', path: 'spells/Long.md', detail: '5.5 pt'},
      ]);
    },
    LIMIT,
  );
});

describe('US-003 AC-5: the fit loop is stable for spells (SCAR-021)', () => {
  it(
    '0 to 400 words in steps of 10: sizes never grow, overflow only at the top, no compiler warning',
    async () => {
      const counts = Array.from({length: 41}, (_, i) => i * 10);
      const m = await makeSheet(
        counts.map((n) => spell({blocks: n === 0 ? [] : words(n)})),
      );
      expect(m.facts).toHaveLength(41);
      expect(m.diagnostics).toEqual([]);
      const facts = [...m.facts].sort(
        (a, b) => (a as {i: number}).i - (b as {i: number}).i,
      ) as {i: number; size: number; fits: boolean}[];
      facts.forEach((f, k) => expect(f.i).toBe(k));
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
    },
    LIMIT,
  );
});

describe('US-003 AC-6: one set of sizes for both kinds', () => {
  it(
    'largest 6, smallest 5, step 0.5: a 20-word skill and a 20-word spell are both made at 6 pt',
    async () => {
      const m = await makeSheet(
        [skill({blocks: words(20)}), spell({blocks: words(20)})],
        undefined,
        {maxSize: 6, minSize: 5, sizeStep: 0.5},
      );
      expect(m.facts).toEqual([
        {i: 0, size: 6, fits: true},
        {i: 1, size: 6, fits: true},
      ]);
    },
    LIMIT,
  );
  it(
    'the defaults are those of DEFAULT_SIZES',
    async () => {
      const m = await makeSheet(
        [spell({blocks: words(20)})],
        undefined,
        DEFAULT_SIZES,
      );
      expect(m.facts).toEqual([{i: 0, size: 7, fits: true}]);
    },
    LIMIT,
  );
});

describe('US-003 AC-7: skills and spells on one sheet', () => {
  const kinds = [
    'skill',
    'spell',
    'spell',
    'skill',
    'spell',
    'spell',
    'skill',
    'spell',
    'spell',
    'spell',
  ] as const;
  const cards = kinds.map((k, i) =>
    (k === 'skill' ? skill : spell)({
      path: `${k}s/Card ${i + 1}.md`,
      name: `Card ${i + 1}`,
      blocks: [para('One short sentence for the card.'), para('Another one.')],
    }),
  );
  it(
    'two pages of 9 and 1, frames and cut marks as in US-001',
    async () => {
      const m = await makeSheet(cards);
      const sheet = readSheet(m.pdf);
      expect(sheet.map((p) => p.frames.length)).toEqual([9, 1]);
      expect(sheet.map((p) => p.lines.length)).toEqual([16 + 9, 16 + 1]); // marks + one rule per card
      expect(m.diagnostics).toEqual([]);
    },
    LIMIT,
  );
  it(
    "each card sits in its slot, in the given order, with its own kind's content",
    async () => {
      const m = await makeSheet(cards);
      kinds.forEach((k, i) => {
        const text = m.textOf(i);
        expect(text, `card ${i}`).toContain(`Card ${i + 1}`);
        if (k === 'skill') expect(text).toContain('Time: action');
        else expect(text).not.toContain('Time:');
      });
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
      expect(checked).toBeGreaterThanOrEqual(10 * 3);
    },
    LIMIT,
  );
  it(
    'an overflowing skill and an overflowing spell list SKILL_ and SPELL_ codes',
    async () => {
      const two = [
        skill({path: 'skills/Long.md', blocks: words(400)}),
        spell({path: 'spells/Long.md', blocks: words(400)}),
      ];
      const m = await makeSheet(two);
      expect(fitWarnings(m.facts, two)).toEqual([
        {code: 'SKILL_TEXT_OVERFLOW', path: 'skills/Long.md', detail: '5.5 pt'},
        {code: 'SPELL_TEXT_OVERFLOW', path: 'spells/Long.md', detail: '5.5 pt'},
      ]);
    },
    LIMIT,
  );
});

describe('US-003 AC-8: spell text appears literally', () => {
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
    '#let x = 1',
    '@ref',
    '$x$',
    '/* c */',
  ];
  const starts = ['= x', '- x', '+ x', '/ x: y'];
  type Where = 'title' | 'tag' | 'paragraph';
  const place = (where: Where, text: string): SkillCard =>
    where === 'title'
      ? spell({name: text, blocks: [para('x')]})
      : where === 'tag'
        ? spell({tags: [text], blocks: [para('x')]})
        : spell({blocks: [para(text)]});
  const cases: {where: Where; text: string}[] = [];
  for (const where of ['title', 'tag', 'paragraph'] as Where[]) {
    for (const s of specials) cases.push({where, text: `a${s}b`});
  }
  for (const where of ['paragraph', 'title'] as Where[]) {
    for (const s of starts) cases.push({where, text: s});
  }
  it(
    `${cases.length} cases compile and show their text literally`,
    async () => {
      const m = await makeSheet(cases.map((c) => place(c.where, c.text)));
      expect(m.placed).toHaveLength(cases.length);
      cases.forEach((c, i) => {
        expect(m.textOf(i), `${c.where}: ${c.text}`).toContain(
          c.text.replace(/\s+/g, ' '),
        );
      });
    },
    LIMIT,
  );
});

describe('US-003 AC-9: byte-identical PDF from separate processes', () => {
  it(
    'two fresh processes, 1.1 s apart, write the same bytes',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gcc-'));
      try {
        const bundle = join(dir, 'cli.mjs');
        await build({
          entryPoints: ['tests/support/spell-sheet-cli.ts'],
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
