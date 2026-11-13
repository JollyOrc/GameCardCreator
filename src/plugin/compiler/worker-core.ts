// US-008 AC-1, AC-2: the logic of the compile worker as a plain function over
// `post`, so the tests run it in Node with the real typst.ts and the worker
// entry only connects it to `self`. Adapted from Obsidian2Typst's
// worker-core.ts (same author, MIT licence), cut down: no renderer, no font
// info, no scan.
import {CompileFormatEnum} from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';
import {TypstSnippet} from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';
import {loadFonts} from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';
import {FIT_LABEL} from '../../core/skill/fit';
import {decodeWasm} from './wasm-codec';

/** Sends a message to the plugin; `transfer` lists buffers that move. */
export type Post = (message: unknown, transfer?: Transferable[]) => void;

/** US-008 AC-13: the embedded texts (gzip + base64) as the build holds them. */
interface InitMessage {
  type: 'init';
  id: string;
  compilerText: string;
  fontTexts: string[];
}
interface CompileMessage {
  type: 'compile';
  id: string;
  source: string;
  /** US-004 AC-12: files at their paths next to the source, for this compile only. */
  files?: {path: string; bytes: ArrayBuffer}[];
  /** US-004 AC-12: font files added to the plugin's own, for this compile only. */
  fonts?: ArrayBuffer[];
}

/** One diagnostic of the compiler (`range` is `line:column-line:column`, from 0). */
interface Diagnostic {
  path: string;
  range: string;
  severity: string;
  message: string;
}

/** The main file of every compile (the worker holds one document). */
const MAIN = '/sheet.typ';

/**
 * US-008 | AC-1: A diagnostic as `<path>:<line>:<column>: <severity>: <text>`
 * (lines and columns from 1), the text cut at its first line (a package error
 * carries a stack trace).
 */
function diagnosticLine(d: Diagnostic, source = ''): string {
  const start = /^(\d+):(\d+)/.exec(d.range);
  const where = start
    ? `${Number(start[1]) + 1}:${Number(start[2]) + 1}`
    : '1:1';
  let text = d.message.split('\n')[0] ?? '';
  // US-004 AC-12: Typst does not name the file it could not load; the range of
  // the error is the argument that named it, so that source text is added.
  if (text.startsWith('failed to load file')) {
    const named = sourceOfRange(d.range, source);
    if (named !== '') text = `${text} [${named}]`;
  }
  return `${d.path}:${where}: ${d.severity}: ${text}`;
}

/** The source text of a one-line range `l:c-l:c` (from 0), or '' (long or several lines). */
function sourceOfRange(range: string, source: string): string {
  const m = /^(\d+):(\d+)-(\d+):(\d+)$/.exec(range);
  if (m === null || m[1] !== m[3]) return '';
  const line = source.split('\n')[Number(m[1])] ?? '';
  const named = line.slice(Number(m[2]), Number(m[4])).trim();
  return named.length <= 80 ? named : '';
}

const text = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * US-008 | AC-1: The worker logic; `handle` takes the messages of the plugin
 * one at a time and answers through `post`.
 *
 * Assumes `init` came first (a compile before it answers `failed`). Never
 * throws: every failure is a `failed` message with the request id. No network
 * is used: the compiler and the fonts arrive as buffers and the default fonts
 * are never fetched (AC-2).
 */
export function createWorkerCore(post: Post): {
  handle(message: unknown): Promise<void>;
} {
  let typst: TypstSnippet | null = null;
  /** The decoded compiler and fonts of `init`, kept to build a compiler with extra fonts. */
  let held: {wasm: Uint8Array; fonts: Uint8Array[]} | null = null;
  /**
   * US-004 AC-12 (D4): the compiler with the extra fonts of the last creature
   * compile, kept while the same fonts come again (a run asks for the book's
   * list every time); another list replaces it. Measured: a fresh compiler per
   * compile keeps about 3.5 MB each in Node, so one is kept, not many.
   */
  let withExtra: {key: string; snippet: TypstSnippet} | null = null;

  /** A SHA-256 of the font files (length-prefixed), the key of `withExtra`. */
  const keyOf = async (fonts: readonly Uint8Array[]): Promise<string> => {
    const size = fonts.reduce((n, f) => n + 4 + f.length, 0);
    const all = new Uint8Array(size);
    let at = 0;
    for (const f of fonts) {
      new DataView(all.buffer).setUint32(at, f.length);
      all.set(f, at + 4);
      at += 4 + f.length;
    }
    const digest = await crypto.subtle.digest('SHA-256', all);
    return Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
  };

  /**
   * US-008 AC-2, US-004 AC-12 (D4): a snippet over the held compiler and the
   * plugin's fonts, then `extra` fonts. No default fonts are fetched.
   */
  const build = (
    wasm: Uint8Array,
    fonts: Uint8Array[],
    extra: Uint8Array[],
  ): TypstSnippet => {
    const snippet = new TypstSnippet();
    snippet.setCompilerInitOptions({
      getModule: () => wasm,
      // assets: false = never fetch the default fonts (AC-2).
      beforeBuild: [loadFonts([...fonts, ...extra], {assets: false})],
    });
    snippet.setRendererInitOptions({getModule: () => new Uint8Array(0)});
    return snippet;
  };

  const init = async (message: InitMessage): Promise<void> => {
    // A failed init leaves nothing initialised: a compile then answers `failed`.
    typst = null;
    held = null;
    withExtra = null;
    // US-008 AC-13: the decode happens here, in the worker, never on the main thread.
    const wasm = await decodeWasm(message.compilerText);
    const fonts = await Promise.all(message.fontTexts.map(decodeWasm));
    held = {wasm, fonts};
    typst = build(wasm, fonts, []);
    post({type: 'ready', id: message.id});
  };

  /** The values of every `metadata` labelled `gcc-fit`; throws when unreadable. */
  const readFacts = async (
    compiler: Awaited<ReturnType<TypstSnippet['getCompiler']>>,
  ): Promise<unknown[]> =>
    compiler.runWithWorld({mainFilePath: MAIN}, async (world) => {
      await world.compile({diagnostics: 'unix'});
      const out: unknown = await world.query({
        selector: `<${FIT_LABEL}>`,
        field: 'value',
      });
      const values: unknown = typeof out === 'string' ? JSON.parse(out) : out;
      if (!Array.isArray(values)) {
        throw new Error('the fit facts of the sheet could not be read');
      }
      return values;
    });

  /**
   * US-008 AC-1, US-004 AC-12: compiles `message.source`. With `files` they are
   * mapped at their paths for this compile and unmapped at its end (also after
   * an error), so nothing leaks into the next compile. With `fonts` this compile
   * runs on a compiler that has them besides the plugin's own (kept for the same
   * fonts, `withExtra`), and the held compiler is left as it was; without extra
   * the held compiler is used.
   */
  const compile = async (message: CompileMessage): Promise<void> => {
    if (typst === null || held === null) throw new Error('compile before init');
    const extra = (message.fonts ?? []).map((b) => new Uint8Array(b));
    let snippet = typst;
    if (extra.length > 0) {
      const key = await keyOf(extra);
      if (withExtra?.key !== key) {
        withExtra = {key, snippet: build(held.wasm, held.fonts, extra)};
      }
      snippet = withExtra.snippet;
    }
    const mapped = (message.files ?? []).map((f) => `/${f.path}`);
    try {
      for (const f of message.files ?? []) {
        await snippet.mapShadow(`/${f.path}`, new Uint8Array(f.bytes));
      }
      await compileWith(snippet, message);
    } finally {
      for (const path of mapped) await snippet.unmapShadow(path);
    }
  };

  const compileWith = async (
    typst: TypstSnippet,
    message: CompileMessage,
  ): Promise<void> => {
    await typst.addSource(MAIN, message.source);
    const compiler = await typst.getCompiler();
    // The typings demand an incremental-server field that the call does not use.
    const request = {
      mainFilePath: MAIN,
      format: CompileFormatEnum.pdf,
      diagnostics: 'full',
    } as unknown as Parameters<typeof compiler.compile>[0];
    const outcome = (await compiler.compile(request)) as {
      result?: Uint8Array;
      diagnostics?: Diagnostic[];
    };
    const pdf = outcome.result;
    if (pdf === undefined || pdf.length === 0) {
      const lines = (outcome.diagnostics ?? []).map((d) =>
        diagnosticLine(d, message.source),
      );
      if (lines.length === 0) throw new Error('the compiler returned no PDF');
      post({type: 'failed', id: message.id, message: lines.join('\n')});
      return;
    }
    const facts = message.source.includes(FIT_LABEL)
      ? await readFacts(compiler)
      : [];
    const buffer = pdf.buffer.slice(
      pdf.byteOffset,
      pdf.byteOffset + pdf.byteLength,
    ) as ArrayBuffer;
    post({type: 'compiled', id: message.id, pdf: buffer, facts}, [buffer]);
  };

  return {
    async handle(raw: unknown): Promise<void> {
      const message = (raw ?? {}) as {type?: string; id?: string};
      try {
        if (message.type === 'init') await init(raw as InitMessage);
        else if (message.type === 'compile')
          await compile(raw as CompileMessage);
        else throw new Error(`unknown message ${String(message.type)}`);
      } catch (error) {
        post({type: 'failed', id: message.id, message: text(error)});
      }
    },
  };
}
