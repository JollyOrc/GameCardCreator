// US-005 AC-3 (D4): the kind of a note by folder rules. A rule's folder
// contains a note when the note's path starts with the folder and a `/`, never
// a bare prefix (SCAR-033); the longest folder wins; case matters.

/** US-005 AC-3: the kinds a rule can give (the creature card is US-004). */
export type NoteKind = 'skill' | 'spell';

/** US-005 AC-3: one rule of the settings. */
export interface KindRule {
  folder: string;
  kind: NoteKind;
}

/** A rule's folder without surrounding spaces and trailing slashes. */
const folderOf = (rule: KindRule): string =>
  rule.folder.trim().replace(/\/+$/, '');

/**
 * US-005 AC-3: the kind of `path` under `rules`, or null when no rule's folder
 * contains it. `Skills` contains `Skills/A.md` and `Skills/Sub/B.md`, not
 * `Skills Extra/C.md`, `Other/Skills/D.md`, `skills/E.md` or `Skills.md`.
 */
export function kindOf(
  path: string,
  rules: readonly KindRule[],
): NoteKind | null {
  let best: {length: number; kind: NoteKind} | null = null;
  for (const rule of rules) {
    const folder = folderOf(rule);
    if (folder === '' || !path.startsWith(`${folder}/`)) continue;
    if (best === null || folder.length > best.length) {
      best = {length: folder.length, kind: rule.kind};
    }
  }
  return best === null ? null : best.kind;
}

/**
 * US-005 AC-3: checks the rules; one message per problem, empty when valid. A
 * folder must not be empty or `/`, the kind must be `skill` or `spell`, and a
 * folder must not be named by two rules.
 */
export function checkKindRules(rules: readonly KindRule[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  rules.forEach((rule, i) => {
    const folder = folderOf(rule);
    const place = `Kind rule ${i + 1}`;
    if (folder === '') {
      issues.push(`${place}: the folder is empty`);
    } else if (seen.has(folder)) {
      issues.push(
        `${place}: the same folder "${folder}" is named by two rules`,
      );
    } else {
      seen.add(folder);
    }
    if (rule.kind !== 'skill' && rule.kind !== 'spell') {
      issues.push(
        `${place}: the kind "${String(rule.kind)}" is not skill or spell`,
      );
    }
  });
  return issues;
}
