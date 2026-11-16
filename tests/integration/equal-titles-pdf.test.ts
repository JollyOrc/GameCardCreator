// US-011 AC-2 to AC-7, AC-9, AC-11, AC-12: equal title bars, compiled with the pinned
// Typst (typst.ts 0.7.0) and read back from the PDF: the title runs' size, the kind's
// fact (size, height, wrapped, widest), the bands' and rules' positions. Expected
// values: the story's examples, measured 2026-11-16 with the Typst CLI 0.14.2 and the
// bundled fonts (SCAR-024: this file shows that the plugin's compile path gives the same
// numbers, to 0.05 mm). Invented notes (SCAR-035). Scope: the default card size, the
// default text sizes unless stated. Red until the code tickets (G2, 2026-11-16).
import {describe, expect, it} from 'vitest';
import {titleWarnings} from '../../src/core/card/titles';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import type {SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SIZES, type CardSizes} from '../../src/core/skill/settings';
import {runBox, runText} from '../support/card-pdf';
import {makeSheet} from '../support/card-sheet';
import {pagePaints} from '../support/pdf/graphics';
import {openPdf} from '../support/pdf/reader';
import {
  OFF,
  ON,
  body,
  feint,
  longLesson,
  longRiverbank,
  parry,
  plain,
  riverbank,
  spell,
  titleFacts,
  type TitlesFact,
} from '../support/title-fixtures';
import type {TitleSettings} from '../../src/core/card/titles';

const T = 120_000; // SCAR-030: one compile of a sheet takes 1 to 3 s in a full run
const MM_PER_PT = 25.4 / 72;
const GAP_MM = 2 * MM_PER_PT; // the 2 pt under the header (US-002 "The card")

type Sheet = Awaited<ReturnType<typeof makeSheet>>;
const sheetOf = (
  cards: SkillCard[],
  titles: {skill?: TitleSettings; spell?: TitleSettings},
  sizes: CardSizes = DEFAULT_SIZES,
) => makeSheet(cards, DEFAULT_SHEET, sizes, {titles});
const factOf = (m: Sheet, kind: 'skill' | 'spell' = 'skill'): TitlesFact => {
  const f = titleFacts(m.facts as unknown[]).filter((x) => x.titles === kind);
  expect(f, `one ${kind} fact`).toHaveLength(1);
  return f[0]!;
};
/** The size of card `i`'s fit fact (the text size of its body). */
const bodySize = (m: Sheet, i: number): number =>
  (m.facts as {i?: number; size: number}[]).find((f) => f.i === i)!.size;
/** The runs of card `i`'s title: its words at the largest size in the card's top `depth` mm. */
function titleRuns(m: Sheet, i: number, name: string, depth = 20) {
  const c = m.placed[i]!;
  const words = new Set(name.split(' '));
  const top = m
    .runsOf(i)
    .filter((r) => runBox(r).y < c.y + depth)
    .filter((r) =>
      runText(r)
        .split(' ')
        .some((w) => words.has(w)),
    );
  const size = Math.max(...top.map((r) => r.size));
  return top.filter((r) => Math.abs(r.size - size) < 0.01);
}
const titleSize = (m: Sheet, i: number, name: string): number =>
  titleRuns(m, i, name)[0]!.size;
/** The rule under card `i`'s plain header: a horizontal stroke as wide as the text area. */
function ruleY(m: Sheet, i: number): number {
  const c = m.placed[i]!;
  const rules = pagePaints(openPdf(m.pdf))[c.page]!.strokes.filter(
    (s) =>
      Math.abs(s.y1 - s.y0) < 0.05 &&
      Math.abs(s.x1 - s.x0 - 54) < 0.5 &&
      s.x0 > c.x &&
      s.x1 < c.x + 62 &&
      s.y0 > c.y &&
      s.y0 < c.y + 40,
  );
  expect(rules, `one header rule on card ${i}`).toHaveLength(1);
  return (rules[0]!.y0 + rules[0]!.y1) / 2;
}
/** The band of card `i` (the flat `#f4d6b0` fill inside the card's columns). */
function bandOf(m: Sheet, i: number) {
  const c = m.placed[i]!;
  const bands = pagePaints(openPdf(m.pdf))[c.page]!.fills.filter(
    (f) =>
      f.paint.kind === 'flat' &&
      f.paint.rgb.join() === '244,214,176' &&
      f.x0 >= c.x - 0.01 &&
      f.x1 <= c.x + 62.01 &&
      f.y0 >= c.y - 0.01 &&
      f.y0 < c.y + 1,
  );
  expect(bands, `one band on card ${i}`).toHaveLength(1);
  return bands[0]!;
}

describe('US-011 AC-2: one title size per kind (shrink first)', () => {
  it(
    'Parry and Feint: 9.1 pt, the title size itself',
    async () => {
      const m = await sheetOf([parry(), feint()], {skill: ON});
      expect(factOf(m).size).toBe(9.1);
      expect(titleSize(m, 0, 'Parry')).toBeCloseTo(9.1, 2);
      expect(titleSize(m, 1, 'Feint')).toBeCloseTo(9.1, 2);
    },
    T,
  );
  it(
    'with Riverbank Ambush, no scheme: 8.1 pt on every card of the kind',
    async () => {
      const cards = [parry(), riverbank(), feint()];
      const m = await sheetOf(cards, {skill: ON});
      expect(factOf(m)).toMatchObject({size: 8.1, wrapped: []});
      cards.forEach((c, i) =>
        expect(titleSize(m, i, c.name), c.name).toBeCloseTo(8.1, 2),
      );
      // the title stays on one line
      expect(
        new Set(titleRuns(m, 1, cards[1]!.name).map((r) => r.y)).size,
      ).toBe(1);
    },
    T,
  );
  it(
    'the same with the scheme (beside a sword icon): 7 pt',
    async () => {
      const m = await sheetOf([parry(true), riverbank(true), feint(true)], {
        skill: ON,
      });
      expect(factOf(m)).toMatchObject({size: 7, wrapped: []});
      expect(titleSize(m, 1, riverbank().name)).toBeCloseTo(7, 2);
    },
    T,
  );
  it(
    'today (off): the title is 1.3 times the text size and Riverbank Ambush wraps (the test tells the rule from today)',
    async () => {
      const cards = [parry(), riverbank(), feint()];
      const m = await sheetOf(cards, {skill: OFF});
      expect(titleFacts(m.facts as unknown[])).toEqual([]);
      expect(titleSize(m, 1, cards[1]!.name)).toBeCloseTo(9.1, 2);
      expect(
        new Set(titleRuns(m, 1, cards[1]!.name).map((r) => r.y)).size,
      ).toBe(2);
    },
    T,
  );
});

describe('US-011 AC-3, AC-6: one header height per kind', () => {
  it(
    'no scheme: H is the tallest header (Feint, its tags line wraps): 7.70 mm; the rules stand at one height',
    async () => {
      const m = await sheetOf([parry(), riverbank(), feint()], {skill: ON});
      expect(factOf(m).height).toBeCloseTo(7.7, 1);
      expect(Math.abs(factOf(m).height - 7.7)).toBeLessThan(0.05);
      for (const i of [0, 1, 2]) {
        expect(ruleY(m, i) - m.placed[i]!.y, `card ${i}`).toBeCloseTo(
          4 + factOf(m).height + GAP_MM,
          1,
        );
      }
    },
    T,
  );
  it(
    'today (off): the three rules stand at three heights (6.22, 9.89, 8.48 mm headers)',
    async () => {
      const m = await sheetOf([parry(), riverbank(), feint()], {skill: OFF});
      const ys = [0, 1, 2].map((i) => ruleY(m, i) - m.placed[i]!.y);
      expect(ys[1]! - ys[0]!).toBeCloseTo(9.89 - 6.22, 1);
      expect(ys[2]! - ys[0]!).toBeCloseTo(8.48 - 6.22, 1);
    },
    T,
  );
  it(
    "the scheme: Parry and Riverbank banded, Plain plain: t 7, H 5.11 mm; both bands 11.11 mm high; Plain's rule under its 5.11 mm box",
    async () => {
      const m = await sheetOf([parry(true), riverbank(true), plain()], {
        skill: ON,
      });
      const f = factOf(m);
      expect(f.size).toBe(7);
      expect(Math.abs(f.height - 5.11)).toBeLessThan(0.05);
      for (const i of [0, 1]) {
        const b = bandOf(m, i);
        expect(b.y0).toBeCloseTo(m.placed[i]!.y, 1); // bleed 0
        expect(b.y1 - b.y0, `band ${i}`).toBeCloseTo(4 + f.height + 2, 1);
      }
      expect(ruleY(m, 2) - m.placed[2]!.y).toBeCloseTo(
        4 + f.height + GAP_MM,
        1,
      );
    },
    T,
  );
});

describe('US-011 AC-4: the text size is not in the header', () => {
  it(
    'Long Lesson shrinks its text, not its header: title 8.1 pt, rule at the height of the others',
    async () => {
      const m = await sheetOf([longLesson(), parry(), riverbank()], {
        skill: ON,
      });
      expect(bodySize(m, 0)).toBeLessThan(7);
      expect(titleSize(m, 0, 'Long Lesson')).toBeCloseTo(8.1, 2);
      expect(ruleY(m, 0) - m.placed[0]!.y).toBeCloseTo(
        ruleY(m, 1) - m.placed[1]!.y,
        1,
      );
    },
    T,
  );
  it(
    "today (off): Long Lesson's title is 1.3 times its own text size",
    async () => {
      const m = await sheetOf([longLesson(), parry()], {skill: OFF});
      expect(titleSize(m, 0, 'Long Lesson')).toBeCloseTo(
        1.3 * bodySize(m, 0),
        2,
      );
      expect(bodySize(m, 0)).toBeLessThan(7);
    },
    T,
  );
});

describe('US-011 AC-5: too long even at the smallest size: wrap, grow, one warning', () => {
  it(
    'the four skills: t 7, the long title wraps, H 7.94 mm, the warning of the story',
    async () => {
      const cards = [parry(), riverbank(), feint(), longRiverbank()];
      const m = await sheetOf(cards, {skill: ON});
      const f = factOf(m);
      expect(f).toMatchObject({size: 7, wrapped: [3], widest: 3});
      expect(Math.abs(f.height - 7.94)).toBeLessThan(0.05);
      // only the header (body text is 7 pt too and shares words with the title)
      const depth = 4 + f.height + 0.5;
      expect(
        new Set(titleRuns(m, 3, cards[3]!.name, depth).map((r) => r.y)).size,
      ).toBe(2);
      expect(titleWarnings(m.facts as unknown[], cards)).toEqual([
        {
          code: 'SKILL_TITLE_WRAPPED',
          path: 'skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md',
          detail: '1 of 4 titles wrap at 7 pt',
        },
      ]);
      for (const i of [0, 3])
        expect(ruleY(m, i) - m.placed[i]!.y).toBeCloseTo(
          4 + f.height + GAP_MM,
          1,
        );
    },
    T,
  );
});

describe('US-011 AC-5, AC-8: the fact names cards by their index in the run', () => {
  it(
    'a spell card first: the wrapped title and the widest are card 4, not the fourth skill',
    async () => {
      const cards = [
        spell('Ember Spark'),
        parry(),
        riverbank(),
        feint(),
        longRiverbank(),
      ];
      const m = await sheetOf(cards, {skill: ON, spell: OFF});
      expect(factOf(m)).toMatchObject({size: 7, wrapped: [4], widest: 4});
      expect(titleWarnings(m.facts as unknown[], cards)).toEqual([
        {
          code: 'SKILL_TITLE_WRAPPED',
          path: 'skills/The Long Riverbank Ambush of the Hidden Reed Wardens.md',
          detail: '1 of 4 titles wrap at 7 pt',
        },
      ]);
    },
    T,
  );
});

describe('US-011 AC-7: the fit under H; t and H do not follow the fit (SCAR-021)', () => {
  it.each([40, 120, 200, 260])(
    'Parry with %i words beside Riverbank and Feint: t 8.1 and H 7.70 every time; a text that fits lies inside the card',
    async (n) => {
      const first = {...parry(), blocks: body(n)};
      const m = await sheetOf([first, riverbank(), feint()], {skill: ON});
      const f = factOf(m);
      expect(f.size).toBe(8.1);
      expect(Math.abs(f.height - 7.7)).toBeLessThan(0.05);
      const fact = (
        m.facts as {i?: number; size: number; fits: boolean}[]
      ).find((x) => x.i === 0)!;
      const rule = ruleY(m, 0);
      const bodyRuns = m
        .runsOf(0)
        .filter((r) => runBox(r).y > rule && runText(r).trim() !== '');
      expect(bodyRuns.length).toBeGreaterThan(0);
      if (fact.fits) {
        const last = Math.max(...bodyRuns.map((r) => runBox(r).y));
        expect(last).toBeLessThanOrEqual(m.placed[0]!.y + 88 - 4 + 0.1);
      }
    },
    T,
  );
});

describe('US-011 AC-9: the settings at the ends and in the middle (SCAR-019)', () => {
  const two = () => [parry(), riverbank()];
  it.each([
    [
      'title 20, smallest 7',
      {titleSize: 20, minTitleSize: 7},
      DEFAULT_SIZES,
      8.25,
      [],
    ],
    [
      'title 13, smallest 7',
      {titleSize: 13, minTitleSize: 7},
      DEFAULT_SIZES,
      8.25,
      [],
    ],
    [
      'title 6, smallest 4',
      {titleSize: 6, minTitleSize: 4},
      DEFAULT_SIZES,
      6,
      [],
    ],
    [
      'title 9.1, smallest 9.1',
      {titleSize: 9.1, minTitleSize: 9.1},
      DEFAULT_SIZES,
      9.1,
      [1],
    ],
    [
      // US-011 AC-9 (amended at G4): step 0.3 tells the shared step from a fixed 0.25
      // (9.1, 8.8, 8.5, 8.2: 8.2 fits under 8.27; with 0.25 it would be 8.1)
      'size step 0.3',
      {titleSize: 9.1, minTitleSize: 7},
      {...DEFAULT_SIZES, sizeStep: 0.3},
      8.2,
      [],
    ],
  ] as const)(
    '%s: t %s',
    async (_n, t, sizes, size, wrapped) => {
      const m = await sheetOf(two(), {skill: {equalTitles: true, ...t}}, sizes);
      expect(factOf(m)).toMatchObject({size, wrapped: [...wrapped]});
      expect(titleSize(m, 0, 'Parry')).toBeCloseTo(size, 2);
    },
    T,
  );
});

describe('US-011 AC-1, D1: the kinds are separate', () => {
  it(
    "spells on, skills off: the spells share 8.6 pt; the skill's title is today's",
    async () => {
      const cards = [
        spell('Ember Spark'),
        parry(),
        spell('Slow Ember Curse of the Ashen Marsh'),
      ];
      const m = await sheetOf(cards, {skill: OFF, spell: ON});
      expect(titleFacts(m.facts as unknown[]).map((f) => f.titles)).toEqual([
        'spell',
      ]);
      expect(factOf(m, 'spell').size).toBe(8.6);
      expect(titleSize(m, 0, 'Ember Spark')).toBeCloseTo(8.6, 2);
      expect(titleSize(m, 1, 'Parry')).toBeCloseTo(1.3 * bodySize(m, 1), 2);
    },
    T,
  );
});

describe('US-011 AC-11: the order of the notes does not change t or H; two compiles agree', () => {
  it(
    'Riverbank, Parry, Feint gives the fact of Parry, Riverbank, Feint; the same run twice gives the same PDF bytes',
    async () => {
      const a = await sheetOf([parry(), riverbank(), feint()], {skill: ON});
      const b = await sheetOf([riverbank(), parry(), feint()], {skill: ON});
      expect([factOf(b).size, factOf(b).height]).toEqual([
        factOf(a).size,
        factOf(a).height,
      ]);
      const c = await sheetOf([parry(), riverbank(), feint()], {skill: ON});
      expect(Buffer.from(c.pdf).equals(Buffer.from(a.pdf))).toBe(true);
    },
    T,
  );
});

describe('US-011 AC-12: a row of cards lines up (checked by program, counted)', () => {
  it(
    'three banded cards in a row: the bands end on one line; three plain cards in the next row: the rules on one line',
    async () => {
      const cards = [
        parry(true),
        riverbank(true),
        feint(true),
        plain(),
        {...parry(), tags: ['Misc'], rawTags: ['Misc']},
        {...longLesson(), tags: ['Misc'], rawTags: ['Misc']},
      ];
      const m = await sheetOf(cards, {skill: ON});
      const bottoms = [0, 1, 2].map((i) => bandOf(m, i).y1);
      expect(bottoms).toHaveLength(3); // as many bands checked as banded cards drawn
      expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThan(0.1);
      const rules = [3, 4, 5].map((i) => ruleY(m, i));
      expect(rules).toHaveLength(3);
      expect(Math.max(...rules) - Math.min(...rules)).toBeLessThan(0.1);
    },
    T,
  );
});
