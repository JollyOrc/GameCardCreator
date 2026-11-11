// US-005 AC-1: the deck note. `deckLinks` reads the targets of the links that
// become cards, in text order; `planDeck` turns them into notes with Obsidian's
// own answer (an injected resolver) and the warnings. Pure: the resolver and
// the list of notes with a name are dependencies.
import {splitHeader, type CardWarning} from '../skill/read';

/** What the resolver answers for a link target: a file's path, and whether it is a note. */
export interface Resolved {
  path: string;
  isNote: boolean;
}

/** US-005 AC-1: the vault lookups the plan needs (the plugin's: Obsidian's link lookup). */
export interface DeckDeps {
  /** The file that `target` means from the deck note, or null when none. */
  resolve(target: string, deckPath: string): Resolved | null;
  /** The paths of all notes with this name (without folder and `.md`). */
  notesNamed(name: string): string[];
}

/** A link: an embed or image (group 1) skipped later, `[[...]]` (2), or `[t](...)` (4, 5). */
const LINK = /(!?)\[\[([^\]\n]+?)\]\]|(!?)\[([^\]\n]*)\]\(([^)\n]*)\)/g;

/** The text without fenced code blocks and inline code (their links are no links). */
function withoutCode(text: string): string {
  const lines: string[] = [];
  let fence: string | null = null;
  for (const line of text.split('\n')) {
    const open = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence === null) {
      if (open !== null) {
        fence = open[1]![0]!;
        lines.push('');
      } else {
        lines.push(line);
      }
    } else {
      if (open !== null && open[1]![0] === fence) fence = null;
      lines.push('');
    }
  }
  return lines.join('\n').replace(/(`+)[^`]*?\1/g, ' ');
}

/** A target without `#heading`, `^block` and `.md`; empty when it names only a part of the same note. */
function cleanTarget(raw: string): string {
  const base = raw.split(/[#^]/)[0]!.trim();
  return base.replace(/\.md$/i, '');
}

/**
 * US-005 AC-1: the targets of the deck note's links, in text order.
 *
 * Links are `[[Name]]`, `[[Name|alias]]`, `[[Folder/Name]]` and `[text](Name.md)`;
 * a target loses `#Heading`, `^block`, `.md` and URL escapes. Not links to
 * cards: embeds, images, links with a scheme, links to the same note, code, and
 * the note's header (removed by the one header reader, SCAR-034).
 */
export function deckLinks(text: string): string[] {
  const body = withoutCode(splitHeader(text).body);
  const targets: string[] = [];
  for (const m of body.matchAll(LINK)) {
    if (m[1] === '!' || m[3] === '!') continue;
    let target: string;
    if (m[2] !== undefined) {
      const inner = m[2].split('|')[0]!.replace(/\\$/, '');
      target = cleanTarget(inner);
    } else {
      let dest = (m[5] ?? '').trim();
      if (dest.startsWith('<') && dest.includes('>')) {
        dest = dest.slice(1, dest.indexOf('>'));
      } else {
        dest = dest.split(/\s/)[0]!;
      }
      if (/^[a-z][a-z0-9+.-]*:/i.test(dest)) continue;
      let decoded = dest;
      try {
        decoded = decodeURIComponent(dest);
      } catch {
        // an invalid escape stays as written
      }
      target = cleanTarget(decoded);
    }
    if (target !== '') targets.push(target);
  }
  return targets;
}

/**
 * US-005 AC-1: the notes the deck gives, in link order (a repeat repeats), and
 * the warnings, in link order: a target no note answers gives
 * `DECK_LINK_MISSING`; an answer that is not a note `DECK_LINK_NOT_A_NOTE`; a
 * bare name (no `/`) that more than one note has gives the answered note and
 * `DECK_LINK_AMBIGUOUS` (`name; using path`). The detail is the target.
 */
export function planDeck(
  deckPath: string,
  deckText: string,
  deps: DeckDeps,
): {notes: string[]; warnings: CardWarning[]} {
  const notes: string[] = [];
  const warnings: CardWarning[] = [];
  const warn = (code: string, detail: string): void => {
    warnings.push({code, path: deckPath, detail});
  };
  for (const target of deckLinks(deckText)) {
    const found = deps.resolve(target, deckPath);
    if (found === null) {
      warn('DECK_LINK_MISSING', target);
    } else if (!found.isNote) {
      warn('DECK_LINK_NOT_A_NOTE', target);
    } else {
      if (!target.includes('/') && deps.notesNamed(target).length > 1) {
        warn('DECK_LINK_AMBIGUOUS', `${target}; using ${found.path}`);
      }
      notes.push(found.path);
    }
  }
  return {notes, warnings};
}
