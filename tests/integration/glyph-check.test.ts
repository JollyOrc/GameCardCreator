// US-010 AC-1, AC-3, AC-6 at the PDF level: the run with the real coverage of the
// real worker (the font list the build embeds, SCAR-023) and the real compile.
// A note with 漢 and 😀 gets its warning and still gets its card; a note with
// characters Libertinus draws gets none; an extra font that draws ✓ takes the
// warning away; the PDF is the PDF of a run without the check (AC-6). Invented
// notes (SCAR-035). Red until the code ticket (G2, 2026-11-17). SCAR-030: 120 s.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {describe, expect, it} from 'vitest';
import {runCards, type RunDeps} from '../../src/core/run/run';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {FIT_LABEL} from '../../src/core/skill/fit';
import {compileWithFacts} from '../support/typst-node';

const root = process.cwd();
const CORE = '../../src/plugin/compiler/worker-core';
const BUILD = '../../build/build-plugin.mjs';
type Post = (message: unknown, transfer?: Transferable[]) => void;
const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)) as T;
const gz = (b: Uint8Array) => gzipSync(b).toString('base64');
const buf = (b: Uint8Array): ArrayBuffer =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const DEJAVU = new Uint8Array(
  readFileSync(join(root, 'tests/fixtures/fonts/DejaVuSansMono.ttf')),
);
const WASM = readFileSync(
  join(
    root,
    'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
  ),
);

/** The worker's core with the build's font list: `coverage(fonts)` as the client gives it. */
async function realCoverage() {
  const {fontFiles} = await load<{fontFiles(dir: string): string[]}>(BUILD);
  const {createWorkerCore} = await load<{
    createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
  }>(CORE);
  const out: {
    id?: string;
    type: string;
    faces?: unknown[];
    message?: string;
  }[] = [];
  const core = createWorkerCore((m) => void out.push(m as never));
  await core.handle({
    type: 'init',
    id: 'i',
    compilerText: gz(new Uint8Array(WASM)),
    fontTexts: fontFiles(join(root, 'assets/fonts')).map((f) =>
      gz(new Uint8Array(readFileSync(join(root, 'assets/fonts', f)))),
    ),
  });
  let n = 0;
  return async (fonts: readonly Uint8Array[]) => {
    const id = `f${n++}`;
    await core.handle({
      type: 'font-info',
      id,
      ...(fonts.length > 0 ? {fonts: fonts.map(buf)} : {}),
    });
    const answer = out.find((o) => o.id === id)!;
    if (answer.type !== 'font-info-result') throw new Error(answer.message);
    return answer.faces as {family: string; coverage: number[]}[];
  };
}

const settings: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [{folder: 'skills', kind: 'skill'}],
  outputFolder: '/out',
};
const NOTES: Record<string, string> = {
  'skills/Chinese.md': '---\ntags:\n  - Misc\n---\nA 漢 and a 😀 here.\n',
  'skills/Russian.md': 'Привет → ★ ◆ ß é.\n',
  'skills/Tick.md': 'A ✓ mark.\n',
};
async function run(
  names: string[],
  withCheck: boolean,
  extra: Uint8Array[] = [],
) {
  const coverage = await realCoverage();
  const deps: RunDeps = {
    read: async (p) => NOTES[p]!,
    compile: async (source) => {
      const r = await compileWithFacts(source, FIT_LABEL, []);
      return {pdf: r.pdf, facts: r.facts};
    },
    ...(withCheck ? {coverage: (fonts) => coverage([...fonts, ...extra])} : {}),
  };
  return runCards(names, settings, deps);
}

describe('US-010: the real coverage, the real compile', () => {
  it('漢 and 😀: the warning, and the card is made', async () => {
    const r = await run(['skills/Chinese.md'], true);
    expect(r.ok && r.cards).toBe(1);
    expect(r.warnings).toEqual([
      {
        code: 'SKILL_GLYPH_MISSING',
        path: 'skills/Chinese.md',
        detail: '漢 U+6F22, 😀 U+1F600',
      },
    ]);
  }, 120_000);
  it('Cyrillic, an arrow, a star, a diamond, ß and é are drawn by Libertinus: no warning', async () => {
    const r = await run(['skills/Russian.md'], true);
    expect(r.ok && r.warnings).toEqual([]);
  }, 120_000);
  it("✓ is missing without an extra font and drawn with DejaVu Sans Mono among the compile's fonts", async () => {
    const without = await run(['skills/Tick.md'], true);
    expect(without.ok && without.warnings.map((w) => w.detail)).toEqual([
      '✓ U+2713',
    ]);
    const withFont = await run(['skills/Tick.md'], true, [DEJAVU]);
    expect(withFont.ok && withFont.warnings).toEqual([]);
  }, 120_000);
  it('AC-6: the PDF is the PDF of a run without the check, byte for byte', async () => {
    const a = await run(['skills/Chinese.md', 'skills/Russian.md'], true);
    const b = await run(['skills/Chinese.md', 'skills/Russian.md'], false);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok)
      expect(Buffer.from(a.pdf).equals(Buffer.from(b.pdf))).toBe(true);
  }, 120_000);
});

describe('US-010 AC-3 (D2): the premise, measured with the real worker (SCAR-024)', () => {
  it("a character Libertinus lacks is drawn from an extra font that has it, and is the font's empty glyph without it", async () => {
    const {fontFiles} = await load<{fontFiles(dir: string): string[]}>(BUILD);
    const {createWorkerCore} = await load<{
      createWorkerCore(post: Post): {handle(m: unknown): Promise<void>};
    }>(CORE);
    const {openPdf} = await load<{openPdf(b: Uint8Array): unknown}>(
      '../support/pdf/reader',
    );
    const {pageRuns} = await load<{
      pageRuns(f: unknown): {items: ({ch: string} | {kern: number})[]}[][];
    }>('../support/pdf/text');
    const out: {id?: string; type: string; pdf?: ArrayBuffer}[] = [];
    const core = createWorkerCore((m) => void out.push(m as never));
    await core.handle({
      type: 'init',
      id: 'i',
      compilerText: gz(new Uint8Array(WASM)),
      fontTexts: fontFiles(join(root, 'assets/fonts')).map((f) =>
        gz(new Uint8Array(readFileSync(join(root, 'assets/fonts', f)))),
      ),
    });
    const source =
      '#set document(date: none)\n#set page(width: 100mm, height: 30mm, margin: 5mm)\n' +
      '#set text(font: "Libertinus Serif", size: 14pt)\nA ✓ B ⌘ C 漢 D\n';
    const textOf = async (
      id: string,
      fonts?: Uint8Array[],
    ): Promise<string> => {
      await core.handle({
        type: 'compile',
        id,
        source,
        ...(fonts ? {fonts: fonts.map(buf)} : {}),
      });
      const answer = out.find((o) => o.id === id)!;
      const runs = pageRuns(openPdf(new Uint8Array(answer.pdf!)))[0] ?? [];
      return runs
        .flatMap((r) => r.items.map((i) => ('ch' in i ? i.ch : '')))
        .join('');
    };
    const without = await textOf('a');
    expect(without).not.toContain('✓');
    expect(without).not.toContain('⌘');
    const withFont = await textOf('b', [DEJAVU]);
    expect(withFont).toContain('✓');
    expect(withFont).toContain('⌘');
    expect(withFont).not.toContain('漢'); // DejaVu Sans Mono has no ideographs either
  }, 120_000);
});
