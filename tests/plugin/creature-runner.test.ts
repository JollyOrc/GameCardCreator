// US-004 AC-3, AC-12 (ticket #26): the plugin side. The runner hands the other
// plugin's API object and the extra of the compile to the run, and one place
// reads the other plugin (SCAR-017, SCAR-031, SCAR-016). Invented names.
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {pluginApi} from '../../src/plugin/obsidian-deps';
import {createCardsRunner} from '../../src/plugin/runner';
import {
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_ANSWER,
} from '../support/creature-fixtures';

const SETTINGS: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [{folder: 'creatures', kind: 'creature'}],
  outputFolder: '/out',
};
const FONTS = [new Uint8Array([1, 2, 3])];

function setup(api: () => unknown) {
  const calls = {
    api: 0,
    compile: [] as {source: string; extra?: unknown}[],
    writes: [] as string[],
    notices: [] as string[],
  };
  const deps = {
    settings: async () => SETTINGS,
    vaultRoot: () => '/v',
    readNote: async () => EXAMPLE_CREATURE_NOTE,
    resolve: () => null,
    notesNamed: () => [],
    notesBelow: (folder: string) =>
      folder === 'creatures' ? ['creatures/Fen Hare.md'] : [],
    statblockApi: () => {
      calls.api++;
      return api();
    },
    compile: async (source: string, extra?: unknown) => {
      calls.compile.push({source, extra});
      return {
        pdf: new Uint8Array([1]),
        facts: [{i: 0, size: 7, fits: true, dropped: []}],
      };
    },
    isFile: async () => false,
    writerFor: (folder: string) => ({
      exists: async () => false,
      writeBytes: async (p: string) => void calls.writes.push(p),
      writeText: async (p: string) => void calls.writes.push(p),
      ensureFolder: async () => undefined,
      isFile: async () => false,
      root: folder,
    }),
    confirmReplace: async () => true,
    notice: (t: string) => void calls.notices.push(t),
  };
  return {runner: createCardsRunner(deps as never), calls};
}
const goodApi = () => ({
  version: 1,
  statblockTypst: async () => FEN_HARE_ANSWER,
  compileFonts: async () => FONTS,
});

describe('US-004 AC-3, AC-12: the runner hands the API and the extra to the run', () => {
  it('a selected creature note: the API is asked, the compile gets the files and the fonts, the PDF is written', async () => {
    const {runner, calls} = setup(goodApi);
    await runner.runSelection([
      {path: 'creatures/Fen Hare.md', isFolder: false},
    ]);
    expect(calls.api).toBe(1);
    expect(calls.compile).toHaveLength(1);
    expect(calls.compile[0]!.extra).toEqual({
      files: FEN_HARE_ANSWER.files,
      fonts: FONTS,
    });
    expect(calls.writes.length).toBe(2);
    expect(calls.notices.at(-1)).toMatch(/^1 card on 1 page/);
  });
  it('no plugin: no card, the refusal is the notice of the run, nothing is compiled', async () => {
    const {runner, calls} = setup(() => undefined);
    await runner.runSelection([
      {path: 'creatures/Fen Hare.md', isFolder: false},
    ]);
    expect(calls.compile).toEqual([]);
    expect(calls.notices.at(-1)).toMatch(/no cards/i);
  });
});

describe('US-004 AC-3 (SCAR-016): the API object is looked up at each call', () => {
  it('reads app.plugins.plugins[id].api now, undefined when there is none', () => {
    const app: {plugins?: {plugins?: Record<string, {api?: unknown}>}} = {};
    expect(pluginApi(app, 'obsidian2typst')).toBeUndefined();
    app.plugins = {};
    expect(pluginApi(app, 'obsidian2typst')).toBeUndefined();
    app.plugins.plugins = {other: {api: 'x'}};
    expect(pluginApi(app, 'obsidian2typst')).toBeUndefined();
    app.plugins.plugins['obsidian2typst'] = {};
    expect(pluginApi(app, 'obsidian2typst')).toBeUndefined();
    const first = {version: 1};
    app.plugins.plugins['obsidian2typst'] = {api: first};
    expect(pluginApi(app, 'obsidian2typst')).toBe(first);
    const second = {version: 1};
    app.plugins.plugins['obsidian2typst'] = {api: second};
    expect(pluginApi(app, 'obsidian2typst')).toBe(second);
  });
});

describe('US-004 AC-3 (SCAR-017, SCAR-031): one place reads the other plugin; main.ts decides nothing', () => {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.ts')) files.push(path);
    }
  };
  walk(join(process.cwd(), 'src'));
  it("the plugin's id as a code string is in main.ts only", () => {
    const hits = files
      .filter((f) => /['"`]obsidian2typst['"`]/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(process.cwd().length + 1));
    expect(hits).toEqual(['src/plugin/main.ts']);
  });
  it('main.ts has no condition on the API, a creature or a statblock', () => {
    const main = readFileSync(
      join(process.cwd(), 'src/plugin/main.ts'),
      'utf8',
    );
    const code = main
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).not.toMatch(/creature/i);
    expect(code).not.toMatch(/\bif\s*\([^)]*(api|statblock)/i);
    expect(code).toContain("pluginApi(this.app, 'obsidian2typst')");
  });
});
