// US-010 AC-4, AC-7: the compile worker answers what the fonts of the compile
// cover. Real typst.ts in Node through the worker's core, with the font list the
// BUILD embeds (`fontFiles`, the real consumer path, SCAR-023) and DejaVu Sans
// Mono (tests/fixtures/fonts) as an extra font. Message form: request
// `{type: 'font-info', id, fonts?: ArrayBuffer[]}` (the extra fonts of one
// compile), answer `{type: 'font-info-result', id, faces: {family, coverage}[]}`
// (the faces of the plugin's own fonts and of the extra fonts, run lengths
// starting with a run that is not covered); a buffer that is no font answers
// `{type: 'failed', id, message}`. The examples are the story's, read from the
// bundled files. Red until the code ticket (G2, 2026-11-17). SCAR-030: limits 60 s.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {describe, expect, it} from 'vitest';

const root = process.cwd();
const CORE = '../../src/plugin/compiler/worker-core';
const BUILD = '../../build/build-plugin.mjs';
const COVERAGE = '../../src/core/glyph/coverage';
type Post = (message: unknown, transfer?: Transferable[]) => void;
interface Face {
  family: string;
  coverage: number[];
}
interface Out {
  type: string;
  id?: string;
  faces?: Face[];
  message?: string;
}
const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)) as T;
const gz = (b: Uint8Array) => gzipSync(b).toString('base64');
const buf = (b: Uint8Array): ArrayBuffer =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const WASM = readFileSync(
  join(
    root,
    'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
  ),
);
const DEJAVU = readFileSync(
  join(root, 'tests/fixtures/fonts/DejaVuSansMono.ttf'),
);

async function ready() {
  const {fontFiles} = await load<{fontFiles(dir: string): string[]}>(BUILD);
  const files = fontFiles(join(root, 'assets/fonts'));
  const {createWorkerCore} = await load<{
    createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
  }>(CORE);
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
  let n = 0;
  const info = async (extra?: ArrayBuffer[]): Promise<Out> => {
    const id = `f${n++}`;
    await core.handle({
      type: 'font-info',
      id,
      ...(extra ? {fonts: extra} : {}),
    });
    return out.find((o) => o.id === id)!;
  };
  return {info, files};
}
const covers = async (faces: Face[]) => {
  const {createCoverage} = await load<{
    createCoverage(f: Face[]): {has(c: number): boolean};
  }>(COVERAGE);
  return createCoverage(faces);
};

describe('US-010 AC-7: what the bundled fonts cover (read by the compiler)', () => {
  it("the answer holds the faces of the plugin's own fonts: Libertinus Serif and the icon font", async () => {
    const {info, files} = await ready();
    const answer = await info();
    expect(answer.type).toBe('font-info-result');
    const families = answer.faces!.map((f) => f.family);
    expect(families.filter((f) => f === 'Libertinus Serif')).toHaveLength(4);
    expect(families).toContain('rpg-awesome');
    expect(answer.faces).toHaveLength(files.length);
  }, 60_000);

  it("Ж → ★ ◆ ß é are drawn; 漢 and 😀 are not; the icon font draws U+E946 (the story's examples)", async () => {
    const {info} = await ready();
    const c = await covers((await info()).faces!);
    for (const ch of ['Ж', '→', '★', '◆', 'ß', 'é', 'a', ' ', '—'])
      expect(c.has(ch.codePointAt(0)!), ch).toBe(true);
    for (const ch of ['漢', '😀', '', '', '✓', '⌘'])
      expect(c.has(ch.codePointAt(0)!), ch).toBe(false);
    expect(c.has(0xe946)).toBe(true);
  }, 60_000);
});

describe('US-010 AC-3, AC-4: the extra fonts of one compile', () => {
  it('an extra font adds its faces and its characters (DejaVu Sans Mono draws ✓ and ⌘)', async () => {
    const {info} = await ready();
    const withFont = await info([buf(new Uint8Array(DEJAVU))]);
    expect(withFont.faces!.map((f) => f.family)).toContain('DejaVu Sans Mono');
    const c = await covers(withFont.faces!);
    expect(c.has(0x2713)).toBe(true);
    expect(c.has(0x2318)).toBe(true);
    expect(c.has(0x6f22)).toBe(false);
  }, 60_000);

  it('nothing leaks: the next request without the font has not got its characters', async () => {
    const {info} = await ready();
    await info([buf(new Uint8Array(DEJAVU))]);
    const after = await info();
    expect(after.faces!.map((f) => f.family)).not.toContain('DejaVu Sans Mono');
    expect((await covers(after.faces!)).has(0x2713)).toBe(false);
  }, 60_000);

  it('bytes that are no font: a failure with a message and the worker goes on (no throw)', async () => {
    const {info} = await ready();
    const bad = await info([buf(new Uint8Array([1, 2, 3, 4]))]);
    expect(bad.type).toBe('failed');
    expect(bad.message).toBeTruthy();
    expect((await info()).type).toBe('font-info-result');
  }, 60_000);

  it('the same request twice gives the same faces (determinism)', async () => {
    const {info} = await ready();
    const a = await info([buf(new Uint8Array(DEJAVU))]);
    const b = await info([buf(new Uint8Array(DEJAVU))]);
    expect(b.faces).toEqual(a.faces);
  }, 60_000);
});
