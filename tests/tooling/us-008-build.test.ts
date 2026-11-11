// US-008 AC-8 to AC-10: the build scripts' logic as functions, tested on
// synthetic inputs in temporary folders: the licence report of what a bundle
// holds (SCAR-036), the test install (SCAR-012, SCAR-018) and the release
// checks (SCAR-006), plus text checks that the release script never publishes.
// Red until the tickets.
import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

const LICENCES = '../../build/licences.mjs';
const INSTALL = '../../build/install-lib.mjs';
const RELEASE = '../../build/release-checks.mjs';
const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)) as T;
const sha = (b: string | Uint8Array) =>
  createHash('sha256').update(b).digest('hex');

let base = '';
beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'gcc-build-'));
});
afterEach(() => rmSync(base, {recursive: true, force: true}));

describe('US-008 AC-8: the licence report of the bundle', () => {
  const metafile = {
    inputs: {
      'src/plugin/main.ts': {},
      'node_modules/yaml/dist/index.js': {},
      'node_modules/yaml/dist/other.js': {},
      'node_modules/@myriaddreamin/typst.ts/dist/esm/a.mjs': {},
      'node_modules/markdown-it/node_modules/entities/lib/x.js': {},
      'node_modules/markdown-it/lib/index.js': {},
    },
  };
  it('bundledPackages names every package once, scoped ones whole, the innermost for a nested one', async () => {
    const {bundledPackages} = await load<{
      bundledPackages(m: unknown): string[];
    }>(LICENCES);
    expect(bundledPackages(metafile)).toEqual([
      '@myriaddreamin/typst.ts',
      'entities',
      'markdown-it',
      'yaml',
    ]);
    expect(bundledPackages({inputs: {'src/a.ts': {}}})).toEqual([]);
  });
  it('the allowed licences are MIT, ISC, BSD-2-Clause, Apache-2.0 and OFL-1.1', async () => {
    const {ALLOWED_LICENCES} = await load<{ALLOWED_LICENCES: string[]}>(
      LICENCES,
    );
    expect([...ALLOWED_LICENCES].sort()).toEqual([
      'Apache-2.0',
      'BSD-2-Clause',
      'ISC',
      'MIT',
      'OFL-1.1',
    ]);
  });
  const reader =
    (table: Record<string, {version: string; license?: string} | null>) =>
    (name: string) =>
      table[name] ?? null;
  it("licenceReport reads version and licence from each package's own package.json", async () => {
    const {licenceReport} = await load<{
      licenceReport(
        n: string[],
        r: (n: string) => unknown,
      ): {name: string; version: string; licence: string}[];
    }>(LICENCES);
    const r = licenceReport(
      ['yaml', 'entities'],
      reader({
        yaml: {version: '2.9.1', license: 'ISC'},
        entities: {version: '8.1.0', license: 'BSD-2-Clause'},
      }),
    );
    expect(r).toEqual([
      {name: 'yaml', version: '2.9.1', licence: 'ISC'},
      {name: 'entities', version: '8.1.0', licence: 'BSD-2-Clause'},
    ]);
  });
  it('checkLicences: all allowed gives no problem', async () => {
    const {checkLicences} = await load<{checkLicences(r: unknown[]): string[]}>(
      LICENCES,
    );
    expect(
      checkLicences([
        {name: 'a', version: '1', licence: 'MIT'},
        {name: 'b', version: '1', licence: 'Apache-2.0'},
      ]),
    ).toEqual([]);
  });
  it.each([
    [{name: 'x', version: '1', licence: 'GPL-3.0'}, /x.*GPL-3\.0/],
    [{name: 'x', version: '1', licence: 'PSF-2.0'}, /x.*PSF-2\.0/],
    [{name: 'x', version: '1', licence: ''}, /x.*no licence/i],
    [{name: 'x', version: '1', licence: 'UNKNOWN'}, /x/],
    [{name: 'x', version: '1', licence: '(MIT AND CC0-1.0)'}, /x.*CC0-1\.0/],
  ])('%j is a problem', async (entry, pattern) => {
    const {checkLicences} = await load<{checkLicences(r: unknown[]): string[]}>(
      LICENCES,
    );
    const problems = checkLicences([entry]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(pattern);
  });
  it('an OR of licences is fine when one of them is allowed; an AND needs all', async () => {
    const {checkLicences} = await load<{checkLicences(r: unknown[]): string[]}>(
      LICENCES,
    );
    expect(
      checkLicences([{name: 'x', version: '1', licence: '(GPL-3.0 OR MIT)'}]),
    ).toEqual([]);
    expect(
      checkLicences([{name: 'x', version: '1', licence: 'MIT OR Apache-2.0'}]),
    ).toEqual([]);
    expect(
      checkLicences([{name: 'x', version: '1', licence: 'MIT AND GPL-3.0'}]),
    ).toHaveLength(1);
  });
  it('argparse in the bundle is a problem of its own (it is for the command line only)', async () => {
    const {checkLicences} = await load<{checkLicences(r: unknown[]): string[]}>(
      LICENCES,
    );
    const problems = checkLicences([
      {name: 'argparse', version: '3.0.4', licence: 'MIT'},
    ]);
    expect(problems.join(' ')).toMatch(/argparse/);
    expect(problems.join(' ')).toMatch(/command-line|bundle/i);
  });
});

describe('US-008 AC-9: the test install', () => {
  const FILES = {
    main: new TextEncoder().encode('console.log("main");\n'),
    manifest: JSON.stringify({
      id: 'game-card-creator',
      name: 'Game Card Creator',
      version: '0.0.1',
      minAppVersion: '1.5.0',
    }),
    styles: '/* styles */\n',
  };
  const vault = () => {
    const v = join(base, 'vault');
    mkdirSync(join(v, '.obsidian'), {recursive: true});
    return v;
  };
  type Install = (o: {
    vault: string;
    files: typeof FILES;
    version: string;
    force?: boolean;
  }) => {
    dir: string;
    checksums: {main: string; manifest: string; styles: string};
  };
  const install = async (): Promise<Install> =>
    (await load<{installTest: Install}>(INSTALL)).installTest;
  it('writes the three files under .obsidian/plugins/<id>/, with the test version in the manifest, and returns their checksums', async () => {
    const v = vault();
    const r = (await install())({
      vault: v,
      files: FILES,
      version: '0.1.0-m01.1',
    });
    const dir = join(v, '.obsidian', 'plugins', 'game-card-creator');
    expect(r.dir).toBe(dir);
    expect(Array.from(readFileSync(join(dir, 'main.js')))).toEqual(
      Array.from(FILES.main),
    );
    expect(readFileSync(join(dir, 'styles.css'), 'utf8')).toBe(FILES.styles);
    const manifest = JSON.parse(
      readFileSync(join(dir, 'manifest.json'), 'utf8'),
    ) as {version: string; id: string};
    expect(manifest.version).toBe('0.1.0-m01.1');
    expect(manifest.id).toBe('game-card-creator');
    expect(r.checksums).toEqual({
      main: sha(FILES.main),
      manifest: sha(readFileSync(join(dir, 'manifest.json'))),
      styles: sha(FILES.styles),
    });
  });
  it('refuses a folder that is not an Obsidian vault, and writes nothing', async () => {
    const v = join(base, 'plain');
    mkdirSync(v);
    expect(() => install as unknown as () => unknown).not.toThrow();
    const fn = await install();
    expect(() => fn({vault: v, files: FILES, version: '0.1.0-m01.1'})).toThrow(
      /vault|\.obsidian/i,
    );
    expect(existsSync(join(v, '.obsidian'))).toBe(false);
    expect(() =>
      fn({vault: join(base, 'missing'), files: FILES, version: '0.1.0-m01.1'}),
    ).toThrow();
  });
  it.each([['0.1.0'], ['0.1.0-m01'], ['1.0-m01.1'], ['0.1.0-beta.1'], ['']])(
    'refuses the version %j (a test build is x.y.z-mNN.N)',
    async (version) => {
      const fn = await install();
      expect(() => fn({vault: vault(), files: FILES, version})).toThrow(
        /version/i,
      );
    },
  );
  it('never touches data.json or any other file of the vault or of the plugin folder', async () => {
    const v = vault();
    const dir = join(v, '.obsidian', 'plugins', 'game-card-creator');
    mkdirSync(dir, {recursive: true});
    writeFileSync(join(dir, 'data.json'), '{"outputFolder":"/mine"}');
    writeFileSync(join(v, 'Note.md'), 'my note');
    writeFileSync(join(v, '.obsidian', 'app.json'), '{}');
    const before = ['data.json', '../../../Note.md', '../../app.json'].map(
      (p) => sha(readFileSync(join(dir, p))),
    );
    (await install())({vault: v, files: FILES, version: '0.1.0-m01.1'});
    const after = ['data.json', '../../../Note.md', '../../app.json'].map((p) =>
      sha(readFileSync(join(dir, p))),
    );
    expect(after).toEqual(before);
  });
  it('a second install of the same version is refused unless forced; a new version is not', async () => {
    const v = vault();
    const fn = await install();
    fn({vault: v, files: FILES, version: '0.1.0-m01.1'});
    expect(() => fn({vault: v, files: FILES, version: '0.1.0-m01.1'})).toThrow(
      /already|same version|force/i,
    );
    expect(() =>
      fn({vault: v, files: FILES, version: '0.1.0-m01.1', force: true}),
    ).not.toThrow();
    expect(() =>
      fn({vault: v, files: FILES, version: '0.1.0-m01.2'}),
    ).not.toThrow();
  });
});

describe('US-008 AC-10: checkRelease', () => {
  /** A repository folder with everything consistent for `version`. */
  function repo(
    over: {
      pkg?: string;
      manifest?: string;
      versions?: Record<string, string>;
      notes?: string | null;
      list?: string;
      version?: string;
    } = {},
  ) {
    const v = over.version ?? '0.1.0';
    const root = join(base, 'repo');
    mkdirSync(join(root, 'releases'), {recursive: true});
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({name: 'game-card-creator', version: over.pkg ?? v}),
    );
    writeFileSync(
      join(root, 'manifest.json'),
      JSON.stringify({id: 'game-card-creator', version: over.manifest ?? v}),
    );
    writeFileSync(
      join(root, 'versions.json'),
      JSON.stringify(over.versions ?? {[v]: '1.5.0'}),
    );
    const base0 = v.replace(/-.*$/, '');
    if (over.notes !== null)
      writeFileSync(
        join(root, 'releases', `v${base0}.md`),
        over.notes ??
          `# Game Card Creator v${base0}\n\n**Release date:** 2026-11-20\n`,
      );
    writeFileSync(
      join(root, 'releases', 'RELEASES.md'),
      over.list ??
        `# Releases\n\n| v${base0} | [release notes](v${base0}.md) |\n`,
    );
    return root;
  }
  type Check = (root: string, o?: {testBuild?: boolean}) => string[];
  const check = async (): Promise<Check> =>
    (await load<{checkRelease: Check}>(RELEASE)).checkRelease;
  it('a consistent release has no problem', async () => {
    expect((await check())(repo())).toEqual([]);
  });
  it('versions that differ are named', async () => {
    const problems = (await check())(repo({manifest: '0.1.1'}));
    expect(problems.join(' ')).toMatch(/manifest\.json/);
    expect(problems.join(' ')).toContain('0.1.1');
  });
  it('versions.json without the version, release notes missing or without a date, RELEASES.md without a row', async () => {
    const c = await check();
    expect(c(repo({versions: {'0.0.9': '1.5.0'}})).join(' ')).toMatch(
      /versions\.json/,
    );
    rmSync(join(base, 'repo'), {recursive: true, force: true});
    expect(c(repo({notes: null})).join(' ')).toMatch(
      /releases\/v0\.1\.0\.md.*missing/i,
    );
    rmSync(join(base, 'repo'), {recursive: true, force: true});
    expect(c(repo({notes: '# Game Card Creator v0.1.0\n'})).join(' ')).toMatch(
      /release date/i,
    );
    rmSync(join(base, 'repo'), {recursive: true, force: true});
    expect(c(repo({list: '# Releases\n'})).join(' ')).toMatch(/RELEASES\.md/);
  });
  it('a test build version is refused for a release, and accepted with testBuild (the notes are those of its base version)', async () => {
    const c = await check();
    const root = repo({version: '0.1.0-m01.1'});
    expect(c(root).join(' ')).toMatch(/release version|x\.y\.z/i);
    expect(c(root, {testBuild: true})).toEqual([]);
  });
});

describe('US-008 AC-10 (SCAR-014, SCAR-018): the release script never publishes', () => {
  it('build/release.mjs exists, runs the gate in a clone, and calls no tag, push or gh release', () => {
    expect(existsSync('build/release.mjs')).toBe(true);
    const text = readFileSync('build/release.mjs', 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(text).toMatch(/npm['"],\s*\[\s*['"]ci['"]/);
    expect(text).not.toMatch(
      /(execFileSync|spawnSync|execSync|exec|spawn)\([^)]*['"](tag|push)['"]/,
    );
    expect(text).not.toMatch(
      /(execFileSync|spawnSync|execSync|exec|spawn)\(\s*['"]gh['"]/,
    );
  });
  it('package.json has the scripts build, install:scratch and release:build', () => {
    const scripts = (
      JSON.parse(readFileSync('package.json', 'utf8')) as {
        scripts: Record<string, string>;
      }
    ).scripts;
    expect(scripts['install:scratch']).toMatch(/install-scratch/);
    expect(scripts['release:build']).toMatch(/release\.mjs/);
    expect(scripts.build).toMatch(/esbuild|build-plugin/);
  });
});
