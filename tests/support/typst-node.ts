// Test support: the pinned Typst compiler in Node, offline, no fonts, no
// network (spike-typst.md), with the bundled Libertinus Serif. The compile
// helpers: `compilePdf`, and `compileWithFacts` for the facts a document
// writes with `metadata` and a label (read back with `query`, as Obsidian2Typst
// does).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {CompileFormatEnum} from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';
import {TypstSnippet} from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';
import {loadFonts} from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';

const modules = join(process.cwd(), 'node_modules', '@myriaddreamin');
const wasm = (pkg: string, file: string) => () =>
  readFileSync(join(modules, pkg, 'pkg', file));

/** The bundled font files (Libertinus Serif and, for US-009, RPG Awesome; assets/fonts). */
const FONT_FILES = [
  'LibertinusSerif-Regular.otf',
  'LibertinusSerif-Bold.otf',
  'LibertinusSerif-Italic.otf',
  'LibertinusSerif-BoldItalic.otf',
  // US-009: the icon font (RPG Awesome, family `rpg-awesome`, SIL OFL 1.1)
  'RPGAwesome.ttf',
];
const fontBytes = () =>
  FONT_FILES.map((f) =>
    readFileSync(join(process.cwd(), 'assets', 'fonts', f)),
  );

const snippets = new Map<string, TypstSnippet>();
let counter = 0;

/**
 * One initialised snippet per process and font set; default fonts are never fetched.
 * `extra` names test fonts in tests/fixtures/fonts loaded after the bundled ones (US-012
 * #48: a band font); without them every compile uses the one snippet of the bundled
 * fonts, as before.
 */
function typst(extra: readonly string[] = []): TypstSnippet {
  const key = extra.join('|');
  let snippet = snippets.get(key);
  if (snippet === undefined) {
    snippet = new TypstSnippet();
    const extraBytes = extra.map((f) =>
      readFileSync(join(process.cwd(), 'tests', 'fixtures', 'fonts', f)),
    );
    snippet.setCompilerInitOptions({
      getModule: wasm('typst-ts-web-compiler', 'typst_ts_web_compiler_bg.wasm'),
      beforeBuild: [
        loadFonts([...fontBytes(), ...extraBytes], {assets: false}),
      ],
    });
    snippet.setRendererInitOptions({
      getModule: wasm('typst-ts-renderer', 'typst_ts_renderer_bg.wasm'),
    });
    snippets.set(key, snippet);
  }
  return snippet;
}

/**
 * Compiles `source` to PDF bytes. Throws with the compiler's diagnostics
 * when there is no PDF (never returns an empty result, SCAR-008).
 */
export async function compilePdf(
  source: string,
  extraFonts: readonly string[] = [],
): Promise<Uint8Array> {
  const t = typst(extraFonts);
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

/**
 * Compiles `source` to PDF and reads the values of every `metadata(..)` that
 * carries `label` (a list, empty when there is none). The document is
 * compiled twice (PDF, then a world for the query), as Obsidian2Typst does.
 */
export async function compileWithFacts(
  source: string,
  label: string,
  files: readonly {path: string; bytes: Uint8Array}[] = [],
  /** US-012 #48: test fonts (tests/fixtures/fonts) loaded for this compile; none: the bundled ones. */
  extraFonts: readonly string[] = [],
): Promise<{pdf: Uint8Array; facts: unknown[]; diagnostics: unknown[]}> {
  const t = typst(extraFonts);
  // US-004 AC-12: the files of the answer sit at their paths next to the source
  // for this compile only (unmapped in `finally`, nothing leaks into the next).
  for (const f of files) await t.mapShadow(`/${f.path}`, f.bytes);
  try {
    return await compileMapped(source, label, extraFonts);
  } finally {
    for (const f of files) await t.unmapShadow(`/${f.path}`);
  }
}

async function compileMapped(
  source: string,
  label: string,
  extraFonts: readonly string[] = [],
): Promise<{pdf: Uint8Array; facts: unknown[]; diagnostics: unknown[]}> {
  const pdf = await compilePdf(source, extraFonts);
  const t = typst(extraFonts);
  const path = `/sheet-${counter - 1}.typ`; // the file compilePdf just added
  const compiler = await t.getCompiler();
  const read = await compiler.runWithWorld(
    {mainFilePath: path},
    async (world) => {
      const compiled = (await world.compile({diagnostics: 'unix'})) as {
        diagnostics?: unknown;
      } | null;
      const out: unknown = await world.query({
        selector: `<${label}>`,
        field: 'value',
      });
      const values: unknown = typeof out === 'string' ? JSON.parse(out) : out;
      const diagnostics = compiled?.diagnostics;
      return {
        facts: Array.isArray(values) ? values : [],
        diagnostics: Array.isArray(diagnostics) ? diagnostics : [],
      };
    },
  );
  return {pdf, ...read};
}
