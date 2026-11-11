// Test support: reads the facts of a sheet back from a PDF that Typst wrote
// (US-001 AC-9): the page boxes, the card frames and the cut marks, in mm
// from the top-left corner of each page. Written from the form measured in
// spike-typst.md: per drawing a q-block with `a b c d e f cm`, a path of
// `m` / `l` / `h` and a paint operator. Node's zlib inflates the streams.
import {inflateSync} from 'node:zlib';

const MM_PER_PT = 25.4 / 72;

export interface PdfPage {
  /** MediaBox width and height in pt. */
  widthPt: number;
  heightPt: number;
  /** Closed four-corner paths: x, y of the top-left corner, width, height, mm. */
  frames: {x: number; y: number; w: number; h: number}[];
  /** Clip boxes (closed axis-aligned paths that clip and are not painted). */
  clips: {x: number; y: number; w: number; h: number}[];
  /** Open two-point paths, in mm from the top-left corner. */
  lines: {x1: number; y1: number; x2: number; y2: number}[];
}

interface PdfObject {
  dict: string;
  stream: string | null;
}

/** Splits the file into objects; inflates every stream (Flate or plain). */
function objects(buf: Uint8Array): Map<number, PdfObject> {
  const text = Buffer.from(buf).toString('latin1');
  const out = new Map<number, PdfObject>();
  const starts = [...text.matchAll(/(?:^|\n)(\d+) 0 obj\b/g)];
  starts.forEach((m, i) => {
    const from = m.index + m[0].length;
    const to = i + 1 < starts.length ? starts[i + 1]!.index : text.length;
    const body = text.slice(from, to);
    const s = /stream\r?\n/.exec(body);
    if (s === null) {
      out.set(Number(m[1]), {dict: body, stream: null});
      return;
    }
    const raw = Buffer.from(
      body.slice(s.index + s[0].length, body.lastIndexOf('endstream')),
      'latin1',
    );
    let data: Buffer = raw;
    if (/\/FlateDecode/.test(body.slice(0, s.index))) {
      data = inflateSync(raw);
    }
    out.set(Number(m[1]), {
      dict: body.slice(0, s.index),
      stream: data.toString('latin1'),
    });
  });
  return out;
}

/** Applies `a b c d e f` to a point. */
const apply = (m: number[], x: number, y: number): [number, number] => [
  m[0]! * x + m[2]! * y + m[4]!,
  m[1]! * x + m[3]! * y + m[5]!,
];

/** Reads the drawings of one content stream. */
function drawings(
  content: string,
  heightPt: number,
): Pick<PdfPage, 'frames' | 'lines' | 'clips'> {
  const frames: PdfPage['frames'] = [];
  const clips: PdfPage['clips'] = [];
  const lines: PdfPage['lines'] = [];
  for (const block of content.split(/\bq\b/).slice(1)) {
    const cm = /([-\d. ]+) cm\b/.exec(block);
    const m = cm ? cm[1]!.trim().split(/\s+/).map(Number) : [1, 0, 0, 1, 0, 0];
    const points: [number, number][] = [];
    for (const op of block.matchAll(/([-\d.]+) ([-\d.]+) [ml]\b/g)) {
      points.push(apply(m, Number(op[1]), Number(op[2])));
    }
    const mm = ([x, y]: [number, number]): [number, number] => [
      x * MM_PER_PT,
      (heightPt - y) * MM_PER_PT,
    ];
    // A path that is only a clip (`W n`) or not painted draws nothing.
    const painted = /(^|\s)(S|s|f|F|f\*|B|B\*|b|b\*)(\s|$)/m.test(block);
    const clipping = /\bW\*?\s+n\b/.test(block);
    if (!painted && !clipping) continue;
    const closed = /\bh\b/.test(block);
    const axisAligned = points.every((q, i) => {
      const next = points[(i + 1) % points.length]!;
      return Math.abs(q[0] - next[0]) < 1e-6 || Math.abs(q[1] - next[1]) < 1e-6;
    });
    if (points.length === 4 && closed && axisAligned) {
      const p = points.map(mm);
      const xs = p.map((q) => q[0]);
      const ys = p.map((q) => q[1]);
      (clipping && !painted ? clips : frames).push({
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      });
    } else if (points.length === 2 && !closed) {
      const [a, b] = points.map(mm) as [[number, number], [number, number]];
      lines.push({x1: a[0], y1: a[1], x2: b[0], y2: b[1]});
    }
  }
  return {frames, lines, clips};
}

/** Reads every page of a PDF in page order. Throws when none is found. */
export function readSheet(pdf: Uint8Array): PdfPage[] {
  const all = objects(pdf);
  const pagesObj = [...all.values()].find((o) =>
    /\/Type \/Pages\b/.test(o.dict),
  );
  const kids = pagesObj ? [...pagesObj.dict.matchAll(/(\d+) 0 R/g)] : [];
  const pages: PdfPage[] = [];
  for (const k of kids) {
    const page = all.get(Number(k[1]));
    if (page === undefined) throw new Error(`page object ${k[1]} not found`);
    const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(page.dict);
    if (box === null) throw new Error('page without a MediaBox');
    const heightPt = Number(box[2]);
    const refs = [
      ...(
        /\/Contents (\[[^\]]*\]|\d+ 0 R)/.exec(page.dict)?.[1] ?? ''
      ).matchAll(/(\d+) 0 R/g),
    ];
    const content = refs
      .map((r) => all.get(Number(r[1]))?.stream ?? '')
      .join('\n');
    pages.push({
      widthPt: Number(box[1]),
      heightPt,
      ...drawings(content, heightPt),
    });
  }
  if (pages.length === 0) throw new Error('no pages found in the PDF');
  return pages;
}
