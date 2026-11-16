// US-009 AC-3 (amended 2026-11-16, US-011 D8), US-011 AC-3, AC-6 (D9): the band of a card
// with a branch ends 2 mm under its header, but never less than 1 mm under its lowest
// icon; in equal mode the icons count towards the kind's height. Compiled with the
// pinned Typst and read back. Expected values: the amended stories' examples, measured
// 2026-11-16 with the Typst CLI 0.14.2 and the bundled fonts (icons at 18 pt, glyph
// bounds: fire 5.84 mm, skull 5.95 mm, sword 5.92 mm). Invented notes (SCAR-035). Red
// until the code ticket (G2 of the amendment, 2026-11-16).
import {describe, expect, it} from 'vitest';
import type {Block, SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {DEFAULT_SIZES, type CardSizes} from '../../src/core/skill/settings';
import {runBox, runText} from '../support/card-pdf';
import {makeSheet} from '../support/card-sheet';
import {pagePaints, type Fill} from '../support/pdf/graphics';
import {openPdf} from '../support/pdf/reader';
import {ON, titleFacts} from '../support/title-fixtures';

const T = 120_000; // SCAR-030
const GAP_MM = (2 * 25.4) / 72; // the 2 pt under a plain header (US-002)
const FIRE_MM = 5.8415;
const SKULL_MM = 5.9531;

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
const card = (
  kind: 'skill' | 'spell',
  name: string,
  branches: ReturnType<typeof br>[],
  tags: string[],
): SkillCard => ({
  kind,
  path: `${kind}s/${name}.md`,
  name,
  tags,
  rawTags: tags,
  details: kind === 'skill' ? [{label: 'Time', value: 'reaction'}] : [],
  blocks: [para('You turn a blow aside and step into the gap.')],
  branches,
});
const parry = () =>
  card('skill', 'Parry', [SWORD], ['Combat Skill', 'Swordplay']);
const ember = () => card('spell', 'Ember Spark', [FIRE], ['Pyromancy']);
const scorch = () =>
  card('spell', 'Scorch Hex', [FIRE, SKULL], ['Pyromancy', 'Hexes']);
const slow = () =>
  card('spell', 'Slow Ember Curse of the Ashen Marsh', [FIRE], ['Pyromancy']);
const glow = () => card('spell', 'Glow', [], ['Lightcraft']);

type Sheet = Awaited<ReturnType<typeof makeSheet>>;
/** The one band of card `i` (a fill from the card's top edge, inside its columns). */
function bandOf(m: Sheet, i: number): Fill {
  const c = m.placed[i]!;
  const bands = pagePaints(openPdf(m.pdf))[c.page]!.fills.filter(
    (f) =>
      f.x0 >= c.x - 0.01 && f.x1 <= c.x + 62.01 && Math.abs(f.y0 - c.y) < 0.05,
  );
  expect(bands, `one band on card ${i}`).toHaveLength(1);
  return bands[0]!;
}
/** The rule under card `i`'s plain header. */
function ruleY(m: Sheet, i: number): number {
  const c = m.placed[i]!;
  const rules = pagePaints(openPdf(m.pdf))[c.page]!.strokes.filter(
    (s) =>
      Math.abs(s.y1 - s.y0) < 0.05 &&
      Math.abs(s.x1 - s.x0 - 54) < 0.5 &&
      s.y0 > c.y &&
      s.y0 < c.y + 40,
  );
  expect(rules, `one header rule on card ${i}`).toHaveLength(1);
  return (rules[0]!.y0 + rules[0]!.y1) / 2;
}
/** The first baseline of card `i`'s text under its band (not the header, not an icon). */
function firstBodyBaseline(m: Sheet, i: number, under: number): number {
  const runs = m
    .runsOf(i)
    .filter(
      (r) =>
        runBox(r).y > under &&
        Math.abs(r.size - 18) >= 0.3 &&
        runText(r).trim() !== '',
    );
  expect(runs.length).toBeGreaterThan(0);
  return Math.min(...runs.map((r) => runBox(r).y));
}
const height = (f: Fill) => f.y1 - f.y0;
const sheet = (
  cards: SkillCard[],
  sizes: CardSizes = DEFAULT_SIZES,
  titles = {},
) => makeSheet(cards, DEFAULT_SHEET, sizes, {titles});

describe('US-009 AC-3 (amended, D8): the band ends at least 1 mm under the lowest icon', () => {
  it(
    'Parry (header 6.22 mm, sword 5.92 mm): 12.22 mm, unchanged by D8',
    async () => {
      const m = await sheet([parry()]);
      expect(height(bandOf(m, 0))).toBeCloseTo(4 + 6.22 + 2, 1);
    },
    T,
  );
  it(
    'Ember Spark at 7 pt (header 4.05 mm, fire 5.84 mm): 10.84 mm (before 10.05), 1 mm under the fire',
    async () => {
      const m = await sheet([ember()]);
      const b = bandOf(m, 0);
      expect(Math.abs(height(b) - (4 + FIRE_MM + 1))).toBeLessThan(0.05);
      // the text starts 2 mm under the band (US-009 AC-8)
      expect(firstBodyBaseline(m, 0, b.y1) - b.y1).toBeGreaterThanOrEqual(2);
    },
    T,
  );
  it(
    'Ember Spark with the largest text size 6 pt (header 3.57 mm): 10.84 mm (before 9.57, the fire stuck out)',
    async () => {
      const m = await sheet([ember()], {
        maxSize: 6,
        minSize: 5.5,
        sizeStep: 0.25,
      });
      expect(Math.abs(height(bandOf(m, 0)) - (4 + FIRE_MM + 1))).toBeLessThan(
        0.05,
      );
    },
    T,
  );
  it(
    'Scorch Hex (fire, then skull): 1 mm under the lowest icon, the skull (10.95 mm), not the first (10.84 mm)',
    async () => {
      const m = await sheet([scorch()]);
      expect(Math.abs(height(bandOf(m, 0)) - (4 + SKULL_MM + 1))).toBeLessThan(
        0.05,
      );
    },
    T,
  );
});

describe('US-011 AC-3, AC-6 (amended, D9): in equal mode the icons count towards H', () => {
  it(
    "Ember Spark, Slow Ember Curse (fire) and Glow (no branch), spells on: t 7.35, H 4.84 mm, both bands 10.84 mm, Glow's rule under its 4.84 mm box",
    async () => {
      const m = await sheet([ember(), slow(), glow()], DEFAULT_SIZES, {
        spell: ON,
      });
      const f = titleFacts(m.facts as unknown[]).find(
        (x) => x.titles === 'spell',
      )!;
      expect(f.size).toBe(7.35);
      expect(Math.abs(f.height - (FIRE_MM - 1))).toBeLessThan(0.05);
      for (const i of [0, 1]) {
        expect(
          Math.abs(height(bandOf(m, i)) - (4 + FIRE_MM + 1)),
          `band ${i}`,
        ).toBeLessThan(0.05);
      }
      expect(ruleY(m, 2) - m.placed[2]!.y).toBeCloseTo(
        4 + f.height + GAP_MM,
        1,
      );
    },
    T,
  );
  it(
    'Scorch Hex (fire, then skull) with Glow, spells on: H is the lowest icon less 1 mm (4.95 mm, the skull), not the first (4.84 mm)',
    async () => {
      const m = await sheet([scorch(), glow()], DEFAULT_SIZES, {spell: ON});
      const f = titleFacts(m.facts as unknown[]).find(
        (x) => x.titles === 'spell',
      )!;
      expect(Math.abs(f.height - (SKULL_MM - 1))).toBeLessThan(0.05);
      expect(Math.abs(height(bandOf(m, 0)) - (4 + SKULL_MM + 1))).toBeLessThan(
        0.05,
      );
    },
    T,
  );
  it(
    'the same spells off: Ember Spark 1 mm under its fire, the slow curse under its wrapped title; Glow has its own (shorter) header and rule',
    async () => {
      const m = await sheet([ember(), slow(), glow()]);
      expect(titleFacts(m.facts as unknown[])).toEqual([]);
      // Ember Spark's band is set by its fire; the slow curse's 9.1 pt title wraps beside
      // the fire (off: no shrinking), so its header is taller than the icon and its band is
      // its header + 2 mm, as before D8
      expect(Math.abs(height(bandOf(m, 0)) - (4 + FIRE_MM + 1))).toBeLessThan(
        0.05,
      );
      expect(height(bandOf(m, 1))).toBeGreaterThan(4 + FIRE_MM + 1 + 1);
      expect(ruleY(m, 2) - m.placed[2]!.y).toBeLessThan(4 + FIRE_MM - 1);
    },
    T,
  );
});
