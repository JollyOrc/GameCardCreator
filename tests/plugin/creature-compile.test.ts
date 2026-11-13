// US-004 AC-12: the compile takes the files and the fonts of one request and
// keeps nothing of them for the next. Real Typst in Node through the worker's
// core; the extra font is DejaVu Sans Mono (tests/fixtures/fonts, its own
// licence), a family the plugin does not bundle. The message form is
// `{type: 'compile', id, source, files?: {path, bytes: ArrayBuffer}[],
// fonts?: ArrayBuffer[]}`. How the worker takes the fonts (a new compiler per
// such compile or fonts added to the held one) is a ticket's measurement, so
// these tests state only what the compile does. Red until the code ticket.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {describe, expect, it} from 'vitest';
import {createCompiler} from '../../src/plugin/compiler/index';
import {FEN_HARE_ANSWER} from '../support/creature-fixtures';

const CORE = '../../src/plugin/compiler/worker-core';
type Post = (message: unknown, transfer?: Transferable[]) => void;
interface Out {
  type: string;
  id?: string;
  pdf?: ArrayBuffer;
  message?: string;
}
const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)) as T;

const root = process.cwd();
const WASM = readFileSync(
  join(
    root,
    'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
  ),
);
const LIBERTINUS = ['Regular', 'Bold', 'Italic', 'BoldItalic'].map((f) =>
  readFileSync(join(root, 'assets/fonts', `LibertinusSerif-${f}.otf`)),
);
const DEJAVU = readFileSync(
  join(root, 'tests/fixtures/fonts/DejaVuSansMono.ttf'),
);
const gz = (b: Uint8Array) => gzipSync(b).toString('base64');
const buf = (b: Uint8Array): ArrayBuffer =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

const MONO = '#text(font: "DejaVu Sans Mono")[mono text]\n';
// `document(date: none)`: without it Typst writes the current time into the PDF
// and two compiles a second apart differ (spike-typst.md); the byte comparisons
// below would then fail by chance (found at ticket #25).
const PLAIN =
  '#set document(date: none)\n#set text(font: "Libertinus Serif")\nplain text\n';
const WITH_ICON = '#image("o2t-icons/1.svg", width: 5mm)\n';

async function ready() {
  const {createWorkerCore} = await load<{
    createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
  }>(CORE);
  const out: Out[] = [];
  const core = createWorkerCore((m) => void out.push(m as Out));
  await core.handle({
    type: 'init',
    id: 'i',
    compilerText: gz(new Uint8Array(WASM)),
    fontTexts: LIBERTINUS.map((f) => gz(new Uint8Array(f))),
  });
  let n = 0;
  const compile = async (
    source: string,
    extra: Record<string, unknown> = {},
  ) => {
    const id = `c${n++}`;
    await core.handle({type: 'compile', id, source, ...extra});
    return out.find((o) => o.id === id)!;
  };
  return {compile};
}
const text = (pdf: ArrayBuffer | undefined) =>
  Buffer.from(pdf ?? new ArrayBuffer(0)).toString('latin1');
const files = FEN_HARE_ANSWER.files.map((f) => ({
  path: f.path,
  bytes: buf(f.bytes),
}));

describe('US-004 AC-12: files and fonts of one compile', () => {
  it('an icon at its path next to the source compiles; without the file it fails with a diagnostic', async () => {
    const {compile} = await ready();
    const without = await compile(WITH_ICON);
    expect(without.type).toBe('failed');
    expect(without.message).toMatch(/o2t-icons\/1\.svg/);
    const withFiles = await compile(WITH_ICON, {files});
    expect(withFiles.type).toBe('compiled');
  }, 60_000);

  it('an extra font is used by that compile and is not there for the next (nothing leaks)', async () => {
    const {compile} = await ready();
    const base = await compile(PLAIN);
    const withFont = await compile(MONO, {
      fonts: [buf(new Uint8Array(DEJAVU))],
    });
    expect(withFont.type).toBe('compiled');
    expect(text(withFont.pdf)).toContain('DejaVuSansMono');
    // the same source without the font: the family is missing, not found by luck
    const missing = await compile(MONO);
    expect(text(missing.pdf)).not.toContain('DejaVuSansMono');
    // a plain compile after the creature compile is the one before it, to the byte
    const after = await compile(PLAIN);
    expect(Array.from(new Uint8Array(after.pdf!))).toEqual(
      Array.from(new Uint8Array(base.pdf!)),
    );
  }, 60_000);

  it('the files of one compile are gone in the next (nothing leaks)', async () => {
    const {compile} = await ready();
    expect((await compile(WITH_ICON, {files})).type).toBe('compiled');
    expect((await compile(WITH_ICON)).type).toBe('failed');
  }, 60_000);

  it('a compile with no extra is the sheet as before: the same PDF as one made in a fresh worker', async () => {
    const a = await ready();
    const b = await ready();
    await a.compile(WITH_ICON, {files});
    await a.compile(MONO, {fonts: [buf(new Uint8Array(DEJAVU))]});
    const afterCreature = await a.compile(PLAIN);
    const fresh = await b.compile(PLAIN);
    expect(Array.from(new Uint8Array(afterCreature.pdf!))).toEqual(
      Array.from(new Uint8Array(fresh.pdf!)),
    );
  }, 60_000);
});

describe('US-004 AC-12 (ticket #25): the diagnostic and the kept compiler', () => {
  it('a missing icon names the file as the source wrote it, in the diagnostic', async () => {
    const {compile} = await ready();
    const r = await compile(WITH_ICON);
    expect(r.type).toBe('failed');
    expect(r.message).toMatch(/^\/sheet\.typ:1:8: error: failed to load file/);
    expect(r.message).toContain('["o2t-icons/1.svg"]');
  }, 60_000);
  it('the same fonts twice, then another list, then none: each compile has exactly its own fonts', async () => {
    const {compile} = await ready();
    const dejavu = [buf(new Uint8Array(DEJAVU))];
    const other = [buf(new Uint8Array(LIBERTINUS[0]!))];
    expect(text((await compile(MONO, {fonts: dejavu})).pdf)).toContain(
      'DejaVuSansMono',
    );
    expect(text((await compile(MONO, {fonts: dejavu})).pdf)).toContain(
      'DejaVuSansMono',
    );
    // another list replaces the kept compiler: DejaVu is not in it
    expect(text((await compile(MONO, {fonts: other})).pdf)).not.toContain(
      'DejaVuSansMono',
    );
    // none: the held compiler, without DejaVu
    expect(text((await compile(MONO)).pdf)).not.toContain('DejaVuSansMono');
    // and the first list again is used again
    expect(text((await compile(MONO, {fonts: dejavu})).pdf)).toContain(
      'DejaVuSansMono',
    );
  }, 60_000);
  it("a compile with extra fonts still has the plugin's own fonts (Libertinus Serif)", async () => {
    const {compile} = await ready();
    const r = await compile(PLAIN, {fonts: [buf(new Uint8Array(DEJAVU))]});
    expect(r.type).toBe('compiled');
    expect(text(r.pdf)).toContain('LibertinusSerif');
  }, 60_000);
  it('a new init drops the kept compiler: the fonts of the new init are the base', async () => {
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const out: Out[] = [];
    const core = createWorkerCore((m) => void out.push(m as Out));
    const init = (fontTexts: string[], id: string) =>
      core.handle({
        type: 'init',
        id,
        compilerText: gz(new Uint8Array(WASM)),
        fontTexts,
      });
    const extra = [buf(new Uint8Array(DEJAVU))];
    await init(
      LIBERTINUS.map((f) => gz(new Uint8Array(f))),
      'i1',
    );
    await core.handle({type: 'compile', id: 'a', source: PLAIN, fonts: extra});
    expect(text(out.find((o) => o.id === 'a')!.pdf)).toContain(
      'LibertinusSerif',
    );
    // the second init has no Libertinus: the same extra fonts must not bring it back
    await init([gz(new Uint8Array(DEJAVU))], 'i2');
    await core.handle({type: 'compile', id: 'b', source: PLAIN, fonts: extra});
    expect(text(out.find((o) => o.id === 'b')!.pdf)).not.toContain(
      'LibertinusSerif',
    );
  }, 60_000);
  it('files with extra fonts: both are used by that compile only', async () => {
    const {compile} = await ready();
    const both = await compile(`${WITH_ICON}${MONO}`, {
      files,
      fonts: [buf(new Uint8Array(DEJAVU))],
    });
    expect(both.type).toBe('compiled');
    expect(text(both.pdf)).toContain('DejaVuSansMono');
    expect(
      (await compile(WITH_ICON, {fonts: [buf(new Uint8Array(DEJAVU))]})).type,
    ).toBe('failed');
  }, 60_000);
});

describe('US-004 AC-12: the service hands the extra to the worker', () => {
  it('compile(source, {files, fonts}) posts one compile message with both; compile(source) posts none', async () => {
    const posted: {
      type: string;
      files?: unknown;
      fonts?: unknown;
      source?: string;
    }[] = [];
    const worker = {
      postMessage: (m: unknown) => {
        const msg = m as {type: string; id: string};
        posted.push(msg);
        queueMicrotask(() =>
          worker.onmessage?.({
            data:
              msg.type === 'init'
                ? {type: 'ready', id: msg.id}
                : {
                    type: 'compiled',
                    id: msg.id,
                    pdf: new ArrayBuffer(4),
                    facts: [],
                  },
          }),
        );
      },
      terminate: () => undefined,
      onmessage: null as ((e: {data: unknown}) => void) | null,
      onerror: null as ((e: {message?: string}) => void) | null,
    };
    const compiler = createCompiler({
      startWorker: () => worker,
      compilerText: () => 'x',
      fontTexts: () => ['y'],
    });
    const extra = {
      files: FEN_HARE_ANSWER.files,
      fonts: [new Uint8Array([1, 2, 3])],
    };
    await compiler.compile('#a', extra);
    await compiler.compile('#b');
    const compiles = posted.filter((m) => m.type === 'compile');
    expect(compiles).toHaveLength(2);
    expect((compiles[0]!.files as {path: string}[]).map((f) => f.path)).toEqual(
      FEN_HARE_ANSWER.files.map((f) => f.path),
    );
    expect(compiles[0]!.fonts).toHaveLength(1);
    expect(compiles[1]!.files ?? []).toEqual([]);
    expect(compiles[1]!.fonts ?? []).toEqual([]);
  });
});
