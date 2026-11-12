// US-008 AC-8 (SCAR-036, SCAR-042): the licences of what the bundle really
// holds, read from esbuild's metafile and from each package's own
// package.json, checked against the allowed list. Pure functions.

/** The licences a bundled package may have (OFL-1.1 is for the fonts). */
export const ALLOWED_LICENCES = [
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'Apache-2.0',
  'OFL-1.1',
];

/** A package that markdown-it lists for its command-line tool only. */
const NEVER_BUNDLED = 'argparse';

/**
 * US-008 | AC-8: The package folder of every package the metafile's inputs
 * come from: name -> folder (the innermost `node_modules` of a nested
 * package; scoped names are whole, `@scope/name`).
 */
export function packageDirs(metafile) {
  const dirs = new Map();
  for (const input of Object.keys(metafile.inputs ?? {})) {
    const at = input.lastIndexOf('node_modules/');
    if (at < 0) continue;
    const rest = input.slice(at + 'node_modules/'.length).split('/');
    const parts = rest[0].startsWith('@') ? rest.slice(0, 2) : rest.slice(0, 1);
    if (parts.length === 0 || parts.some((p) => p === '')) continue;
    const name = parts.join('/');
    dirs.set(name, input.slice(0, at) + 'node_modules/' + name);
  }
  return dirs;
}

/**
 * US-008 | AC-8: The names of the packages the bundle holds, each once,
 * sorted. Read from the metafile, not from package.json.
 */
export function bundledPackages(metafile) {
  return [...packageDirs(metafile).keys()].sort();
}

/**
 * US-008 | AC-8: Version and licence of each package, from its own
 * package.json (`read(name)` gives `{version, license}` or null).
 */
export function licenceReport(names, read) {
  return names.map((name) => {
    const found = read(name);
    const license = found?.license;
    return {
      name,
      version: found?.version ?? '',
      licence: typeof license === 'string' ? license : '',
    };
  });
}

/** Whether an SPDX expression is allowed: OR needs one allowed, AND needs all. */
function allowed(expression) {
  const text = expression.trim().replace(/^\(|\)$/g, '');
  return text
    .split(/\s+OR\s+/)
    .some((alt) =>
      alt
        .split(/\s+AND\s+/)
        .every((id) => ALLOWED_LICENCES.includes(id.trim())),
    );
}

/**
 * US-008 | AC-8: The problems of a licence report, one line each: a package
 * with no licence or a licence not on the allowed list, and `argparse` (the
 * command-line tool's package must not be in the bundle).
 */
export function checkLicences(report) {
  const problems = [];
  for (const {name, version, licence} of report) {
    const who = `${name}${version === '' ? '' : ` ${version}`}`;
    if (name === NEVER_BUNDLED) {
      problems.push(
        `${who} is in the bundle; it is for the command-line tool only and must not be bundled`,
      );
    } else if (licence === '') {
      problems.push(`${who} has no licence`);
    } else if (!allowed(licence)) {
      problems.push(
        `${who} has the licence ${licence}, not on the allowed list`,
      );
    }
  }
  return problems;
}
