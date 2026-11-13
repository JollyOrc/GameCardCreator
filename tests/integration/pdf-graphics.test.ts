// SCAR-028 (US-009, G2): the instrument that reads fills and gradients from a PDF
// is checked on a known input before a test of a card relies on it. The source
// has a flat rectangle, a two-colour and a three-colour gradient at known
// positions; the instrument must give back their boxes, colours, stops and axes.
import {describe, expect, it} from 'vitest';
import {openPdf} from '../support/pdf/reader';
import {pageFills, pagePaints, type Fill} from '../support/pdf/graphics';
import {compileWithFacts} from '../support/typst-node';

const SOURCE = `#set document(date: none)
#set page(width: 100mm, height: 100mm, margin: 0pt)
#place(top + left, dx: 10mm, dy: 20mm, rect(width: 30mm, height: 12mm, fill: rgb("#ff0000"), stroke: none))
#place(top + left, dx: 10mm, dy: 40mm, rect(width: 50mm, height: 10mm, fill: gradient.linear(dir: ltr, rgb("#00ff00"), rgb("#0000ff")), stroke: none))
#place(top + left, dx: 10mm, dy: 60mm, rect(width: 50mm, height: 10mm, fill: gradient.linear(dir: ltr, rgb("#ff0000"), rgb("#00ff00"), rgb("#0000ff")), stroke: none))
`;

const near = (a: number, b: number, tol = 0.05) =>
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

describe('SCAR-028: the fill instrument on a known PDF', () => {
  it('reads a flat rectangle and two gradients: boxes, colours, stops, axes', async () => {
    const {pdf} = await compileWithFacts(SOURCE, 'none');
    const pages = pageFills(openPdf(pdf));
    expect(pages).toHaveLength(1);
    const fills: Fill[] = pages[0]!;
    expect(fills).toHaveLength(3);

    const [flat, two, three] = fills as [Fill, Fill, Fill];
    expect(flat.paint).toEqual({kind: 'flat', rgb: [255, 0, 0]});
    [flat.x0, flat.y0, flat.x1, flat.y1].forEach((v, i) =>
      near(v, [10, 20, 40, 32][i]!),
    );

    expect(two.paint.kind).toBe('gradient');
    if (two.paint.kind !== 'gradient') return;
    expect(two.paint.stops).toEqual([
      {offset: 0, rgb: [0, 255, 0]},
      {offset: 1, rgb: [0, 0, 255]},
    ]);
    near(two.paint.axis.x0, 10);
    near(two.paint.axis.x1, 60);
    // the axis is horizontal (ltr); PDF puts its line on the box's top edge
    near(two.paint.axis.y0, two.paint.axis.y1);
    expect(two.paint.axis.y0).toBeGreaterThanOrEqual(two.y0 - 0.05);
    expect(two.paint.axis.y0).toBeLessThanOrEqual(two.y1 + 0.05);
    [two.x0, two.y0, two.x1, two.y1].forEach((v, i) =>
      near(v, [10, 40, 60, 50][i]!),
    );

    expect(three.paint.kind).toBe('gradient');
    if (three.paint.kind !== 'gradient') return;
    expect(three.paint.stops).toEqual([
      {offset: 0, rgb: [255, 0, 0]},
      {offset: 0.5, rgb: [0, 255, 0]},
      {offset: 1, rgb: [0, 0, 255]},
    ]);
    near(three.paint.axis.x0, 10);
    near(three.paint.axis.x1, 60);
  }, 120_000);
  it('a page without a fill gives none, and a stroke-only rectangle is no fill', async () => {
    const {pdf} = await compileWithFacts(
      `#set document(date: none)\n#set page(width: 50mm, height: 50mm, margin: 0pt)\n#place(top + left, rect(width: 10mm, height: 10mm, stroke: 1pt))\n`,
      'none',
    );
    expect(pageFills(openPdf(pdf))).toEqual([[]]);
  }, 120_000);
});

describe('SCAR-028: strokes and the drawing order', () => {
  it('a stroked frame drawn after a fill has the later place, with its box', async () => {
    const head = `#set document(date: none)\n#set page(width: 100mm, height: 100mm, margin: 0pt)\n`;
    const fill = `#place(top + left, dx: 10mm, dy: 10mm, rect(width: 40mm, height: 20mm, fill: rgb("#336699"), stroke: none))\n`;
    const frame = `#place(top + left, dx: 10mm, dy: 10mm, rect(width: 40mm, height: 20mm, stroke: 0.5pt, fill: none))\n`;
    const {pdf} = await compileWithFacts(head + fill + frame, 'none');
    const [page] = pagePaints(openPdf(pdf));
    expect(page!.fills).toHaveLength(1);
    expect(page!.strokes).toHaveLength(1);
    const f = page!.fills[0]!;
    const s = page!.strokes[0]!;
    expect(s.seq).toBeGreaterThan(f.seq);
    [s.x0, s.y0, s.x1, s.y1].forEach((v, i) =>
      near(v, [10, 10, 50, 30][i]!, 0.3),
    );
    const {pdf: back} = await compileWithFacts(head + frame + fill, 'none');
    const [p2] = pagePaints(openPdf(back));
    expect(p2!.fills[0]!.seq).toBeGreaterThan(p2!.strokes[0]!.seq);
  }, 120_000);
});
