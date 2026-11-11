// Support code checked against documents whose content is known (SCAR-028):
// the PDF text reader and the fact reader are trusted only after this.
import {describe, expect, it} from 'vitest';
import {openPdf} from '../support/pdf/reader';
import {pageRuns} from '../support/pdf/text';
import {compilePdf, compileWithFacts} from '../support/typst-node';

const text = (run: {items: ({ch: string} | {kern: number})[]}) =>
  run.items.map((i) => ('ch' in i ? i.ch : '')).join('');

describe('support: text and facts read from Typst output', () => {
  it('reads text, size and position of a known line', async () => {
    const pdf = await compilePdf(
      '#set page(width: 100mm, height: 50mm, margin: 0pt)\n' +
        '#set document(date: none)\n' +
        '#set text(font: "Libertinus Serif", size: 10pt)\n' +
        '#place(top + left, dx: 20mm, dy: 10mm)[Hello World 123]\n',
    );
    const runs = pageRuns(openPdf(pdf))[0]!;
    expect(runs.map(text).join(' ').replace(/\s+/g, ' ').trim()).toBe(
      'Hello World 123',
    );
    expect(runs[0]!.size).toBe(10);
    expect((runs[0]!.x0 * 25.4) / 72).toBeCloseTo(20, 1);
  }, 30_000);

  it('reads literal special characters back', async () => {
    const pdf = await compilePdf(
      '#set page(width: 100mm, height: 50mm, margin: 0pt)\n' +
        '#set text(font: "Libertinus Serif", size: 10pt)\n' +
        '#"a#b$c*d_e@f<g>h\\\\i`j//k"\n',
    );
    const got = pageRuns(openPdf(pdf))[0]!.map(text).join('');
    expect(got.replace(/\s+/g, '')).toBe('a#b$c*d_e@f<g>h\\i`j//k');
  }, 30_000);

  it('reads the values of labelled metadata, in order, and none when absent', async () => {
    const withFacts = await compileWithFacts(
      '#set page(width: 100mm, height: 50mm, margin: 0pt)\n' +
        '#metadata((i: 0, size: 7)) <fact>\n#metadata((i: 1, size: 5.5)) <fact>\n',
      'fact',
    );
    expect(withFacts.facts).toEqual([
      {i: 0, size: 7},
      {i: 1, size: 5.5},
    ]);
    const none = await compileWithFacts('= x\n', 'fact');
    expect(none.facts).toEqual([]);
  }, 30_000);
});
