// US-008 AC-1, AC-2, AC-3, AC-7: the compile worker's core with the real Typst
// in Node (the reference of AC-1), the lazy embedded assets, and the client that
// queues requests, restarts after an error and ends on unload. The worker is a
// fake that runs the core in the same process. Expected values: the test
// reference (`compileWithFacts`, US-001) and the story. Red until the tickets.
import {readFileSync} from 'node:fs';
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
const buf = (b: Uint8Array): ArrayBuffer =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

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
    await core.handle({
      type: 'init',
      id: 'i',
      compilerWasm: buf(WASM),
      fonts: FONT_FILES.map(buf),
    });
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
    await core.handle({
      type: 'init',
      id: 'i',
      compilerWasm: buf(WASM),
      fonts: FONT_FILES.map(buf),
    });
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
      await core.handle({
        type: 'init',
        id: 'i',
        compilerWasm: buf(WASM),
        fonts: FONT_FILES.map(buf),
      });
      await core.handle({type: 'compile', id: 'c', source: source()});
      expect(out.map((m) => m.type)).toEqual(['ready', 'compiled']);
      expect(calls).toEqual([]);
    } finally {
      g.fetch = saved.fetch;
      g.XMLHttpRequest = saved.xhr;
    }
  }, 60_000);

  it('the embedded text decodes to the original bytes (gzip + base64), only when asked', async () => {
    const {gzipBase64} = await load<{gzipBase64(b: Uint8Array): string}>(EMBED);
    const {lazyWasm} = await load<{
      lazyWasm(
        t: string,
        d?: (t: string) => Promise<Uint8Array>,
      ): () => Promise<Uint8Array>;
    }>(CODEC);
    const original = new Uint8Array(
      Array.from({length: 5000}, (_, i) => (i * 7) % 251),
    );
    const text = gzipBase64(original);
    expect(Array.from(gunzipSync(Buffer.from(text, 'base64')))).toEqual(
      Array.from(original),
    );
    let decodes = 0;
    const {decodeWasm} = await load<{
      decodeWasm(t: string): Promise<Uint8Array>;
    }>(CODEC);
    const get = lazyWasm(text, (t) => (decodes++, decodeWasm(t)));
    expect(decodes).toBe(0); // creating it decodes nothing
    expect(Array.from(await get())).toEqual(Array.from(original));
    expect(Array.from(await get())).toEqual(Array.from(original));
    expect(decodes).toBe(1); // once
  });
  it('invalid text is refused, and a failed decode is tried again at the next call', async () => {
    const {lazyWasm, decodeWasm} = await load<{
      lazyWasm(
        t: string,
        d: (t: string) => Promise<Uint8Array>,
      ): () => Promise<Uint8Array>;
      decodeWasm(t: string): Promise<Uint8Array>;
    }>(CODEC);
    await expect(decodeWasm('not base64 !!')).rejects.toThrow(/base64/i);
    let n = 0;
    const get = lazyWasm('x', async () => {
      if (n++ === 0) throw new Error('first try fails');
      return new Uint8Array([1]);
    });
    await expect(get()).rejects.toThrow('first try fails');
    expect(Array.from(await get())).toEqual([1]);
  });
});

/** The client with fakes: counts, and a worker per start. */
async function client(
  over: {
    startWorker?: () => WorkerLike | Promise<WorkerLike>;
    log?: {type: string; id?: string}[];
  } = {},
) {
  const {createCompiler} = await load<{createCompiler(d: unknown): Compiler}>(
    CLIENT,
  );
  const calls = {start: 0, wasm: 0, fonts: 0};
  const log = over.log ?? [];
  const c = createCompiler({
    startWorker: async () => {
      calls.start++;
      return over.startWorker ? over.startWorker() : inProcessWorker(log);
    },
    compilerWasm: async () => (calls.wasm++, new Uint8Array(WASM)),
    fonts: async () => (
      calls.fonts++,
      FONT_FILES.map((f) => new Uint8Array(f))
    ),
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
  it('the init message carries the WebAssembly and the fonts as ArrayBuffers', async () => {
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
    const init = seen.find((m) => (m as {type: string}).type === 'init') as {
      compilerWasm: unknown;
      fonts: unknown[];
    };
    expect(init.compilerWasm).toBeInstanceOf(ArrayBuffer);
    expect(init.fonts).toHaveLength(4);
    for (const f of init.fonts) expect(f).toBeInstanceOf(ArrayBuffer);
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
