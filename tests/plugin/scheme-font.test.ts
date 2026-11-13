// US-009 AC-5, AC-12: the icon font through the compile worker with the font list
// the BUILD embeds (`fontFiles`, the real consumer path, SCAR-023): a glyph of the
// family `rpg-awesome` is drawn, not a missing-glyph box, and without the font the
// compile does not fail but draws no such glyph. Red until the code ticket.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {describe, expect, it} from 'vitest';
import {openPdf} from '../support/pdf/reader';
import {pageRuns} from '../support/pdf/text';
import {runText} from '../support/card-pdf';

const root = process.cwd();
const CORE = '../../src/plugin/compiler/worker-core';
const BUILD = '../../build/build-plugin.mjs';
type Post = (message: unknown, transfer?: Transferable[]) => void;
interface Out {
  type: string;
  id?: string;
  pdf?: ArrayBuffer;
  message?: string;
}
const gz = (b: Uint8Array) => gzipSync(b).toString('base64');
const WASM = readFileSync(
  join(
    root,
    'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
  ),
);

async function ready(files: string[]) {
  const {createWorkerCore} = (await import(/* @vite-ignore */ CORE)) as {
    createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
  };
  const out: Out[] = [];
  const core = createWorkerCore((m) => void out.push(m as Out));
  await core.handle({
    type: 'init',
    id: 'i',
    compilerText: gz(new Uint8Array(WASM)),
    fontTexts: files.map((f) =>
      gz(new Uint8Array(readFileSync(join(root, 'assets/fonts', f)))),
    ),
  });
  return async (source: string) => {
    const id = `c${out.length}`;
    await core.handle({type: 'compile', id, source});
    return out.find((o) => o.id === id)!;
  };
}
const SOURCE = `#set document(date: none)\n#set text(font: "Libertinus Serif")\nA #text(font: "rpg-awesome", size: 18pt)[#"\\u{e946}#"\\u{eaa1}"] B\n`;
const glyphs = (pdf: ArrayBuffer | undefined): string =>
  pageRuns(openPdf(new Uint8Array(pdf!)))[0]!
    .map(runText)
    .join('|');

describe('US-009 AC-5, AC-12: the icon font in the worker', () => {
  it('with the embedded font list, the glyphs of sword and skull are drawn', async () => {
    const {fontFiles} = (await import(/* @vite-ignore */ BUILD)) as {
      fontFiles(dir: string): string[];
    };
    const compile = await ready(fontFiles(join(root, 'assets/fonts')));
    const r = await compile(SOURCE);
    expect(r.type).toBe('compiled');
    const text = glyphs(r.pdf);
    expect(text).toContain(String.fromCodePoint(0xe946));
    expect(text).toContain(String.fromCodePoint(0xeaa1));
  }, 60_000);
  it('without the font file the glyphs are not there (the family is missing, not found by luck)', async () => {
    const compile = await ready([
      'LibertinusSerif-Regular.otf',
      'LibertinusSerif-Bold.otf',
      'LibertinusSerif-Italic.otf',
      'LibertinusSerif-BoldItalic.otf',
    ]);
    const r = await compile(SOURCE);
    expect(r.type).toBe('compiled');
    const text = glyphs(r.pdf);
    expect(text).not.toContain(String.fromCodePoint(0xe946));
  }, 60_000);
});
