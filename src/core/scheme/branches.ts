// US-009 AC-2: which rows of the scheme a note's tags select. Pure; the one place a
// tag is compared with a row's tag (SCAR-017): the reader uses `tagKey` for the
// duplicate check, so the two cannot disagree.
import type {SchemeRow} from './read';

/**
 * US-009 AC-1, AC-2: the comparison key of a tag: without backticks, surrounding
 * spaces, one leading `#` and case (`#swordplay ` and `Swordplay` are one tag; `##a`
 * is not `a`).
 */
export function tagKey(tag: string): string {
  return tag.replace(/`/g, '').trim().replace(/^#/, '').trim().toLowerCase();
}

/**
 * US-009 AC-2: the branches of a note: the rows whose tag the note has, in the order
 * of the NOTE's tags (not of the table); a tag without a row is ignored, a tag
 * written twice gives its branch once at its first place. Does not change its
 * inputs and returns the rows themselves (their colour and icon are the row's).
 */
export function branchesOf(
  tags: readonly string[],
  rows: readonly SchemeRow[],
): SchemeRow[] {
  const byKey = new Map<string, SchemeRow>();
  for (const row of rows) {
    const key = tagKey(row.tag);
    if (!byKey.has(key)) byKey.set(key, row);
  }
  const out: SchemeRow[] = [];
  for (const tag of tags) {
    const row = byKey.get(tagKey(tag));
    if (row !== undefined && !out.includes(row)) out.push(row);
  }
  return out;
}
