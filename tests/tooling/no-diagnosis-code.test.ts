// Ticket #16 (US-008 AC-10, AC-12 follow-up): a release holds the product only. The diagnosis
// trace and the spike commands of the test builds (M02, M03) are gone from the sources, and the
// release script refuses a `main.js` that still holds them. Red until #16 is done.
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const RELEASE = '../../build/release-checks.mjs';
const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)) as T;

const files: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.ts')) files.push(path);
  }
};
walk(join(process.cwd(), 'src'));

const MARKERS =
  /GCC trace|GCC spike|PICKER_SPIKES|picker-spike|spike-sheet|runSpike|observeLongTasks|traceDeps|spikeSheetSource|Spike:/;

describe('#16: the sources hold no diagnosis code', () => {
  it('the diagnosis files are gone', () => {
    for (const f of [
      'src/plugin/trace.ts',
      'src/plugin/picker-spike.ts',
      'src/plugin/spike-sheet.ts',
      'tests/plugin/us-008-trace.test.ts',
      'tests/plugin/us-007-picker-spike.test.ts',
    ]) {
      expect(existsSync(join(process.cwd(), f)), f).toBe(false);
    }
  });
  it('no source file names a trace, a spike or a spike command (at least 40 files looked at)', () => {
    expect(files.length).toBeGreaterThanOrEqual(40);
    const hits = files.filter((f) => MARKERS.test(readFileSync(f, 'utf8')));
    expect(hits.map((f) => f.slice(process.cwd().length + 1))).toEqual([]);
  });
  it('main.ts registers the product commands only: no `spike` id, no console.log', () => {
    const main = readFileSync(
      join(process.cwd(), 'src/plugin/main.ts'),
      'utf8',
    );
    expect(main).not.toMatch(/id:\s*[`'"]spike/);
    expect(main).not.toMatch(/console\.log/);
  });
});

describe('#16: the release script refuses a bundle with diagnosis code', () => {
  it('checkBundleText names the build folder and the diagnosis strings; a clean bundle has no problem', async () => {
    const {checkBundleText} = await load<{
      checkBundleText(text: string, buildFolder?: string | null): string[];
    }>(RELEASE);
    expect(checkBundleText('var a = 1;', '/tmp/gcc-release-x')).toEqual([]);
    expect(
      checkBundleText('x /tmp/gcc-release-x/src y', '/tmp/gcc-release-x'),
    ).toEqual(['main.js names the build folder gcc-release-x']);
    expect(checkBundleText('console.log("GCC trace onload")')).toEqual([
      'main.js holds diagnosis code ("GCC trace")',
    ]);
    expect(checkBundleText('new Notice(`GCC spike ${x}`)')).toEqual([
      'main.js holds diagnosis code ("GCC spike")',
    ]);
    expect(checkBundleText('GCC trace and GCC spike')).toHaveLength(2);
  });
  it('release.mjs calls it on the built main.js', () => {
    const text = readFileSync(join(process.cwd(), 'build/release.mjs'), 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(text).toMatch(/checkBundleText\(/);
  });
});
