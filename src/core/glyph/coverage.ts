// US-010 AC-3, AC-4: what the fonts of a compile cover, as a lookup. The faces
// come from the compiler's own font information (`getFontInfo` of typst.ts,
// read in the worker, AC-4): for each face its family and the covered code
// points as alternating run lengths, starting with a run that is NOT covered.
// Pure: no Obsidian, Node or I/O.

/** US-010 AC-4: one face as the compiler reports it. */
export interface FaceInfo {
  family: string;
  /** Alternating run lengths of code points, the first run not covered. */
  coverage: number[];
}

/** A half-open range `[from, to)` of code points. */
export type CodePointRange = readonly [number, number];

/**
 * US-010 AC-4: decodes the run lengths of one face into the ranges it covers.
 *
 * The runs alternate "not covered", "covered", "not covered", …, starting with
 * "not covered" (a first run of 0 means the face covers from U+0000). Runs of
 * length 0 add nothing. Ranges are half-open and in increasing order.
 */
export function decodeCoverage(runs: readonly number[]): [number, number][] {
  const ranges: [number, number][] = [];
  let position = 0;
  let covered = false;
  for (const length of runs) {
    if (covered && length > 0) ranges.push([position, position + length]);
    position += length;
    covered = !covered;
  }
  return ranges;
}

/**
 * US-010 AC-3: the lookup "some face of the compile has this code point".
 *
 * The faces add up (the faces of one family, the plugin's fonts and the extra
 * fonts of a creature run); their order does not matter. No faces cover
 * nothing. The ranges are merged once and searched by bisection.
 */
export function createCoverage(faces: readonly FaceInfo[]): {
  has(codePoint: number): boolean;
} {
  const all = faces
    .flatMap((face) => decodeCoverage(face.coverage))
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [from, to] of all) {
    const last = merged[merged.length - 1];
    if (last !== undefined && from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  return {
    has(codePoint: number): boolean {
      let low = 0;
      let high = merged.length - 1;
      while (low <= high) {
        const middle = (low + high) >> 1;
        const [from, to] = merged[middle] as [number, number];
        if (codePoint < from) high = middle - 1;
        else if (codePoint >= to) low = middle + 1;
        else return true;
      }
      return false;
    },
  };
}
