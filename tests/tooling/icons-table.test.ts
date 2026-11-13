// US-009 AC-5 (ticket #28): the committed icon table is the generator's output for the
// committed list of the font's names, so the table can be made again and cannot drift.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const root = process.cwd();
const GEN = '../../build/gen-icons.mjs';
interface Gen {
  iconsFile(list: string, root?: string): Promise<string>;
  iconsSource(list: string): string;
}
const load = async (): Promise<Gen> =>
  (await import(/* @vite-ignore */ GEN)) as Gen;

describe('US-009 AC-5: the icon table is generated', () => {
  it('src/core/scheme/icons.ts is the generator output for assets/fonts/RPGAwesome-icons.txt, byte for byte', async () => {
    const {iconsFile} = await load();
    const list = readFileSync(
      join(root, 'assets/fonts/RPGAwesome-icons.txt'),
      'utf8',
    );
    expect(await iconsFile(list, root)).toBe(
      readFileSync(join(root, 'src/core/scheme/icons.ts'), 'utf8'),
    );
  });
  it('the list has 496 names, each once, in the private-use range', () => {
    const lines = readFileSync(
      join(root, 'assets/fonts/RPGAwesome-icons.txt'),
      'utf8',
    )
      .split('\n')
      .filter((l) => l.trim() !== '');
    expect(lines).toHaveLength(496);
    expect(new Set(lines.map((l) => l.split(' ')[0])).size).toBe(496);
  });
  it('refuses a malformed line, a repeated name and a code point outside the font', async () => {
    const {iconsSource} = await load();
    expect(() => iconsSource('sword')).toThrow(/Not an icon line/);
    expect(() => iconsSource('sword e946\nsword e946')).toThrow(
      /written twice/,
    );
    expect(() => iconsSource('sword 0041')).toThrow(/outside U\+E900/);
    expect(() => iconsSource('sword ec00')).toThrow(/outside U\+E900/);
  });
  it('is deterministic: the same list gives the same text', async () => {
    const {iconsSource} = await load();
    expect(iconsSource('a e900\nb e901')).toBe(iconsSource('a e900\nb e901'));
  });
});
