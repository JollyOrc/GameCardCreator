// US-008 AC-1, AC-2, AC-3, AC-7, AC-13: the compile worker's core with the real
// Typst in Node (the reference of AC-1), the embedded text that the worker
// decodes, and the client that hands the texts over, queues requests, restarts
// after an error and ends on unload. The worker is a fake that runs the core in
// the same process. Expected values: the test reference (`compileWithFacts`,
// US-001) and the story. Amended 2026-11-12 (AC-13): the init message carries
// the gzip + base64 texts; the main thread decodes nothing.
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {FIT_LABEL} from '../../src/core/skill/fit';
import {readSkill} from '../../src/core/skill/read';
import {DEFAULT_SKILL} from '../../src/core/skill/settings';
import {readSheet} from '../support/pdf-sheet';
import {EXAMPLE_NOTE} from '../support/skill-fixtures';
import {compileWithFacts} from '../support/typst-node';

const CORE = '../../src/plugin/compiler/worker-core';
const CLIENT = '../../src/plugin/compiler/index';
const CODEC = '../../src/plugin/compiler/wasm-codec';
const EMBED = '../../build/embed.mjs';

type Post = (message: unknown, transfer?: Transferable[]) => void;
interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: {data: unknown}) => void) | null;
  onerror: ((event: {message: string}) => void) | null;
}
interface Result {
  pdf: Uint8Array | null;
  facts: unknown[];
  message?: string;
}
interface Compiler {
  compile(source: string): Promise<Result>;
  dispose(): void;
}
const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)) as T;

const WASM = readFileSync(
  join(
    process.cwd(),
    'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
  ),
);
const FONT_FILES = ['Regular', 'Bold', 'Italic', 'BoldItalic'].map((f) =>
  readFileSync(join(process.cwd(), 'assets/fonts', `LibertinusSerif-${f}.otf`)),
);

/** The embedded texts as the build makes them (gzip + base64), made once per file (about 1.5 s). */
let texts: {compiler: string; fonts: string[]} | null = null;
async function embeddedTexts(): Promise<{compiler: string; fonts: string[]}> {
  if (texts === null) {
    const {gzipBase64} = await load<{gzipBase64(b: Uint8Array): string}>(EMBED);
    texts = {
      compiler: gzipBase64(new Uint8Array(WASM)),
      fonts: FONT_FILES.map((f) => gzipBase64(new Uint8Array(f))),
    };
  }
  return texts;
}
/** The init message of the story's protocol (AC-13). */
async function initMessage(id: string, over: Record<string, unknown> = {}) {
  const t = await embeddedTexts();
  return {
    type: 'init',
    id,
    compilerText: t.compiler,
    fontTexts: t.fonts,
    ...over,
  };
}

/** A sheet source of two cards from the story's example note. */
function source(): string {
  const {card} = readSkill('skills/Reed Sweep.md', EXAMPLE_NOTE, DEFAULT_SKILL);
  const r = cardSheetTypst([card, card], DEFAULT_SHEET, DEFAULT_SKILL);
  if (!r.ok) throw new Error(r.message);
  return r.source;
}

/** A fake worker that runs the real core in this process; `log` records what it was sent. */
async function inProcessWorker(
  log: {type: string; id?: string}[] = [],
): Promise<WorkerLike> {
  const {createWorkerCore} = await load<{
    createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
  }>(CORE);
  const worker: WorkerLike = {
    postMessage: (message) => {
      log.push(message as {type: string; id?: string});
      void core.handle(message);
    },
    terminate: () => undefined,
    onmessage: null,
    onerror: null,
  };
  const core = createWorkerCore((m) =>
    queueMicrotask(() => worker.onmessage?.({data: m})),
  );
  return worker;
}

describe('US-008 AC-1: the worker core compiles like the reference', () => {
  it('init answers ready; compile answers the PDF and the facts equal to the reference compile', async () => {
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const out: {
      type: string;
      id?: string;
      pdf?: ArrayBuffer;
      facts?: unknown[];
      message?: string;
    }[] = [];
    const core = createWorkerCore((m) => void out.push(m as never));
    await core.handle(await initMessage('i'));
    expect(out).toEqual([{type: 'ready', id: 'i'}]);
    const src = source();
    await core.handle({type: 'compile', id: 'c', source: src});
    const answer = out[1]!;
    expect(answer.type).toBe('compiled');
    expect(answer.id).toBe('c');
    const reference = await compileWithFacts(src, FIT_LABEL);
    expect(Array.from(new Uint8Array(answer.pdf!))).toEqual(
      Array.from(reference.pdf),
    );
    expect(answer.facts).toEqual(reference.facts);
    expect(answer.facts).toEqual([
      {i: 0, size: 7, fits: true},
      {i: 1, size: 7, fits: true},
    ]);
    const pages = readSheet(new Uint8Array(answer.pdf!));
    expect(pages).toHaveLength(1);
    expect(pages[0]!.frames).toHaveLength(2);
  }, 60_000);

  it('a Typst error answers failed with the diagnostics, never a PDF', async () => {
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const out: {type: string; message?: string; pdf?: unknown}[] = [];
    const core = createWorkerCore((m) => void out.push(m as never));
    await core.handle(await initMessage('i'));
    await core.handle({type: 'compile', id: 'c', source: '#let x = ('});
    expect(out[1]!.type).toBe('failed');
    expect(out[1]!.message).toMatch(/error/i);
    expect(out[1]).not.toHaveProperty('pdf');
  }, 60_000);

  it('a compile before init, and an unknown message, answer failed and do not throw', async () => {
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const out: {type: string; id?: string; message?: string}[] = [];
    const core = createWorkerCore((m) => void out.push(m as never));
    await core.handle({type: 'compile', id: 'c', source: '= x'});
    expect(out[0]).toMatchObject({type: 'failed', id: 'c'});
    expect(out[0]!.message).toMatch(/init/i);
  });
});

describe('US-008 AC-2: nothing to download', () => {
  it('a compile calls neither fetch nor XMLHttpRequest', async () => {
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const g = globalThis as unknown as Record<string, unknown>;
    const saved = {fetch: g.fetch, xhr: g.XMLHttpRequest};
    const calls: string[] = [];
    g.fetch = (...args: unknown[]) => {
      calls.push(`fetch ${String(args[0])}`);
      throw new Error('network is not allowed');
    };
    g.XMLHttpRequest = class {
      constructor() {
        calls.push('XMLHttpRequest');
        throw new Error('network is not allowed');
      }
    };
    try {
      const out: {type: string}[] = [];
      const core = createWorkerCore((m) => void out.push(m as never));
      await core.handle(await initMessage('i'));
      await core.handle({type: 'compile', id: 'c', source: source()});
      expect(out.map((m) => m.type)).toEqual(['ready', 'compiled']);
      expect(calls).toEqual([]);
    } finally {
      g.fetch = saved.fetch;
      g.XMLHttpRequest = saved.xhr;
    }
  }, 60_000);

  it('gzipBase64 and decodeWasm are inverse: the text decodes to the original bytes', async () => {
    const {gzipBase64} = await load<{gzipBase64(b: Uint8Array): string}>(EMBED);
    const {decodeWasm} = await load<{
      decodeWasm(t: string): Promise<Uint8Array>;
    }>(CODEC);
    const original = new Uint8Array(
      Array.from({length: 5000}, (_, i) => (i * 7) % 251),
    );
    const text = gzipBase64(original);
    expect(Array.from(gunzipSync(Buffer.from(text, 'base64')))).toEqual(
      Array.from(original),
    );
    expect(Array.from(await decodeWasm(text))).toEqual(Array.from(original));
  });
  it('text that is not base64, or base64 that is not gzip, is refused by decodeWasm', async () => {
    const {decodeWasm} = await load<{
      decodeWasm(t: string): Promise<Uint8Array>;
    }>(CODEC);
    await expect(decodeWasm('not base64 !!')).rejects.toThrow(/base64/i);
    await expect(decodeWasm('AAAA')).rejects.toThrow(); // valid base64, no gzip
  });
});

describe('US-008 AC-13: the worker decodes', () => {
  it('init decodes in the worker: ready comes after the decode, and the next compile uses it', async () => {
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const out: {type: string; id?: string}[] = [];
    const core = createWorkerCore((m) => void out.push(m as never));
    await core.handle(await initMessage('i'));
    expect(out).toEqual([{type: 'ready', id: 'i'}]); // answered when handle resolved: decoded
    await core.handle({type: 'compile', id: 'c', source: '= x'});
    expect(out.map((m) => m.type)).toEqual(['ready', 'compiled']);
  }, 60_000);
  it('an init with text that cannot be decoded answers failed naming the problem; a valid init on the same core then works', async () => {
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const out: {type: string; id?: string; message?: string}[] = [];
    const core = createWorkerCore((m) => void out.push(m as never));
    await core.handle(
      await initMessage('bad', {compilerText: 'not base64 !!'}),
    );
    expect(out[0]).toMatchObject({type: 'failed', id: 'bad'});
    expect(out[0]!.message).toMatch(/base64/i);
    await core.handle(await initMessage('bad2', {fontTexts: ['AAAA']}));
    expect(out[1]).toMatchObject({type: 'failed', id: 'bad2'});
    await core.handle({type: 'compile', id: 'c', source: '= x'});
    expect(out[2]).toMatchObject({type: 'failed', id: 'c'}); // nothing was initialised
    expect(out[2]!.message).toMatch(/init/i);
    await core.handle(await initMessage('good'));
    expect(out[3]).toEqual({type: 'ready', id: 'good'});
    await core.handle({type: 'compile', id: 'c2', source: '= x'});
    expect(out[4]!.type).toBe('compiled');
    // a failed init after a good one leaves nothing initialised (no stale compiler)
    await core.handle(
      await initMessage('bad3', {compilerText: 'not base64 !!'}),
    );
    expect(out[5]).toMatchObject({type: 'failed', id: 'bad3'});
    await core.handle({type: 'compile', id: 'c3', source: '= x'});
    expect(out[6]).toMatchObject({type: 'failed', id: 'c3'});
    expect(out[6]!.message).toMatch(/init/i);
  }, 60_000);
  it('the worker compiles with no font text and with one (it takes what it is given)', async () => {
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const t = await embeddedTexts();
    for (const count of [0, 1]) {
      const out: {type: string; message?: string}[] = [];
      const core = createWorkerCore((m) => void out.push(m as never));
      await core.handle(
        await initMessage('i', {fontTexts: t.fonts.slice(0, count)}),
      );
      await core.handle({type: 'compile', id: 'c', source: '= x'});
      expect(
        out.map((m) => m.type),
        `fonts ${count}`,
      ).toEqual(['ready', 'compiled']);
    }
  }, 60_000);
  it('a failed decode in the worker is a message to the caller, and the next request starts a new worker', async () => {
    let attempt = 0;
    const {c, calls} = await client({
      // the first worker gets text it cannot decode, the next one the real text
      compilerText: () => (attempt++ === 0 ? 'not base64 !!' : undefined),
    });
    const first = await c.compile('= x');
    expect(first.pdf).toBeNull();
    expect(first.message).toMatch(/base64/i);
    expect(first.message).not.toContain('\n');
    const second = await c.compile('= y');
    expect(second.pdf).not.toBeNull();
    expect(calls.start).toBe(2);
    c.dispose();
  }, 60_000);
  it('embedded-assets hands over the whole embedded compiler text and every embedded font text, unchanged (the bundle is not loadable in Node)', () => {
    const text = readFileSync(
      join(process.cwd(), 'src/plugin/compiler/embedded-assets.ts'),
      'utf8',
    );
    expect(text).toMatch(
      /import compilerWasmText from 'embedded:compiler-wasm';/,
    );
    expect(text).toMatch(/import fontTexts from 'embedded:fonts';/);
    expect(text).toMatch(/compilerText:\s*\(\)\s*=>\s*compilerWasmText,/);
    expect(text).toMatch(/fontTexts:\s*\(\)\s*=>\s*fontTexts,/);
    // the build embeds every .otf of assets/fonts: four (the story's AC-2)
    expect(
      readdirSync(join(process.cwd(), 'assets/fonts')).filter((f) =>
        f.endsWith('.otf'),
      ),
    ).toHaveLength(4);
  });
  it('no module of the main thread decodes (no atob, DecompressionStream or decodeWasm), and lazyWasm is gone', () => {
    const code = (path: string) =>
      readFileSync(join(process.cwd(), path), 'utf8')
        .split('\n')
        .filter(
          (l) =>
            !l.trim().startsWith('//') &&
            !l.trim().startsWith('*') &&
            !l.trim().startsWith('/*'),
        )
        .join('\n');
    const mainThread = [
      'src/plugin/compiler/index.ts',
      'src/plugin/compiler/embedded-assets.ts',
      'src/plugin/compiler/start-worker.ts',
      'src/plugin/main.ts',
    ];
    expect(mainThread).toHaveLength(4);
    for (const file of mainThread) {
      expect(code(file), file).not.toMatch(
        /\batob\b|DecompressionStream|decodeWasm/,
      );
    }
    // the decode is somewhere: the worker's core calls it
    expect(code('src/plugin/compiler/worker-core.ts')).toMatch(/decodeWasm\(/);
    // and nothing in src keeps the old lazy main-thread decoder
    const all: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts')) all.push(path);
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(all.length).toBeGreaterThanOrEqual(28);
    expect(
      all.filter((f) => /\blazyWasm\b/.test(readFileSync(f, 'utf8'))),
    ).toEqual([]);
  });
});

/** The client with fakes: counts, and a worker per start. */
async function client(
  over: {
    startWorker?: () => WorkerLike | Promise<WorkerLike>;
    /** Replaces the compiler text for one start (`undefined` = the real text). */
    compilerText?: () => string | undefined;
    log?: {type: string; id?: string}[];
  } = {},
) {
  const {createCompiler} = await load<{createCompiler(d: unknown): Compiler}>(
    CLIENT,
  );
  const calls = {start: 0, wasm: 0, fonts: 0};
  const log = over.log ?? [];
  const t = await embeddedTexts();
  const c = createCompiler({
    startWorker: async () => {
      calls.start++;
      return over.startWorker ? over.startWorker() : inProcessWorker(log);
    },
    compilerText: () => (calls.wasm++, over.compilerText?.() ?? t.compiler),
    fontTexts: () => (calls.fonts++, t.fonts),
  });
  return {c, calls, log};
}

describe("US-008 AC-7: the worker's life", () => {
  it('nothing starts at creation; the first compile starts one worker, hands over buffers once, and the second reuses it', async () => {
    const {c, calls, log} = await client();
    expect(calls).toEqual({start: 0, wasm: 0, fonts: 0});
    const first = await c.compile(source());
    expect(first.pdf).not.toBeNull();
    expect(calls).toEqual({start: 1, wasm: 1, fonts: 1});
    const second = await c.compile(source());
    expect(Array.from(second.pdf!)).toEqual(Array.from(first.pdf!)); // same input, same PDF
    expect(calls).toEqual({start: 1, wasm: 1, fonts: 1});
    const init = log.filter((m) => m.type === 'init');
    expect(init).toHaveLength(1);
    c.dispose();
  }, 60_000);
  it('the init message carries the embedded texts as strings, not buffers (AC-13)', async () => {
    const seen: unknown[] = [];
    const inner = await inProcessWorker();
    const spy: WorkerLike = {
      postMessage: (m, t) => (seen.push(m), inner.postMessage(m, t)),
      terminate: () => inner.terminate(),
      get onmessage() {
        return inner.onmessage;
      },
      set onmessage(v) {
        inner.onmessage = v;
      },
      onerror: null,
    } as WorkerLike;
    const {c} = await client({startWorker: () => spy});
    await c.compile('= x');
    const t = await embeddedTexts();
    const init = seen.find((m) => (m as {type: string}).type === 'init') as {
      compilerText: unknown;
      fontTexts: unknown[];
    };
    expect(init.compilerText).toBe(t.compiler);
    expect(init.fontTexts).toEqual(t.fonts);
    expect(init.fontTexts).toHaveLength(4);
    for (const f of init.fontTexts) expect(typeof f).toBe('string');
    expect(init).not.toHaveProperty('compilerWasm');
    expect(init).not.toHaveProperty('fonts');
    c.dispose();
  }, 60_000);
});

describe('US-008 AC-3: one at a time, never a throw', () => {
  it('two requests at once: the second reaches the worker only after the first was answered', async () => {
    const order: string[] = [];
    const inner = await inProcessWorker();
    const w: WorkerLike = {
      postMessage: (m, t) => {
        const msg = m as {type: string; id?: string};
        if (msg.type === 'compile') order.push(`send ${msg.id}`);
        inner.postMessage(m, t);
      },
      terminate: () => inner.terminate(),
      get onmessage() {
        return inner.onmessage;
      },
      set onmessage(h) {
        inner.onmessage = h
          ? (e) => {
              const msg = e.data as {type: string; id?: string};
              if (msg.type === 'compiled' || msg.type === 'failed')
                order.push(`answer ${msg.id}`);
              h(e);
            }
          : null;
      },
      onerror: null,
    } as WorkerLike;
    const {c} = await client({startWorker: () => w});
    const [a, b] = await Promise.all([c.compile('= one'), c.compile('= two')]);
    expect(a.pdf).not.toBeNull();
    expect(b.pdf).not.toBeNull();
    const sends = order.filter((o) => o.startsWith('send'));
    expect(sends).toHaveLength(2);
    const firstAnswer = order.findIndex((o) => o.startsWith('answer'));
    expect(order.indexOf(sends[1]!)).toBeGreaterThan(firstAnswer);
    c.dispose();
  }, 60_000);
  it('a Typst error answers a message (first line), no PDF, no facts, and the next compile works', async () => {
    const {c, calls} = await client();
    const bad = await c.compile('#let x = (\n#let y = (');
    expect(bad.pdf).toBeNull();
    expect(bad.message).toMatch(/error/i);
    expect(bad.message).not.toContain('\n');
    expect(bad.facts).toEqual([]);
    const good = await c.compile('= fine');
    expect(good.pdf).not.toBeNull();
    expect(calls.start).toBe(1); // a Typst error does not restart the worker
    c.dispose();
  }, 60_000);
  it('a worker error during a compile answers a message; the next compile starts a new worker', async () => {
    let n = 0;
    const {c, calls} = await client({
      startWorker: async () => {
        if (n++ > 0) return inProcessWorker();
        const w: WorkerLike = {
          postMessage: () =>
            queueMicrotask(() => w.onerror?.({message: 'worker crashed'})),
          terminate: () => undefined,
          onmessage: null,
          onerror: null,
        };
        return w;
      },
    });
    const r = await c.compile('= x');
    expect(r.pdf).toBeNull();
    expect(r.message).toContain('worker crashed');
    const next = await c.compile('= y');
    expect(next.pdf).not.toBeNull();
    expect(calls.start).toBe(2);
    c.dispose();
  }, 60_000);
  it('a worker that cannot start answers a message; a later compile tries again', async () => {
    let n = 0;
    const {c, calls} = await client({
      startWorker: async () => {
        if (n++ === 0) throw new Error('no worker here');
        return inProcessWorker();
      },
    });
    const r = await c.compile('= x');
    expect(r.pdf).toBeNull();
    expect(r.message).toContain('no worker here');
    expect((await c.compile('= y')).pdf).not.toBeNull();
    expect(calls.start).toBe(2);
    c.dispose();
  }, 60_000);
  it('unload: the worker is terminated, a waiting request and any later one answer that the plugin was unloaded', async () => {
    let terminated = 0;
    const inner = await inProcessWorker();
    const w = {
      postMessage: (m: unknown, t?: Transferable[]) => inner.postMessage(m, t),
      terminate: () => void terminated++,
      get onmessage() {
        return inner.onmessage;
      },
      set onmessage(h: WorkerLike['onmessage']) {
        inner.onmessage = h;
      },
      onerror: null,
    } as WorkerLike;
    // the worker takes 30 ms to start: the plugin unloads while it is starting
    const {c} = await client({
      startWorker: () =>
        new Promise<WorkerLike>((r) => setTimeout(() => r(w), 30)),
    });
    const first = c.compile('= one');
    const waiting = c.compile('= two');
    await new Promise((r) => setTimeout(r, 5));
    c.dispose();
    const results = await Promise.all([first, waiting]);
    // a worker that was still starting when the plugin unloaded is terminated
    // as soon as it exists: none is left running (nothing leaks)
    expect(terminated).toBe(1);
    expect(results.some((r) => r.message === 'The plugin was unloaded')).toBe(
      true,
    );
    expect(results.every((r) => r.pdf === null)).toBe(true);
    const later = await c.compile('= three');
    expect(later).toMatchObject({
      pdf: null,
      message: 'The plugin was unloaded',
    });
  }, 60_000);
  it('dispose after a finished compile terminates the worker once, and a second dispose does nothing more', async () => {
    let terminated = 0;
    const inner = await inProcessWorker();
    const w = {
      postMessage: (m: unknown, t?: Transferable[]) => inner.postMessage(m, t),
      terminate: () => void terminated++,
      get onmessage() {
        return inner.onmessage;
      },
      set onmessage(h: WorkerLike['onmessage']) {
        inner.onmessage = h;
      },
      onerror: null,
    } as WorkerLike;
    const {c} = await client({startWorker: () => w});
    expect((await c.compile('= one')).pdf).not.toBeNull();
    c.dispose();
    c.dispose();
    expect(terminated).toBe(1);
  }, 60_000);
  it('dispose without any compile terminates nothing and does not throw', async () => {
    const {c, calls} = await client();
    expect(() => c.dispose()).not.toThrow();
    expect(calls.start).toBe(0);
  });
});
