// US-008 AC-3, AC-7: the compile service. One worker, created on the first
// compile, reused, replaced after an error, terminated on unload. Adapted in
// idea from Obsidian2Typst's compiler service (same author, MIT licence), cut
// down to one request at a time and no throw.

/** The part of a Web Worker the service uses. */
export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: {data: unknown}) => void) | null;
  onerror: ((event: {message?: string}) => void) | null;
}

/** What the service needs from outside (tests give fakes). */
export interface CompilerDeps {
  /** Creates a worker from the embedded source; called once per worker. */
  startWorker(): WorkerLike | Promise<WorkerLike>;
  /** The embedded compiler as gzip + base64 text; the worker decodes it (AC-13). */
  compilerText(): string;
  /** The embedded font files as gzip + base64 texts; the worker decodes them. */
  fontTexts(): string[];
}

/**
 * US-004 AC-12: what one compile takes besides its source: files at their paths
 * next to the source and font files added to the plugin's own. The worker keeps
 * neither for the next compile.
 */
export interface CompileExtra {
  files?: readonly {path: string; bytes: Uint8Array}[];
  fonts?: readonly Uint8Array[];
}

/** The outcome of one compile; `message` is set exactly when `pdf` is null. */
export interface CompileResult {
  pdf: Uint8Array | null;
  facts: unknown[];
  message?: string;
}

/** The service: `compile` never rejects. */
export interface Compiler {
  /** US-004 AC-12: `extra` is for this compile only. */
  compile(source: string, extra?: CompileExtra): Promise<CompileResult>;
  /**
   * US-010 AC-4: the faces of the fonts a compile will have: the plugin's own
   * and `fonts` (none: an empty list is none). In the queue of the compiles;
   * never rejects.
   */
  coverage(fonts?: readonly Uint8Array[]): Promise<CoverageResult>;
  dispose(): void;
}

/** US-010 AC-4: the answer of `coverage`: the faces, or why there are none. */
export type CoverageResult =
  | {ok: true; faces: {family: string; coverage: number[]}[]}
  | {ok: false; message: string};

/** The message every request gets once the plugin is unloaded. */
export const UNLOADED = 'The plugin was unloaded';

const failed = (message: string): CompileResult => ({
  pdf: null,
  facts: [],
  message,
});

const firstLine = (text: string): string => text.split('\n')[0] ?? text;

interface Answer {
  type?: string;
  id?: string;
  message?: string;
  pdf?: ArrayBuffer;
  facts?: unknown;
  faces?: unknown;
}

/** A waiter for the answer to one request id. */
interface Waiter {
  id: string;
  accept(answer: Answer): void;
  fail(message: string): void;
}

/**
 * US-008 | AC-3, AC-7: The compile service over `deps`.
 *
 * Nothing starts at creation (AC-7). Requests run one at a time in the order
 * they came (AC-3). A Typst error answers a message and keeps the worker; a
 * worker error, or a worker that cannot start, answers a message and the next
 * request starts a new worker. `dispose` terminates the worker (once), makes
 * the running and every waiting or later request answer `UNLOADED`, and
 * terminates a worker that was still starting as soon as it exists.
 */
export function createCompiler(deps: CompilerDeps): Compiler {
  let disposed = false;
  let worker: WorkerLike | null = null;
  let waiter: Waiter | null = null;
  let tail: Promise<unknown> = Promise.resolve();
  let counter = 0;

  const dropWorker = (): void => {
    const w = worker;
    worker = null;
    w?.terminate();
  };

  /** Sends `message` and waits for the worker's answer to its id. */
  const ask = (
    w: WorkerLike,
    id: string,
    message: unknown,
    transfer: Transferable[] = [],
  ): Promise<Answer> =>
    new Promise<Answer>((resolve, reject) => {
      waiter = {
        id,
        accept: resolve,
        fail: (m) => reject(new Error(m)),
      };
      w.postMessage(message, transfer);
    });

  const start = async (): Promise<WorkerLike> => {
    // US-008 AC-13: the texts are handed over as they are; the worker decodes.
    const compilerText = deps.compilerText();
    const fontTexts = deps.fontTexts();
    const w = await deps.startWorker();
    if (disposed) {
      // The plugin unloaded while the worker started: none is left running.
      w.terminate();
      throw new Error(UNLOADED);
    }
    w.onmessage = ({data}) => {
      const answer = data as Answer;
      if (waiter !== null && answer.id === waiter.id) {
        const current = waiter;
        waiter = null;
        current.accept(answer);
      }
    };
    w.onerror = (event) => {
      const current = waiter;
      waiter = null;
      dropWorker();
      current?.fail(event.message ?? 'The worker stopped');
    };
    worker = w;
    const id = `init-${++counter}`;
    const answer = await ask(w, id, {
      type: 'init',
      id,
      compilerText,
      fontTexts,
    });
    if (answer.type !== 'ready') {
      dropWorker();
      throw new Error(firstLine(answer.message ?? 'The worker did not start'));
    }
    return w;
  };

  /** A started worker, a new one when the last one ended. */
  const ensure = async (): Promise<WorkerLike> => worker ?? start();

  const run = async (
    source: string,
    extra?: CompileExtra,
  ): Promise<CompileResult> => {
    if (disposed) return failed(UNLOADED);
    try {
      const w = await ensure();
      if (disposed) return failed(UNLOADED);
      const id = `compile-${++counter}`;
      // Copies, so the caller's buffers stay usable; nothing is sent when none is given.
      const own = (b: Uint8Array): ArrayBuffer =>
        b.buffer.slice(
          b.byteOffset,
          b.byteOffset + b.byteLength,
        ) as ArrayBuffer;
      const message: Record<string, unknown> = {type: 'compile', id, source};
      if (extra?.files !== undefined && extra.files.length > 0) {
        message.files = extra.files.map((f) => ({
          path: f.path,
          bytes: own(f.bytes),
        }));
      }
      if (extra?.fonts !== undefined && extra.fonts.length > 0) {
        message.fonts = extra.fonts.map(own);
      }
      const answer = await ask(w, id, message);
      if (answer.type === 'compiled' && answer.pdf instanceof ArrayBuffer) {
        return {
          pdf: new Uint8Array(answer.pdf),
          facts: Array.isArray(answer.facts) ? (answer.facts as unknown[]) : [],
        };
      }
      return failed(firstLine(answer.message ?? 'The compile failed'));
    } catch (error) {
      return failed(
        firstLine(error instanceof Error ? error.message : String(error)),
      );
    }
  };

  /**
   * US-010 AC-4: asks the worker for the coverage of its fonts and `fonts`.
   * The buffers are copies (the caller's bytes stay usable); no `fonts` key is
   * sent for none. Every failure is an `ok: false` answer with the first line of
   * the message.
   */
  const coverageRun = async (
    fonts?: readonly Uint8Array[],
  ): Promise<CoverageResult> => {
    if (disposed) return {ok: false, message: UNLOADED};
    try {
      const w = await ensure();
      if (disposed) return {ok: false, message: UNLOADED};
      const id = `font-info-${++counter}`;
      const message: Record<string, unknown> = {type: 'font-info', id};
      if (fonts !== undefined && fonts.length > 0) {
        message.fonts = fonts.map(
          (b) =>
            b.buffer.slice(
              b.byteOffset,
              b.byteOffset + b.byteLength,
            ) as ArrayBuffer,
        );
      }
      const answer = await ask(w, id, message);
      if (answer.type === 'font-info-result' && Array.isArray(answer.faces)) {
        return {
          ok: true,
          faces: answer.faces as {family: string; coverage: number[]}[],
        };
      }
      return {
        ok: false,
        message: firstLine(answer.message ?? 'The font information failed'),
      };
    } catch (error) {
      return {
        ok: false,
        message: firstLine(
          error instanceof Error ? error.message : String(error),
        ),
      };
    }
  };

  return {
    compile(source: string, extra?: CompileExtra): Promise<CompileResult> {
      if (disposed) return Promise.resolve(failed(UNLOADED));
      const result = tail.then(() => run(source, extra));
      tail = result;
      return result;
    },
    coverage(fonts?: readonly Uint8Array[]): Promise<CoverageResult> {
      if (disposed) return Promise.resolve({ok: false, message: UNLOADED});
      const result = tail.then(() => coverageRun(fonts));
      tail = result;
      return result;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      const current = waiter;
      waiter = null;
      dropWorker();
      current?.fail(UNLOADED);
    },
  };
}
