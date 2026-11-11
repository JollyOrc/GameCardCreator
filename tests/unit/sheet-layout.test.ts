// US-001: cards on an A4 sheet. Every expected value below is taken from the
// story's examples (docs/user-stories/US-001-sheet-layout.md), computed by
// hand there, never from the code under test (SCAR-003).
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_SHEET,
  cutMarks,
  placeCards,
  sheetGrid,
  checkSettings,
  type SheetSettings,
} from '../../src/core/sheet/layout';

const s = (over: Partial<SheetSettings> = {}): SheetSettings => ({
  ...DEFAULT_SHEET,
  ...over,
});

/** The grid of settings that must be valid; fails the test otherwise. */
function grid(over: Partial<SheetSettings>) {
  const g = sheetGrid(s(over));
  if (!g.ok) throw new Error(`expected a grid, got: ${g.message}`);
  return g;
}

describe('US-001 AC-1: default grid', () => {
  it('has the documented defaults', () => {
    expect(DEFAULT_SHEET).toEqual({
      cardWidth: 62,
      cardHeight: 88,
      margin: 10,
      gap: 0,
      cutMarks: true,
    });
  });
  it('is 3 x 3 = 9 cards, block centred at 12 / 16.5 mm', () => {
    const g = grid({});
    expect([g.columns, g.rows, g.perPage]).toEqual([3, 3, 9]);
    expect(g.originX).toBeCloseTo(12, 9);
    expect(g.originY).toBeCloseTo(16.5, 9);
  });
  it('places card (c, r) at x = 12 + 62c, y = 16.5 + 88r', () => {
    const r = placeCards(9, s());
    if (!r.ok) throw new Error(r.message);
    expect(r.cards).toHaveLength(9);
    for (const card of r.cards) {
      expect(card.x).toBeCloseTo(12 + 62 * card.col, 9);
      expect(card.y).toBeCloseTo(16.5 + 88 * card.row, 9);
    }
  });
});

describe('US-001 AC-2: margin range', () => {
  it.each([
    [0, 3, 3, 9],
    [10, 3, 3, 9],
    [20, 2, 2, 4],
    [50, 1, 2, 2],
  ])('margin %i mm gives %i x %i = %i', (margin, cols, rows, n) => {
    const g = grid({margin});
    expect([g.columns, g.rows, g.perPage]).toEqual([cols, rows, n]);
  });
  it('a margin above 50 is outside the range (AC-12), not a grid case', () => {
    expect(sheetGrid(s({margin: 80})).ok).toBe(false);
  });
});

describe('US-001 AC-3: card size range', () => {
  it.each([
    [30, 30, 6, 9, 54],
    [62, 88, 3, 3, 9],
    [95, 140, 2, 1, 2],
  ])('card %i x %i gives %i x %i = %i', (w, h, cols, rows, n) => {
    const g = grid({cardWidth: w, cardHeight: h});
    expect([g.columns, g.rows, g.perPage]).toEqual([cols, rows, n]);
  });
  it('card 200 x 200 has 0 columns: refused with margin and card size', () => {
    const g = sheetGrid(s({cardWidth: 200, cardHeight: 200}));
    expect(g.ok).toBe(false);
    if (g.ok) return;
    expect(g.message).toMatch(/margin/i);
    expect(g.message).toContain('10');
    expect(g.message).toContain('200 x 200');
  });
  it('no PDF cards are placed when the grid is refused', () => {
    const r = placeCards(5, s({cardWidth: 200, cardHeight: 200}));
    expect(r.ok).toBe(false);
  });
});

describe('US-001 AC-4: upright only', () => {
  it('margin 15 gives 2 x 3 = 6, never the turned 8', () => {
    const g = grid({margin: 15});
    expect([g.columns, g.rows, g.perPage]).toEqual([2, 3, 6]);
  });
  it('margin 10 gives 9', () => {
    expect(grid({margin: 10}).perPage).toBe(9);
  });
  it('no placed card is turned', () => {
    const r = placeCards(6, s({margin: 15}));
    if (!r.ok) throw new Error(r.message);
    for (const c of r.cards) {
      expect(c).not.toHaveProperty('rotated', true);
    }
  });
});

describe('US-001 AC-5: pages and order', () => {
  it.each([
    [0, 0],
    [1, 1],
    [9, 1],
    [10, 2],
    [20, 3],
  ])('%i cards give %i pages', (n, pages) => {
    const r = placeCards(n, s());
    if (!r.ok) throw new Error(r.message);
    expect(r.pages).toBe(pages);
    expect(r.cards).toHaveLength(n);
  });
  it('20 cards fill pages 9, 9, 2', () => {
    const r = placeCards(20, s());
    if (!r.ok) throw new Error(r.message);
    const per = [0, 1, 2].map(
      (p) => r.cards.filter((c) => c.page === p).length,
    );
    expect(per).toEqual([9, 9, 2]);
  });
  it('reads left to right, then top to bottom', () => {
    const r = placeCards(10, s());
    if (!r.ok) throw new Error(r.message);
    const order = r.cards.map((c) => [c.page, c.row, c.col]);
    expect(order.slice(0, 4)).toEqual([
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2],
      [0, 1, 0],
    ]);
    expect(order[9]).toEqual([1, 0, 0]);
    expect(r.cards.map((c) => c.index)).toEqual([...Array(10).keys()]);
  });
});

describe('US-001 AC-6: gap', () => {
  it('margin 10, gap 2: 3 x 3, block at x 10, y 14.5, step 64 / 90', () => {
    const g = grid({gap: 2});
    expect([g.columns, g.rows, g.perPage]).toEqual([3, 3, 9]);
    expect(g.originX).toBeCloseTo(10, 9);
    expect(g.originY).toBeCloseTo(14.5, 9);
    const r = placeCards(9, s({gap: 2}));
    if (!r.ok) throw new Error(r.message);
    for (const c of r.cards) {
      expect(c.x).toBeCloseTo(10 + 64 * c.col, 9);
      expect(c.y).toBeCloseTo(14.5 + 90 * c.row, 9);
    }
  });
  it('margin 10, gap 5: 2 x 3 = 6, block at x 40.5, y 11.5', () => {
    const g = grid({gap: 5});
    expect([g.columns, g.rows, g.perPage]).toEqual([2, 3, 6]);
    expect(g.originX).toBeCloseTo(40.5, 9);
    expect(g.originY).toBeCloseTo(11.5, 9);
  });
});

describe('US-001 AC-7: cut marks', () => {
  const uniq = (xs: number[]) => [...new Set(xs.map((x) => +x.toFixed(6)))];
  it('defaults: 16 ticks at the documented positions, none omitted', () => {
    const m = cutMarks(s());
    expect(m.omittedSides).toEqual([]);
    expect(m.marks).toHaveLength(16);
    const vertical = m.marks.filter((t) => t.x1 === t.x2);
    const horizontal = m.marks.filter((t) => t.y1 === t.y2);
    expect(vertical).toHaveLength(8);
    expect(horizontal).toHaveLength(8);
    expect(uniq(vertical.map((t) => t.x1)).sort((a, b) => a - b)).toEqual([
      12, 74, 136, 198,
    ]);
    expect(uniq(horizontal.map((t) => t.y1)).sort((a, b) => a - b)).toEqual([
      16.5, 104.5, 192.5, 280.5,
    ]);
    const top = vertical.filter((t) => t.y2 < 100);
    const bottom = vertical.filter((t) => t.y1 > 100);
    for (const t of top) {
      expect([t.y1, t.y2]).toEqual([12.5, 15.5]);
    }
    for (const t of bottom) {
      expect([t.y1, t.y2]).toEqual([281.5, 284.5]);
    }
    const left = horizontal.filter((t) => t.x2 < 100);
    const right = horizontal.filter((t) => t.x1 > 100);
    for (const t of left) expect([t.x1, t.x2]).toEqual([8, 11]);
    for (const t of right) expect([t.x1, t.x2]).toEqual([199, 202]);
  });
  it('card 100 x 140, margin 0: left and right sides omitted, top and bottom kept', () => {
    const m = cutMarks(s({cardWidth: 100, cardHeight: 140, margin: 0}));
    expect([...m.omittedSides].sort()).toEqual(['left', 'right']);
    expect(m.marks.length).toBeGreaterThan(0);
    expect(m.marks.every((t) => t.x1 === t.x2)).toBe(true); // vertical only
    expect(m.marks.some((t) => t.y1 === 4.5)).toBe(true);
  });
  it('card 98 x 140, margin 0: left ticks start exactly 3 mm from the edge and stay', () => {
    const m = cutMarks(s({cardWidth: 98, cardHeight: 140, margin: 0}));
    expect(m.omittedSides).toEqual([]);
    expect(m.marks.some((t) => t.y1 === t.y2 && t.x1 === 3)).toBe(true);
  });
  it('card 62 x 143, margin 0: top and bottom omitted, left and right kept', () => {
    const m = cutMarks(s({cardHeight: 143, margin: 0}));
    expect([...m.omittedSides].sort()).toEqual(['bottom', 'top']);
    expect(m.marks.length).toBeGreaterThan(0);
    expect(m.marks.every((t) => t.y1 === t.y2)).toBe(true); // horizontal only
  });
  it('cut marks off: no ticks, nothing omitted', () => {
    const m = cutMarks(s({cutMarks: false}));
    expect(m).toEqual({marks: [], omittedSides: []});
  });
  it('no tick overlaps a card', () => {
    const r = placeCards(9, s());
    if (!r.ok) throw new Error(r.message);
    const m = cutMarks(s());
    expect(m.marks.length).toBe(16); // the check below runs over all of them
    for (const t of m.marks) {
      for (const c of r.cards) {
        const inX =
          Math.max(t.x1, t.x2) > c.x && Math.min(t.x1, t.x2) < c.x + 62;
        const inY =
          Math.max(t.y1, t.y2) > c.y && Math.min(t.y1, t.y2) < c.y + 88;
        expect(inX && inY).toBe(false);
      }
    }
  });
});

describe('US-001 AC-12: settings checked', () => {
  const bad: [keyof SheetSettings, number][] = [
    ['cardWidth', 29],
    ['cardWidth', 201],
    ['cardHeight', 29],
    ['cardHeight', 201],
    ['margin', -1],
    ['margin', 51],
    ['gap', -1],
    ['gap', 11],
    ['margin', NaN],
    ['gap', Infinity],
    ['cardWidth', NaN],
  ];
  it.each(bad)('%s = %s is refused, naming setting and value', (key, value) => {
    const issues = checkSettings(s({[key]: value} as Partial<SheetSettings>));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(
      key === 'cardWidth'
        ? 'card width'
        : key === 'cardHeight'
          ? 'card height'
          : key,
    );
    expect(issues[0]).toContain(String(value));
  });
  it.each([
    [{cardWidth: 30}],
    [{cardWidth: 200}],
    [{cardHeight: 30}],
    [{cardHeight: 200}],
    [{margin: 0}],
    [{margin: 50}],
    [{gap: 0}],
    [{gap: 10}],
  ])('the end %j is accepted', (over) => {
    expect(checkSettings(s(over))).toEqual([]);
  });
  it('a refused setting lays nothing out', () => {
    expect(sheetGrid(s({margin: 51})).ok).toBe(false);
    expect(placeCards(3, s({margin: 51})).ok).toBe(false);
  });
});

describe('US-001 AC-8: sweep', () => {
  it('checks 168 combinations: page count, inside usable area, no overlap', () => {
    let checked = 0;
    for (const margin of [0, 10, 15, 50]) {
      for (const gap of [0, 2]) {
        const set = s({margin, gap});
        for (let n = 0; n <= 20; n++) {
          const r = placeCards(n, set);
          checked++;
          if (!r.ok) {
            // only the margin-50 layout may be refused? it still fits 2/page
            throw new Error(`margin ${margin} gap ${gap} n ${n}: ${r.message}`);
          }
          const g = grid({margin, gap});
          expect(r.pages).toBe(Math.ceil(n / g.perPage));
          expect(r.cards).toHaveLength(n);
          for (const c of r.cards) {
            expect(c.x).toBeGreaterThanOrEqual(margin - 1e-9);
            expect(c.y).toBeGreaterThanOrEqual(margin - 1e-9);
            expect(c.x + 62).toBeLessThanOrEqual(210 - margin + 1e-9);
            expect(c.y + 88).toBeLessThanOrEqual(297 - margin + 1e-9);
          }
          for (const a of r.cards) {
            for (const b of r.cards) {
              if (a.index >= b.index || a.page !== b.page) continue;
              const apart =
                a.x + 62 <= b.x + 1e-9 ||
                b.x + 62 <= a.x + 1e-9 ||
                a.y + 88 <= b.y + 1e-9 ||
                b.y + 88 <= a.y + 1e-9;
              expect(apart).toBe(true);
            }
          }
        }
      }
    }
    expect(checked).toBe(168);
  });
});

describe('US-001 AC-10 (layout part): deterministic', () => {
  it('the same settings give equal results', () => {
    expect(placeCards(20, s({gap: 2}))).toEqual(placeCards(20, s({gap: 2})));
    expect(cutMarks(s())).toEqual(cutMarks(s()));
  });
});
