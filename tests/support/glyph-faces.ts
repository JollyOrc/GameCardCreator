// Test support for US-010: font faces as the compiler reports them. A face's
// coverage is alternating run lengths of code points, starting with a run that
// is NOT covered (`getFontInfo` of typst.ts, read at G0 2026-11-17).
export interface Face {
  family: string;
  coverage: number[];
}

/** The face covering the half-open code point ranges `ranges` (sorted, apart). */
export function facesOf(
  family: string,
  ranges: readonly (readonly [number, number])[],
): Face {
  const coverage: number[] = [];
  let position = 0;
  for (const [from, to] of ranges) {
    coverage.push(from - position, to - from);
    position = to;
  }
  return {family, coverage};
}

/** Latin: U+0020 to U+024F (`é` U+00E9 yes; `Ж` U+0416, `漢`, `😀`, `✓` no). */
export const LATIN = facesOf('Test Latin', [[0x20, 0x250]]);
/** A face that adds `✓` (U+2713) and `⌘` (U+2318): stands for an extra font. */
export const EXTRA = facesOf('Test Extra', [
  [0x2318, 0x2319],
  [0x2713, 0x2714],
]);
