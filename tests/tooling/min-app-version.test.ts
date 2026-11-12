// Release (US-008 AC-10): `minAppVersion` in manifest.json is at least the highest `@since` of the
// Obsidian APIs the plugin uses, read from the pinned type definitions (SCAR-024: not written from
// memory). Only the tokens found in `src` count; the test asserts how many it looked at.
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const sources: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.ts')) sources.push(readFileSync(path, 'utf8'));
  }
};
walk(join(process.cwd(), 'src'));
const src = sources.join('\n');
const d = readFileSync(
  join(process.cwd(), 'node_modules/obsidian/obsidian.d.ts'),
  'utf8',
);

/** [the token in our source, the declaration in the type definitions]. */
const USED: [string, RegExp][] = [
  ['getAllFolders(', /getAllFolders\(includeRoot/],
  ['getFolderByPath(', /getFolderByPath\(path: string\)/],
  ['AbstractInputSuggest', /export abstract class AbstractInputSuggest/],
  ["'files-menu'", /on\(name: 'files-menu'/],
  ['PluginSettingTab', /export abstract class PluginSettingTab/],
];
const sinceOf = (declaration: RegExp): string | null => {
  const at = d.search(declaration);
  if (at < 0) return null;
  const comment = d.slice(d.lastIndexOf('/**', at), at);
  return /@since ([0-9.]+)/.exec(comment)?.[1] ?? null;
};
const parse = (v: string): number[] => v.split('.').map(Number);
const atLeast = (a: string, b: string): boolean => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return true;
};

describe('minAppVersion covers the APIs the plugin uses', () => {
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8')) as {
    minAppVersion: string;
  };
  const found = USED.filter(([token]) => src.includes(token));
  it('looked at all five tokens, each with a `@since` in the definitions', () => {
    expect(found.length).toBe(5);
    for (const [token, declaration] of found) {
      expect(sinceOf(declaration), token).not.toBeNull();
    }
  });
  it('the manifest asks for at least the highest `@since` found (1.6.6 for getAllFolders at the time of writing)', () => {
    const highest = found
      .map(([, declaration]) => sinceOf(declaration)!)
      .reduce((a, b) => (atLeast(a, b) ? a : b));
    expect(
      atLeast(manifest.minAppVersion, highest),
      `${manifest.minAppVersion} < ${highest}`,
    ).toBe(true);
  });
  it('versions.json maps the release version to that minimum', () => {
    const versions = JSON.parse(
      readFileSync('versions.json', 'utf8'),
    ) as Record<string, string>;
    const version = (
      JSON.parse(readFileSync('manifest.json', 'utf8')) as {version: string}
    ).version;
    expect(versions[version]).toBe(manifest.minAppVersion);
  });
});
