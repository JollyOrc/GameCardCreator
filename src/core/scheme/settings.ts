// US-009 AC-1: the setting of the scheme note: the vault path of the note that holds
// the branch scheme. Pure; messages are returned, never reported.

/**
 * US-009 AC-1: checks the scheme note setting; one message, empty list when valid.
 *
 * Empty means the feature is off and is valid. Otherwise the value must be a vault
 * path: not only spaces, no leading `/`, no backslash, no path part `..` (`a..b.md`
 * is fine) and ending in `.md` (any case). Surrounding spaces do not count. The
 * message names the value as given.
 */
export function checkSchemeNote(path: string): string[] {
  if (path === '') return [];
  const p = path.trim();
  const parts = p.split('/');
  const bad =
    p === '' ||
    p.startsWith('/') ||
    p.includes('\\') ||
    parts.includes('..') ||
    !p.toLowerCase().endsWith('.md');
  return bad
    ? [
        `The scheme note "${path}" must be a vault path ending in .md (no leading /, no \\ and no ..)`,
      ]
    : [];
}
