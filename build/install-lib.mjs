// US-008 AC-9 (SCAR-012, SCAR-018, SCAR-033): the test install as a function:
// the three files of a build into `<vault>/.obsidian/plugins/<id>/` and
// nothing else. Writes only after every check has passed.
/* global Buffer */
import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {join} from 'node:path';

const PLUGIN_ID = 'game-card-creator';
const TEST_VERSION = /^\d+\.\d+\.\d+-m\d+\.\d+$/;
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/**
 * US-008 | AC-9: Installs a test build.
 *
 * `files` holds `main` (bytes), `manifest` (JSON text) and `styles` (text).
 * Refuses (and writes nothing) a version that is not `x.y.z-mNN.N`, a folder
 * that is no Obsidian vault (no `.obsidian` folder), and a version that is
 * already installed unless `force`. Writes `main.js`, `manifest.json` (with
 * `version`) and `styles.css`, never `data.json` or any other file; reads
 * them back and returns the directory and the SHA-256 of each file.
 */
export function installTest({vault, files, version, force = false}) {
  if (!TEST_VERSION.test(version)) {
    throw new Error(
      `The version ${JSON.stringify(version)} is not a test build version (x.y.z-mNN.N)`,
    );
  }
  const obsidian = join(vault, '.obsidian');
  if (
    !existsSync(vault) ||
    !existsSync(obsidian) ||
    !statSync(obsidian).isDirectory()
  ) {
    throw new Error(`${vault} is not an Obsidian vault (no .obsidian folder)`);
  }
  const dir = join(obsidian, 'plugins', PLUGIN_ID);
  const manifestPath = join(dir, 'manifest.json');
  if (!force && existsSync(manifestPath)) {
    let installed = '';
    try {
      installed = JSON.parse(readFileSync(manifestPath, 'utf8')).version;
    } catch {
      // an unreadable manifest is replaced like an old one
    }
    if (installed === version) {
      throw new Error(
        `Version ${version} is already installed; use a new version for a new test round, or --force`,
      );
    }
  }
  const manifest = {...JSON.parse(files.manifest), version};
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'main.js'), files.main);
  writeFileSync(manifestPath, manifestText);
  writeFileSync(join(dir, 'styles.css'), files.styles);
  const checksums = {
    main: sha256(readFileSync(join(dir, 'main.js'))),
    manifest: sha256(readFileSync(manifestPath)),
    styles: sha256(readFileSync(join(dir, 'styles.css'))),
  };
  if (
    checksums.main !== sha256(Buffer.from(files.main)) ||
    checksums.styles !== sha256(Buffer.from(files.styles))
  ) {
    throw new Error('A file was not written intact');
  }
  return {dir, checksums};
}
