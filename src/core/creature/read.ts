// US-004 AC-1, AC-2: a creature note read into the model of its card. Pure: no
// Obsidian, Node or I/O. The header is removed once (`splitHeader`, SCAR-034)
// and read by the skill reader's own function (SCAR-017); the text rules are
// those of `BlockBuilder`, with the codes of the creature kind.
import {
  BlockBuilder,
  headerEntries,
  parseBody,
  Reading,
  splitHeader,
  type Block,
  type CardWarning,
  type Token,
} from '../skill/read';
import type {StatblockOk} from './answer';
import type {CreatureSettings} from './settings';

/** US-004 "What the card shows of a note": the model of one creature card. */
export interface CreatureCard {
  kind: 'creature';
  path: string;
  /** The file name without `.md` (the band of the statblock). */
  name: string;
  /** The note's properties as plain values (the statblock reads them, AC-1). */
  properties: Record<string, unknown>;
  instincts: Block[];
  actions: Block[];
  signs: Block[];
  /** The accepted answer of the API, or null (not asked yet, or refused: AC-11). */
  statblock: StatblockOk | null;
}

/** A section found in the note: where it is and what its heading asked for. */
interface Found {
  which: 'instincts' | 'actions' | 'signs';
  tokens: Token[];
}

/** The plain text of a heading's inline token, compared without case. */
const headingKey = (inline: Token | undefined): string =>
  (inline?.content ?? '').trim().toLowerCase();

/**
 * US-004 AC-2: finds the sections of `tokens` by their headings.
 *
 * Only a heading at the top level of the note counts: a heading inside a list
 * item or a callout (a quote) is not a section heading (the owner, 2026-11-13).
 * A section ends at the next top-level heading of the same or a higher level; a
 * lower heading inside it is dropped (its text is not shown), its text under it
 * stays. The first section with a heading's text is the one; the same text set
 * for two sections gives the first of the three, in the order instincts,
 * actions, signs.
 */
function findSections(
  tokens: readonly Token[],
  settings: CreatureSettings,
): Found[] {
  const wanted: [Found['which'], string][] = [
    ['instincts', settings.instinctsHeading.trim().toLowerCase()],
    ['actions', settings.actionsHeading.trim().toLowerCase()],
    ['signs', settings.signsHeading.trim().toLowerCase()],
  ];
  const found: Found[] = [];
  const done = new Set<Found['which']>();
  for (let i = 0; i < tokens.length; i++) {
    const open = tokens[i]!;
    if (open.type !== 'heading_open' || open.level !== 0) continue;
    const level = Number(open.tag.slice(1));
    const key = headingKey(tokens[i + 1]);
    const hit = wanted.find(
      ([which, text]) => text === key && !done.has(which),
    );
    if (hit === undefined) continue;
    done.add(hit[0]);
    const body: Token[] = [];
    let j = i + 3;
    for (; j < tokens.length; j++) {
      const t = tokens[j]!;
      if (t.type === 'heading_open' && t.level === 0) {
        if (Number(t.tag.slice(1)) <= level) break;
        j += 2; // a lower heading: dropped with its text
        continue;
      }
      body.push(t);
    }
    found.push({which: hit[0], tokens: body});
    i = j - 1;
  }
  return found;
}

/**
 * US-004 AC-1, AC-2: reads a creature note into its card.
 *
 * The title is the file name without `.md`; the properties are the header's
 * plain values (a header that is not a mapping gives `{}` and
 * the creature kind's properties-invalid warning); the three sections are found by the headings
 * of `settings` (without case, at any level, top level of the note only). A
 * missing Instincts or Actions section gives no block and one
 * section-missing warning of the creature kind (detail: the heading as set, Instincts first); a
 * missing Signs section, or a section without text, gives neither. Warnings of
 * the text rules come in the order of the note's text, then the missing
 * sections. The `statblock` is null: the run asks the API (AC-3).
 */
export function readCreature(
  path: string,
  text: string,
  settings: CreatureSettings,
): {card: CreatureCard; warnings: CardWarning[]} {
  const reading = new Reading(path, 'creature');
  const name = path.replace(/^.*[\\/]/, '').replace(/\.md$/i, '');
  const {header, body} = splitHeader(text);
  const properties = Object.fromEntries(headerEntries(header, reading));

  const sections = findSections(parseBody(body), settings);
  const card: CreatureCard = {
    kind: 'creature',
    path,
    name,
    properties,
    instincts: [],
    actions: [],
    signs: [],
    statblock: null,
  };
  for (const section of sections) {
    card[section.which] = new BlockBuilder(section.tokens, reading).blocks();
  }
  const has = (which: Found['which']): boolean =>
    sections.some((s) => s.which === which);
  if (!has('instincts')) {
    reading.warn('SECTION_MISSING', settings.instinctsHeading.trim());
  }
  if (!has('actions')) {
    reading.warn('SECTION_MISSING', settings.actionsHeading.trim());
  }
  return {card, warnings: reading.warnings};
}
