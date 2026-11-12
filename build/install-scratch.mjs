// US-008 AC-9 (SCAR-012, SCAR-018): builds the plugin and installs the test
// build into a vault, then proves by checksum that the installed files are the
// fresh ones. Run with
// `npm run install:scratch -- <vault> --version 0.1.0-m01.N [--force]`.
/* global console, process */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {buildPlugin, formatReport} from './build-plugin.mjs';
import {installTest} from './install-lib.mjs';

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = join(import.meta.dirname, '..');
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const at = args.indexOf('--version');
  const version = at >= 0 ? args[at + 1] : undefined;
  const vault = args.find((a, i) => !a.startsWith('--') && i !== at + 1);
  try {
    if (vault === undefined || version === undefined) {
      throw new Error(
        'Usage: npm run install:scratch -- <vault> --version x.y.z-mNN.N [--force]',
      );
    }
    const outfile = join(root, 'main.js');
    const built = await buildPlugin({outfile, logLevel: 'warning'});
    const files = {
      main: readFileSync(outfile),
      manifest: readFileSync(join(root, 'manifest.json'), 'utf8'),
      styles: readFileSync(join(root, 'styles.css'), 'utf8'),
    };
    const {dir, checksums} = installTest({
      vault: resolve(vault),
      files,
      version,
      force,
    });
    if (
      checksums.main !== sha256(readFileSync(outfile)) ||
      checksums.styles !== sha256(readFileSync(join(root, 'styles.css')))
    ) {
      throw new Error('The installed files are not the fresh build');
    }
    console.log(formatReport(built).join('\n'));
    console.log(`Installed version ${version} into ${dir}`);
    for (const [name, sum] of Object.entries(checksums)) {
      console.log(`${sum}  ${name}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
