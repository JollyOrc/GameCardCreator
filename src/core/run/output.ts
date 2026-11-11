// US-005 AC-5 (SCAR-033): the output folder is classified from its text and the
// vault's folder before anything is read, asked or written. Pure string work, no
// file system: whether the path is a file is asked by the runner.

/** US-005 AC-5: the folder in its normal form, or why it is refused. */
export type OutputFolder =
  {ok: true; folder: string} | {ok: false; message: string};

/** The comparison form: `/` separators, no trailing separator. */
const compare = (path: string): string =>
  path.replace(/\\/g, '/').replace(/\/+$/, '');

/**
 * US-005 AC-5: classifies the setting `text`. Refused, with a message that names
 * the setting and the value: empty, a relative path (`~/out` is one), a `..` segment,
 * the filesystem root, the vault's own folder, `.obsidian` or anything below
 * it. An absolute path starts with `/` or with a drive letter, `:` and `\` or
 * `/`. The accepted folder has no trailing separator and no `//` or `/./`:
 * `/tmp//out/` is `/tmp/out`; a folder inside the vault is allowed.
 */
export function checkOutputFolder(
  text: string,
  vaultRoot: string,
): OutputFolder {
  const refuse = (reason: string): OutputFolder => ({
    ok: false,
    message: `Output folder "${text}" ${reason}`,
  });
  const t = text.trim();
  if (t === '') return {ok: false, message: 'Output folder is empty'};
  const drive = /^([A-Za-z]:)[\\/]/.exec(t);
  const posix = t.startsWith('/');
  if (!drive && !posix) return refuse('is not an absolute path');

  const rest = drive ? t.slice(drive[1]!.length) : t;
  const parts = rest.split(/[\\/]+/);
  if (parts.includes('..')) return refuse('has a .. segment');
  const segments = parts.filter((p) => p !== '' && p !== '.');
  if (segments.length === 0) return refuse('is the filesystem root');

  const sep = drive ? (rest.includes('\\') ? '\\' : '/') : '/';
  const folder = drive
    ? `${drive[1]}${sep}${segments.join(sep)}`
    : `/${segments.join('/')}`;

  const here = compare(folder);
  const vault = compare(vaultRoot);
  if (vault !== '' && here === vault)
    return refuse("is the vault's own folder");
  if (
    vault !== '' &&
    (here === `${vault}/.obsidian` || here.startsWith(`${vault}/.obsidian/`))
  ) {
    return refuse('is inside .obsidian');
  }
  return {ok: true, folder};
}
