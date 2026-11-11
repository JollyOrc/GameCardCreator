// Bundles src/plugin/main.ts into main.js for Obsidian.
import esbuild from 'esbuild';
import {existsSync} from 'node:fs';
import process from 'node:process';

if (!existsSync('src/plugin/main.ts')) {
  process.stdout.write('No src/plugin/main.ts yet: nothing to bundle.\n');
} else {
  await esbuild.build({
    entryPoints: ['src/plugin/main.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'es2022',
    external: ['obsidian', 'electron'],
    outfile: 'main.js',
    logLevel: 'info',
  });
}
