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
function diagnosticLine(d: Diagnostic): string {
  const start = /^(\d+):(\d+)/.exec(d.range);
  const where = start
    ? `${Number(start[1]) + 1}:${Number(start[2]) + 1}`
    : '1:1';
  const text = d.message.split('\n')[0] ?? '';
  return `${d.path}:${where}: ${d.severity}: ${text}`;
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

  const init = async (message: InitMessage): Promise<void> => {
    // A failed init leaves nothing initialised: a compile then answers `failed`.
    typst = null;
    // US-008 AC-13: the decode happens here, in the worker, never on the main thread.
    const wasm = await decodeWasm(message.compilerText);
    const fonts = await Promise.all(message.fontTexts.map(decodeWasm));
    const snippet = new TypstSnippet();
    snippet.setCompilerInitOptions({
      getModule: () => wasm,
      // assets: false = never fetch the default fonts (AC-2).
      beforeBuild: [loadFonts(fonts, {assets: false})],
    });
    snippet.setRendererInitOptions({getModule: () => new Uint8Array(0)});
    typst = snippet;
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

  const compile = async (message: CompileMessage): Promise<void> => {
    if (typst === null) throw new Error('compile before init');
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
      const lines = (outcome.diagnostics ?? []).map(diagnosticLine);
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
