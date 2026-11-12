// US-008 AC-2, AC-8: builds main.js (CommonJS, desktop). The compiler
// WebAssembly, the fonts and the code of the compile worker are embedded as
// text, so the plugin folder needs only main.js, manifest.json and styles.css.
// The packages of both bundles (the plugin and the worker) are read from the
// metafiles and their licences checked (SCAR-036). Adapted from
// Obsidian2Typst's build-plugin.mjs (same author, MIT licence).
import {build} from 'esbuild';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {builtinModules} from 'node:module';
import {join} from 'node:path';
import {gzipBase64} from './embed.mjs';
import {
  bundledPackages,
  checkLicences,
  licenceReport,
  packageDirs,
} from './licences.mjs';

const root = join(import.meta.dirname, '..');
const compilerWasmPath = join(
  root,
  'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
);
const fontsDir = join(root, 'assets/fonts');

/** The bundled fonts: every .otf of assets/fonts, sorted, one text each. */
const fonts = () =>
  readdirSync(fontsDir)
    .filter((name) => /\.otf$/.test(name))
    .sort()
    .map((name) =>
      gzipBase64(new Uint8Array(readFileSync(join(fontsDir, name)))),
    );

/** Computed once per process: gzip of 28 MB takes a few seconds. */
let cached;
async function embedded() {
  if (cached !== undefined) return cached;
  const worker = await build({
    entryPoints: [join(root, 'src/plugin/compiler/worker.ts')],
    bundle: true,
    write: false,
    metafile: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    banner: {js: '// gcc-worker'},
    legalComments: 'none',
    logLevel: 'warning',
  });
  cached = {
    'compiler-wasm': gzipBase64(new Uint8Array(readFileSync(compilerWasmPath))),
    fonts: fonts(),
    'worker-source': worker.outputFiles[0].text,
    workerMetafile: worker.metafile,
  };
  return cached;
}

const embeddedModules = {
  name: 'embedded',
  setup(b) {
    b.onResolve({filter: /^embedded:/}, (args) => ({
      path: args.path.slice('embedded:'.length),
      namespace: 'embedded',
    }));
    b.onLoad({filter: /.*/, namespace: 'embedded'}, async (args) => ({
      contents: `export default ${JSON.stringify((await embedded())[args.path])};`,
      loader: 'js',
    }));
  },
};

/** `{version, license}` of a package folder, or null. */
function readPackage(dir) {
  try {
    return JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * US-008 | AC-8: Builds the plugin bundle into `outfile`, then reports the
 * packages of the plugin and of the worker bundle with their licences (read
 * from the metafiles) and the size of the file. Throws, naming every problem,
 * when a licence is not allowed or `argparse` is in a bundle; the file is
 * written before the check, so a caller must not use it after a throw.
 */
export async function buildPlugin({outfile, logLevel = 'info'}) {
  const result = await build({
    entryPoints: [join(root, 'src/plugin/main.ts')],
    outfile,
    bundle: true,
    metafile: true,
    format: 'cjs',
    platform: 'node',
    target: 'es2022',
    sourcemap: false,
    minify: false,
    logLevel,
    plugins: [embeddedModules],
    external: [
      'obsidian',
      'electron',
      '@codemirror/*',
      '@lezer/*',
      ...builtinModules,
      ...builtinModules.map((m) => `node:${m}`),
    ],
  });
  const {workerMetafile} = await embedded();
  const dirs = new Map();
  for (const meta of [result.metafile, workerMetafile]) {
    for (const [name, dir] of packageDirs(meta)) dirs.set(name, dir);
  }
  const names = [
    ...new Set([
      ...bundledPackages(result.metafile),
      ...bundledPackages(workerMetafile),
    ]),
  ].sort();
  const report = licenceReport(names, (name) => readPackage(dirs.get(name)));
  const problems = checkLicences(report);
  if (problems.length > 0) {
    throw new Error(`The bundle is not allowed:\n- ${problems.join('\n- ')}`);
  }
  return {report, size: statSync(outfile).size};
}

/** The report of `buildPlugin` as text lines. */
export function formatReport({report, size}) {
  return [
    `Bundled packages (${report.length}), from the metafiles:`,
    ...report.map((p) => `  ${p.name} ${p.version} ${p.licence}`),
    `main.js: ${(size / 1024 / 1024).toFixed(1)} MB (${size} bytes)`,
  ];
}
