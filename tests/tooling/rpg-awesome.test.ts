// US-009 AC-12 (SCAR-036): the icon font and its notices ship with the plugin: the font
// file is in assets, the build embeds it with the other fonts, and the licence texts
// are in the repository's notices. Red until the code ticket.
import {existsSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const BUILD = '../../build/build-plugin.mjs';

describe('US-009 AC-12: the font file', () => {
  it('RPGAwesome.ttf is in assets/fonts, a TrueType file of the size measured on 2026-11-13', () => {
    const p = join(root, 'assets/fonts/RPGAwesome.ttf');
    expect(existsSync(p)).toBe(true);
    expect(statSync(p).size).toBe(148988);
    const head = readFileSync(p).subarray(0, 4);
    expect([...head]).toEqual([0, 1, 0, 0]);
  });
});

describe('US-009 AC-12: the build embeds every font file, ttf included', () => {
  it('fontFiles lists the four Libertinus files and the icon font, sorted', async () => {
    const {fontFiles} = (await import(/* @vite-ignore */ BUILD)) as {
      fontFiles(dir: string): string[];
    };
    expect(fontFiles(join(root, 'assets/fonts'))).toEqual([
      'LibertinusSerif-Bold.otf',
      'LibertinusSerif-BoldItalic.otf',
      'LibertinusSerif-Italic.otf',
      'LibertinusSerif-Regular.otf',
      'RPGAwesome.ttf',
    ]);
  });
  it('the licence and notice files in assets/fonts are not fonts', async () => {
    const {fontFiles} = (await import(/* @vite-ignore */ BUILD)) as {
      fontFiles(dir: string): string[];
    };
    expect(
      fontFiles(join(root, 'assets/fonts')).some((n) => /\.txt$/.test(n)),
    ).toBe(false);
  });
});

describe('US-009 AC-12 (SCAR-036): the notices', () => {
  it("the font's licence text is in assets/fonts: the SIL OFL 1.1 with the holders named", () => {
    const p = 'assets/fonts/RPGAwesome-OFL.txt';
    expect(existsSync(join(root, p))).toBe(true);
    const t = read(p);
    expect(t).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
    expect(t).toMatch(/Daniela Howe/);
    expect(t).toMatch(/Ivan Montiel/);
  });
  it("THIRD_PARTY_NOTICES.md names the icon font, its licence and the glyph designs' source and licence", () => {
    const t = read('THIRD_PARTY_NOTICES.md');
    expect(t).toMatch(/RPG Awesome/);
    expect(t).toMatch(/SIL Open Font License/);
    expect(t).toMatch(/assets\/fonts\/RPGAwesome-OFL\.txt/);
    expect(t).toMatch(/Game-icons\.net/);
    expect(t).toMatch(/CC BY 3\.0/);
  });
  it('the release script ships the notices file (it is in the list of release files)', () => {
    expect(read('build/release.mjs')).toMatch(/THIRD_PARTY_NOTICES\.md/);
  });
});
