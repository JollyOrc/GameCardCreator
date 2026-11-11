// Test support: the text of cards read back from a compiled sheet (US-002).
// Runs are grouped by the card frame they lie in; a run's text is joined to
// the previous one without a space when both sit on one baseline (inline
// formatting splits a line into runs), with a space otherwise.
import type {TextRun} from './pdf/text';

const MM_PER_PT = 25.4 / 72;
const PAGE_HEIGHT_MM = 297;

/** The characters of a run. */
export const runText = (run: TextRun): string =>
  run.items.map((i) => ('ch' in i ? i.ch : '')).join('');

/** A run's left, right and baseline position in mm from the page's top-left. */
export function runBox(run: TextRun): {x0: number; x1: number; y: number} {
  return {
    x0: run.x0 * MM_PER_PT,
    x1: run.x1 * MM_PER_PT,
    y: PAGE_HEIGHT_MM - run.y * MM_PER_PT,
  };
}

/** The runs whose start lies inside the rectangle (mm, from the top-left). */
export function runsIn(
  runs: readonly TextRun[],
  area: {x: number; y: number; w: number; h: number},
): TextRun[] {
  return runs.filter((r) => {
    const b = runBox(r);
    return (
      b.x0 >= area.x - 0.01 &&
      b.x0 <= area.x + area.w + 0.01 &&
      b.y >= area.y - 0.01 &&
      b.y <= area.y + area.h + 0.01
    );
  });
}

/** The text of runs in reading order, whitespace collapsed. */
export function textOf(runs: readonly TextRun[]): string {
  let out = '';
  let last: TextRun | undefined;
  for (const run of runs) {
    if (last !== undefined) {
      out += Math.abs(last.y - run.y) < 0.01 ? '' : ' ';
    }
    out += runText(run);
    last = run;
  }
  return out.replace(/\s+/g, ' ').trim();
}
