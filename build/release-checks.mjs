// US-008 AC-10 (SCAR-006): is the tree at `root` ready to be released? Adapted
// from Obsidian2Typst's release script (same author, MIT licence).
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/**
 * US-008 | AC-10: The problems that stop a release, one line each (empty when
 * the tree is ready): the versions of `package.json`, `manifest.json` and
 * `versions.json` agree, the version is `x.y.z` (a test build `x.y.z-mNN.N`
 * only with `testBuild`, which also skips the notes), `releases/v<x.y.z>.md`
 * exists with a release date and `releases/RELEASES.md` lists it.
 */
export function checkRelease(root, {testBuild = false} = {}) {
  const problems = [];
  const manifest = readJson(join(root, 'manifest.json'));
  const pkg = readJson(join(root, 'package.json'));
  const versions = readJson(join(root, 'versions.json'));
  const version = String(manifest.version);
  if (pkg.version !== version) {
    problems.push(
      `package.json has version ${pkg.version}, manifest.json ${version}`,
    );
  }
  const release = /^\d+\.\d+\.\d+$/.test(version);
  if (!release && !(testBuild && /^\d+\.\d+\.\d+-m\d+\.\d+$/.test(version))) {
    problems.push(
      `version ${version} is not a release version (x.y.z); set it before building`,
    );
  }
  const base = version.replace(/-.*$/, '');
  const mapped = versions[version] ?? versions[base];
  if (mapped === undefined) {
    problems.push(`versions.json does not list ${version}`);
  } else if (
    manifest.minAppVersion !== undefined &&
    mapped !== manifest.minAppVersion
  ) {
    problems.push(
      `versions.json maps ${version} to ${mapped}, manifest.json has minAppVersion ${manifest.minAppVersion}`,
    );
  }
  if (!testBuild) {
    const notes = join(root, 'releases', `v${base}.md`);
    if (!existsSync(notes)) {
      problems.push(`releases/v${base}.md is missing`);
    } else if (
      !/^\*\*Release date:\*\* \d{4}-\d{2}-\d{2}\s*$/m.test(
        readFileSync(notes, 'utf8'),
      )
    ) {
      problems.push(`releases/v${base}.md has no release date`);
    }
    const table = join(root, 'releases', 'RELEASES.md');
    if (
      !existsSync(table) ||
      !readFileSync(table, 'utf8').includes(`| v${base} |`)
    ) {
      problems.push(`releases/RELEASES.md does not list v${base}`);
    }
  }
  return problems;
}
