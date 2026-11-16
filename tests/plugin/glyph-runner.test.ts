// US-010 AC-4, AC-5 (SCAR-017, SCAR-031): the plugin side. The runner hands the
// compile service's `coverage` to the run (`{ok: true, faces}` or `{ok: false,
// message}`, as the client answers; a refusal becomes the run's unavailable
// warning), the notice counts the glyph warnings and the warnings file lists
// them; main.ts only hands the service over. Invented names (SCAR-035). Red until
// the code ticket (G2, 2026-11-17).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {createCardsRunner} from '../../src/plugin/runner';
import {LATIN} from '../support/glyph-faces';

const SETTINGS: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [{folder: 'skills', kind: 'skill'}],
  outputFolder: '/out',
};
type Coverage =
  | {ok: true; faces: {family: string; coverage: number[]}[]}
  | {ok: false; message: string};

function setup(coverage?: (fonts: readonly Uint8Array[]) => Promise<Coverage>) {
  const calls = {
    coverage: [] as (readonly Uint8Array[])[],
    texts: [] as {path: string; text: string}[],
    notices: [] as string[],
  };
  const deps = {
    settings: async () => SETTINGS,
    vaultRoot: () => '/v',
    readNote: async (p: string) =>
      p === 'skills/Chinese.md' ? 'A 漢 and a 😀.\n' : 'Plain text.\n',
    resolve: () => null,
    notesNamed: () => [],
    notesBelow: (folder: string) =>
      folder === 'skills' ? ['skills/Chinese.md', 'skills/Plain.md'] : [],
    compile: async () => ({
      pdf: new Uint8Array([1]),
      facts: [0, 1].map((i) => ({i, size: 7, fits: true})),
    }),
    ...(coverage === undefined
      ? {}
      : {
          coverage: async (fonts: readonly Uint8Array[]) => {
            calls.coverage.push(fonts);
            return coverage(fonts);
          },
        }),
    isFile: async () => false,
    writerFor: (folder: string) => ({
      exists: async () => false,
      writeBytes: async () => undefined,
      writeText: async (path: string, text: string) =>
        void calls.texts.push({path, text}),
      ensureFolder: async () => undefined,
      isFile: async () => false,
      root: folder,
    }),
    confirmReplace: async () => true,
    notice: (t: string) => void calls.notices.push(t),
  };
  return {runner: createCardsRunner(deps as never), calls};
}
const SELECTION = [{path: 'skills', isFolder: true}];

describe('US-010 AC-5: the runner, the notice and the warnings file', () => {
  it("a note with 漢: the warning is in the notice's count and in the warnings file as one line", async () => {
    const {runner, calls} = setup(async () => ({ok: true, faces: [LATIN]}));
    await runner.runSelection(SELECTION);
    expect(calls.coverage).toEqual([[]]);
    expect(calls.notices.at(-1)).toMatch(/^2 cards on 1 page, 1 warning\./);
    const file = calls.texts.find((t) => t.path.endsWith('.md'))!.text;
    expect(file).toContain(
      '- SKILL_GLYPH_MISSING — skills/Chinese.md — 漢 U+6F22, 😀 U+1F600\n',
    );
    expect(file).not.toContain('Plain.md');
  });
  it('the coverage service refuses: one unavailable warning with the reason, the PDF is written', async () => {
    const {runner, calls} = setup(async () => ({
      ok: false,
      message: 'The plugin was unloaded',
    }));
    await runner.runSelection(SELECTION);
    expect(calls.notices.at(-1)).toMatch(/^2 cards on 1 page, 1 warning\./);
    const file = calls.texts.find((t) => t.path.endsWith('.md'))!.text;
    // the path is empty: the file's form for every warning with no path
    expect(file).toContain(
      '- GLYPH_CHECK_UNAVAILABLE —  — The plugin was unloaded\n',
    );
  });
  it('a runner without a coverage service (an older wiring): no check, no warning', async () => {
    const {runner, calls} = setup();
    await runner.runSelection(SELECTION);
    expect(calls.notices.at(-1)).toMatch(/^2 cards on 1 page, 0 warnings\./);
  });
});

describe('US-010 AC-4 (SCAR-031): main.ts only hands the service over', () => {
  const main = readFileSync(join(process.cwd(), 'src/plugin/main.ts'), 'utf8')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');
  it('hands `compiler.coverage` to the runner in one statement, with no condition on glyphs or fonts', () => {
    expect(main).toContain(
      'coverage: (fonts) => this.compiler.coverage(fonts)',
    );
    expect(main).not.toMatch(/\bif\s*\([^)]*(glyph|font|coverage)/i);
  });
});
