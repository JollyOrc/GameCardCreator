// Test support: the pinned Typst compiler in Node, offline, no fonts, no
// network (spike-typst.md). One compile helper: `compilePdf`.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {CompileFormatEnum} from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';
import {TypstSnippet} from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';
import {loadFonts} from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';

const modules = join(process.cwd(), 'node_modules', '@myriaddreamin');
const wasm = (pkg: string, file: string) => () =>
  readFileSync(join(modules, pkg, 'pkg', file));

let snippet: TypstSnippet | undefined;
let counter = 0;

/** One initialised snippet per process; default fonts are never fetched. */
function typst(): TypstSnippet {
  if (snippet === undefined) {
    snippet = new TypstSnippet();
    snippet.setCompilerInitOptions({
      getModule: wasm('typst-ts-web-compiler', 'typst_ts_web_compiler_bg.wasm'),
      beforeBuild: [loadFonts([], {assets: false})],
    });
    snippet.setRendererInitOptions({
      getModule: wasm('typst-ts-renderer', 'typst_ts_renderer_bg.wasm'),
    });
  }
  return snippet;
}

/**
 * Compiles `source` to PDF bytes. Throws with the compiler's diagnostics
 * when there is no PDF (never returns an empty result, SCAR-008).
 */
export async function compilePdf(source: string): Promise<Uint8Array> {
  const t = typst();
  const path = `/sheet-${counter++}.typ`;
  await t.addSource(path, source);
  const compiler = await t.getCompiler();
  // The typings demand an incremental-server field that the call does not use.
  const request = {
    mainFilePath: path,
    format: CompileFormatEnum.pdf,
    diagnostics: 'full',
  } as unknown as Parameters<typeof compiler.compile>[0];
  const outcome = (await compiler.compile(request)) as {
    result?: Uint8Array;
    diagnostics?: unknown[];
  };
  if (outcome.result === undefined || outcome.result.length === 0) {
    throw new Error(`no PDF: ${JSON.stringify(outcome.diagnostics ?? [])}`);
  }
  return outcome.result;
}
