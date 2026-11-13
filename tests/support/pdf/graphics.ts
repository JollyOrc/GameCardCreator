// Test support (US-009, G2): the fills of a PDF page that Typst 0.14.2 writes,
// read from the content stream: a flat colour (`scn` with three numbers) or a
// gradient (`scn` with a pattern name; the pattern's shading with a function
// of type 2 or the stitching type 3). Each fill has the box of its path in mm
// from the page's top-left. This is an INSTRUMENT (SCAR-028): it is checked on
// known input in `tests/unit/pdf-graphics.test.ts` before any test of a card
// relies on it. Transforms, documented here (SCAR-001):
// - `q`/`Q` save and restore the matrix (CTM) and the fill; `cm` multiplies.
// - The path of a fill is the points of `m`, `l`, `c` (end point only, boxes
//   of curves are not needed), `re` and `h`, through the CTM; `f`, `f*`, `B`
//   paint it with the current fill; `n` and `S` drop it without a fill.
// - A pattern fill: the pattern's `/Matrix` maps the unit axis (`/Coords`) to
//   the page's own space (not through the CTM), as the PDF rule says.
// - Colours are the numbers as written (0 to 1), returned as 0 to 255 rounded.
import {contentTokens, type PdfFile} from './reader';
import {pageContent, pageObjects} from './text';

const MM_PER_PT = 25.4 / 72;

/** A colour as 0 to 255 per channel. */
export type Rgb = [number, number, number];

/** What a fill paints with. */
export type Paint =
  | {kind: 'flat'; rgb: Rgb}
  | {
      kind: 'gradient';
      /** The colour stops, offsets 0 to 1 in ascending order. */
      stops: {offset: number; rgb: Rgb}[];
      /** The axis start and end, mm from the page's top-left. */
      axis: {x0: number; y0: number; x1: number; y1: number};
    };

/** One painted path: its box in mm from the page's top-left and its paint. */
export interface Fill {
  /** The place of the paint in the page's drawing order (0, 1, 2 ...), shared with strokes. */
  seq: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  paint: Paint;
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [
  x * m[0] + y * m[2] + m[4],
  x * m[1] + y * m[3] + m[5],
];
const rgb255 = (c: number[]): Rgb => [
  Math.round((c[0] ?? 0) * 255),
  Math.round((c[1] ?? 0) * 255),
  Math.round((c[2] ?? 0) * 255),
];

/** The numbers of a PDF array text `[a b c]`. */
const numbers = (text: string): number[] =>
  (text.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);

/** The object an `/Key n 0 R` of `dict` names, or ''. */
function refObject(file: PdfFile, dict: string, key: string): string {
  const m = new RegExp(`/${key}\\s+(\\d+)\\s+0\\s+R`).exec(dict);
  return m === null ? '' : file.object(Number(m[1]));
}

/** The array after `/Key` in `dict` (direct), as text. */
const arrayAfter = (dict: string, key: string): string =>
  new RegExp(`/${key}\\s*\\[([^\\]]*)\\]`).exec(dict)?.[1] ?? '';

/** The colour stops of a shading function (type 2, or type 3 over type 2). */
function stopsOf(file: PdfFile, fn: string): {offset: number; rgb: Rgb}[] {
  const type = Number(/\/FunctionType\s+(\d)/.exec(fn)?.[1]);
  if (type === 2) {
    return [
      {offset: 0, rgb: rgb255(numbers(arrayAfter(fn, 'C0')))},
      {offset: 1, rgb: rgb255(numbers(arrayAfter(fn, 'C1')))},
    ];
  }
  if (type === 3) {
    const subs = [
      ...(/\/Functions\s*\[([^\]]*)\]/.exec(fn)?.[1] ?? '').matchAll(
        /(\d+)\s+0\s+R/g,
      ),
    ].map((m) => file.object(Number(m[1])));
    const bounds = numbers(arrayAfter(fn, 'Bounds'));
    const stops: {offset: number; rgb: Rgb}[] = [];
    subs.forEach((s, i) => {
      const c0 = rgb255(numbers(arrayAfter(s, 'C0')));
      if (i === 0) stops.push({offset: 0, rgb: c0});
      else stops.push({offset: bounds[i - 1] ?? 1, rgb: c0});
      if (i === subs.length - 1)
        stops.push({offset: 1, rgb: rgb255(numbers(arrayAfter(s, 'C1')))});
    });
    return stops;
  }
  throw new Error(`unsupported shading function type ${type}`);
}

/** The page's pattern resources by name (`p0` → pattern object number). */
function patternsOf(file: PdfFile, page: string): Map<string, number> {
  const res = /\/Resources\s+(\d+)\s+0\s+R/.exec(page);
  const resources = res === null ? page : file.object(Number(res[1]));
  const direct = /\/Pattern\s*<<([^>]*)>>/.exec(resources)?.[1];
  const ref = /\/Pattern\s+(\d+)\s+0\s+R/.exec(resources);
  const block = direct ?? (ref === null ? '' : file.object(Number(ref[1])));
  const out = new Map<string, number>();
  for (const m of block.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+0\s+R/g))
    out.set(m[1] as string, Number(m[2]));
  return out;
}

/** One stroked path (a frame, a mark): its box in mm and its place in the drawing order. */
export interface Stroke {
  seq: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The fills of every page, in paint order. */
export function pageFills(file: PdfFile): Fill[][] {
  return pagePaints(file).map((p) => p.fills);
}

/** The strokes of every page, in paint order. */
export function pageStrokes(file: PdfFile): Stroke[][] {
  return pagePaints(file).map((p) => p.strokes);
}

/** The fills and strokes of every page; `seq` orders them together. */
export function pagePaints(
  file: PdfFile,
): {fills: Fill[]; strokes: Stroke[]}[] {
  return pageObjects(file).map((id) => {
    const page = file.object(id);
    const height =
      Number(
        /\/MediaBox\s*\[\s*[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)/.exec(
          page,
        )?.[1],
      ) * 1;
    const patterns = patternsOf(file, page);
    const toMm = (x: number, y: number): [number, number] => [
      x * MM_PER_PT,
      (height - y) * MM_PER_PT,
    ];
    const paintOfPattern = (name: string): Paint | null => {
      const n = patterns.get(name);
      if (n === undefined) return null;
      const pattern = file.object(n);
      const matrix = numbers(arrayAfter(pattern, 'Matrix')) as Matrix;
      const shading = refObject(file, pattern, 'Shading');
      const coords = numbers(arrayAfter(shading, 'Coords'));
      const fn = refObject(file, shading, 'Function');
      const [ax, ay] = apply(matrix, coords[0] ?? 0, coords[1] ?? 0);
      const [bx, by] = apply(matrix, coords[2] ?? 1, coords[3] ?? 0);
      const [x0, y0] = toMm(ax, ay);
      const [x1, y1] = toMm(bx, by);
      return {
        kind: 'gradient',
        stops: stopsOf(file, fn),
        axis: {x0, y0, x1, y1},
      };
    };

    const fills: Fill[] = [];
    const strokes: Stroke[] = [];
    let seq = 0;
    let ctm: Matrix = IDENTITY;
    let paint: Paint | null = null;
    const stack: {ctm: Matrix; paint: Paint | null}[] = [];
    let path: [number, number][] = [];
    let operands: (number | string)[] = [];
    for (const tok of contentTokens(pageContent(file, page))) {
      if (tok.t === 'name') {
        operands.push(tok.v);
        continue;
      }
      if (tok.t !== 'op') {
        if (tok.t === 'str') operands = [];
        continue;
      }
      // The reader gives numbers and operators alike as `op` tokens.
      if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(tok.v)) {
        operands.push(Number(tok.v));
        continue;
      }
      const nums = operands.filter((o): o is number => typeof o === 'number');
      switch (tok.v) {
        case 'q':
          stack.push({ctm, paint});
          break;
        case 'Q': {
          const s = stack.pop();
          if (s !== undefined) {
            ctm = s.ctm;
            paint = s.paint;
          }
          break;
        }
        case 'cm':
          if (nums.length === 6) ctm = multiply(nums as Matrix, ctm);
          break;
        case 'scn':
        case 'sc': {
          const name = operands.find((o) => typeof o === 'string');
          if (nums.length >= 3) paint = {kind: 'flat', rgb: rgb255(nums)};
          else if (typeof name === 'string') paint = paintOfPattern(name);
          break;
        }
        case 'rg':
          paint = {kind: 'flat', rgb: rgb255(nums)};
          break;
        case 'g':
          paint = {kind: 'flat', rgb: rgb255([nums[0]!, nums[0]!, nums[0]!])};
          break;
        case 'm':
        case 'l': {
          if (nums.length >= 2) {
            path.push(apply(ctm, nums[0]!, nums[1]!));
          }
          break;
        }
        case 'c':
          if (nums.length === 6) {
            path.push(apply(ctm, nums[4]!, nums[5]!));
          }
          break;
        case 're':
          if (nums.length === 4) {
            const [x, y, w, h] = nums as [number, number, number, number];
            path.push(
              apply(ctm, x, y),
              apply(ctm, x + w, y),
              apply(ctm, x + w, y + h),
              apply(ctm, x, y + h),
            );
          }
          break;
        case 'f':
        case 'F':
        case 'f*':
        case 'B':
        case 'B*':
          if (paint !== null && path.length > 0) {
            const xs = path.map((p) => p[0]);
            const ys = path.map((p) => p[1]);
            const [x0, y1] = toMm(Math.min(...xs), Math.min(...ys));
            const [x1, y0] = toMm(Math.max(...xs), Math.max(...ys));
            fills.push({
              seq: seq++,
              x0,
              y0: Math.min(y0, y1),
              x1,
              y1: Math.max(y0, y1),
              paint,
            });
          }
          path = [];
          break;
        case 'S':
        case 's':
          if (path.length > 0) {
            const xs = path.map((p) => p[0]);
            const ys = path.map((p) => p[1]);
            const [x0, y1] = toMm(Math.min(...xs), Math.min(...ys));
            const [x1, y0] = toMm(Math.max(...xs), Math.max(...ys));
            strokes.push({
              seq: seq++,
              x0,
              y0: Math.min(y0, y1),
              x1,
              y1: Math.max(y0, y1),
            });
          }
          path = [];
          break;
        case 'n':
          path = [];
          break;
        default:
          break;
      }
      operands = [];
    }
    return {fills, strokes};
  });
}
