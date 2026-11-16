// US-010 AC-4: the compile service's `coverage(fonts?)`: it asks the worker
// (`{type: 'font-info', id, fonts?}`, the extra fonts as copied buffers, none
// when none is given), waits in the queue of the compiles (one request at a
// time), answers `{ok: true, faces}` or `{ok: false, message}` and never
// rejects; after `dispose` it answers the unloaded message. The worker is a fake
// (SCAR-023: its answers are the shapes of `glyph-worker.test.ts`).
// Red until the code ticket (G2, 2026-11-17).
import {describe, expect, it} from 'vitest';

const CLIENT = '../../src/plugin/compiler/index';
interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: {data: unknown}) => void) | null;
  onerror: ((event: {message: string}) => void) | null;
}
type Coverage =
  | {ok: true; faces: {family: string; coverage: number[]}[]}
  | {ok: false; message: string};
interface Compiler {
  compile(source: string): Promise<{pdf: Uint8Array | null}>;
  coverage(fonts?: readonly Uint8Array[]): Promise<Coverage>;
  dispose(): void;
}
const load = async (): Promise<{
  createCompiler(deps: unknown): Compiler;
  UNLOADED: string;
}> => {
  const path: string = CLIENT;
  return (await import(/* @vite-ignore */ path)) as never;
};

const FACES = [{family: 'Libertinus Serif', coverage: [32, 8]}];
function fake(
  answer: (m: {type: string; id: string; fonts?: ArrayBuffer[]}) => unknown,
) {
  const sent: Record<string, unknown>[] = [];
  const worker: WorkerLike = {
    onmessage: null,
    onerror: null,
    terminate() {},
    postMessage(message) {
      const m = message as {type: string; id: string; fonts?: ArrayBuffer[]};
      sent.push(m);
      const reply =
        m.type === 'init'
          ? {type: 'ready', id: m.id}
          : m.type === 'compile'
            ? {type: 'compiled', id: m.id, pdf: new ArrayBuffer(4), facts: []}
            : answer(m);
      queueMicrotask(() => worker.onmessage?.({data: reply}));
    },
  };
  return {
    deps: {
      startWorker: () => worker,
      compilerText: () => 'c',
      fontTexts: () => ['f'],
    },
    sent,
  };
}

describe('US-010 AC-4: the compile service asks the worker for the coverage', () => {
  it('without extra fonts: one `font-info` message with an id and no `fonts` key; the faces come back', async () => {
    const {createCompiler} = await load();
    const {deps, sent} = fake((m) => ({
      type: 'font-info-result',
      id: m.id,
      faces: FACES,
    }));
    const c = createCompiler(deps);
    expect(await c.coverage()).toEqual({ok: true, faces: FACES});
    const ask = sent.find((m) => m.type === 'font-info')!;
    expect(typeof ask.id).toBe('string');
    expect('fonts' in ask).toBe(false);
  });
  it('an empty list of extra fonts is none: no `fonts` key either (the run passes [] when no statblock is drawn)', async () => {
    const {createCompiler} = await load();
    const {deps, sent} = fake((m) => ({
      type: 'font-info-result',
      id: m.id,
      faces: FACES,
    }));
    const c = createCompiler(deps);
    await c.coverage([]);
    const ask = sent.find((m) => m.type === 'font-info')!;
    expect('fonts' in ask).toBe(false);
  });
  it("with extra fonts: the buffers are copies (the caller's bytes stay usable) with the same bytes", async () => {
    const {createCompiler} = await load();
    const {deps, sent} = fake((m) => ({
      type: 'font-info-result',
      id: m.id,
      faces: FACES,
    }));
    const c = createCompiler(deps);
    const font = new Uint8Array([9, 8, 7]);
    await c.coverage([font]);
    const ask = sent.find((m) => m.type === 'font-info') as {
      fonts: ArrayBuffer[];
    };
    expect(ask.fonts).toHaveLength(1);
    expect([...new Uint8Array(ask.fonts[0]!)]).toEqual([9, 8, 7]);
    expect(font.buffer.byteLength).toBeGreaterThan(0); // not detached
  });
  it('a font given as a view into a larger buffer is sent as exactly its own bytes', async () => {
    const {createCompiler} = await load();
    const {deps, sent} = fake((m) => ({
      type: 'font-info-result',
      id: m.id,
      faces: FACES,
    }));
    const c = createCompiler(deps);
    const whole = new Uint8Array([0, 1, 2, 3, 4, 5]);
    await c.coverage([whole.subarray(2, 5)]);
    const ask = sent.find((m) => m.type === 'font-info') as {
      fonts: ArrayBuffer[];
    };
    expect([...new Uint8Array(ask.fonts[0]!)]).toEqual([2, 3, 4]);
  });
  it('a failure of the worker is an `ok: false` answer with the first line of the message, never a rejection', async () => {
    const {createCompiler} = await load();
    const {deps} = fake((m) => ({
      type: 'failed',
      id: m.id,
      message: 'No font\nat line 1',
    }));
    const c = createCompiler(deps);
    expect(await c.coverage()).toEqual({ok: false, message: 'No font'});
  });
  it('a worker that stops during the request, or cannot start, is an `ok: false` answer, never a rejection', async () => {
    const {createCompiler} = await load();
    const {deps} = fake(() => undefined);
    const stopping = {
      ...deps,
      startWorker: () => {
        const worker = (deps.startWorker as () => WorkerLike)();
        const post = worker.postMessage.bind(worker);
        worker.postMessage = (message, transfer) => {
          if ((message as {type: string}).type === 'font-info')
            queueMicrotask(() =>
              worker.onerror?.({message: 'The worker stopped'}),
            );
          else post(message, transfer);
        };
        return worker;
      },
    };
    expect(await createCompiler(stopping).coverage()).toEqual({
      ok: false,
      message: 'The worker stopped',
    });
    const broken = {
      ...deps,
      startWorker: () => {
        throw new Error('No worker here');
      },
    };
    expect(await createCompiler(broken).coverage()).toEqual({
      ok: false,
      message: 'No worker here',
    });
  });
  it('the request waits in the queue of the compiles: compile, coverage, compile in that order', async () => {
    const {createCompiler} = await load();
    const {deps, sent} = fake((m) => ({
      type: 'font-info-result',
      id: m.id,
      faces: FACES,
    }));
    const c = createCompiler(deps);
    await Promise.all([c.compile('a'), c.coverage(), c.compile('b')]);
    expect(sent.filter((m) => m.type !== 'init').map((m) => m.type)).toEqual([
      'compile',
      'font-info',
      'compile',
    ]);
  });
  it('after dispose the answer is the unloaded message', async () => {
    const {createCompiler, UNLOADED} = await load();
    const {deps} = fake((m) => ({
      type: 'font-info-result',
      id: m.id,
      faces: FACES,
    }));
    const c = createCompiler(deps);
    c.dispose();
    expect(await c.coverage()).toEqual({ok: false, message: UNLOADED});
  });
});
