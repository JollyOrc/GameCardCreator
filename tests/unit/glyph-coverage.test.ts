// US-010 AC-3, AC-4: what the compiler's font information says, as a lookup.
// `decodeCoverage` turns the run lengths of one face into half-open ranges;
// `createCoverage` is "some face has it" over many faces. Pure core, loaded at
// run time (it does not exist yet). Red until the code ticket (G2, 2026-11-17).
import {describe, expect, it} from 'vitest';
import {EXTRA, LATIN, facesOf} from '../support/glyph-faces';

const MODULE = '../../src/core/glyph/coverage';
interface Coverage {
  has(codePoint: number): boolean;
}
interface Module {
  decodeCoverage(runs: readonly number[]): [number, number][];
  createCoverage(
    faces: readonly {family: string; coverage: number[]}[],
  ): Coverage;
}
const load = async (): Promise<Module> => {
  const path: string = MODULE;
  return (await import(/* @vite-ignore */ path)) as Module;
};

describe('US-010 AC-4: decoding the run lengths of a face', () => {
  it('alternating lengths, starting with a run that is not covered', async () => {
    const {decodeCoverage} = await load();
    // 32 not covered, 8 covered (U+0020 to U+0027), 10 not, 3 covered (U+0032 to U+0034)
    expect(decodeCoverage([32, 8, 10, 3])).toEqual([
      [32, 40],
      [50, 53],
    ]);
  });
  it('a face that covers from the start (a first run of 0), a zero-length run in the middle, and no runs', async () => {
    const {decodeCoverage} = await load();
    expect(decodeCoverage([0, 5, 0, 5])).toEqual([
      [0, 5],
      [5, 10],
    ]);
    expect(decodeCoverage([])).toEqual([]);
    expect(decodeCoverage([100])).toEqual([]);
  });
  it('the bundled face of the helper reads back the ranges it was made from', async () => {
    const {decodeCoverage} = await load();
    expect(decodeCoverage(EXTRA.coverage)).toEqual([
      [0x2318, 0x2319],
      [0x2713, 0x2714],
    ]);
  });
});

describe('US-010 AC-3: a character is drawn when some face of the compile has it', () => {
  it('the ranges are half-open: the first code point is in, the one after the last is not', async () => {
    const {createCoverage} = await load();
    const c = createCoverage([LATIN]);
    expect(c.has(0x1f)).toBe(false);
    expect(c.has(0x20)).toBe(true);
    expect(c.has(0x24f)).toBe(true);
    expect(c.has(0x250)).toBe(false);
    expect(c.has(0xe9)).toBe(true);
    expect(c.has(0x6f22)).toBe(false);
    expect(c.has(0x1f600)).toBe(false);
  });
  it('the faces add up: a character of the second face is drawn', async () => {
    const {createCoverage} = await load();
    expect(createCoverage([LATIN]).has(0x2713)).toBe(false);
    expect(createCoverage([LATIN, EXTRA]).has(0x2713)).toBe(true);
    expect(createCoverage([LATIN, EXTRA]).has(0x2318)).toBe(true);
    expect(createCoverage([LATIN, EXTRA]).has(0x2714)).toBe(false);
  });
  it('a range that lies inside the range of another face does not shorten it (the merge keeps the larger end)', async () => {
    const {createCoverage} = await load();
    const outer = facesOf('A', [[0x20, 0x250]]);
    const inner = facesOf('B', [[0x41, 0x42]]);
    for (const faces of [
      [outer, inner],
      [inner, outer],
    ]) {
      const c = createCoverage(faces);
      expect(c.has(0x41)).toBe(true);
      expect(c.has(0x100)).toBe(true);
      expect(c.has(0x24f)).toBe(true);
      expect(c.has(0x250)).toBe(false);
    }
  });
  it('faces of one family (regular and bold) add up, in any order; no faces cover nothing', async () => {
    const {createCoverage} = await load();
    const a = facesOf('Serif', [[0x41, 0x42]]);
    const b = facesOf('Serif', [[0x1f600, 0x1f601]]);
    for (const faces of [
      [a, b],
      [b, a],
    ]) {
      const c = createCoverage(faces);
      expect(c.has(0x41)).toBe(true);
      expect(c.has(0x1f600)).toBe(true);
      expect(c.has(0x42)).toBe(false);
    }
    expect(createCoverage([]).has(0x41)).toBe(false);
  });
});
