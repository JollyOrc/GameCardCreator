// US-010 AC-1, AC-2, AC-3: the glyph check of the cards. `cardCodePoints` reads
// the text the plugin sets on a card (the story's terms), `glyphDetail` writes
// the characters with their code points, `glyphWarnings` makes one warning per
// note whose card has a character no font of the compile draws. Pure: no
// Obsidian, Node or I/O.
//
// SCAR-017: the card text is read here from the same places the sheet writes
// user text through `typstString` (`core/card/sheet.ts`: seven places, guarded
// by `tests/unit/card-escape.test.ts`). A new escaped place there must be read
// here too: that guard fails first.
import {cardCode} from '../card/warning';
import type {CreatureCard} from '../creature/read';
import type {CreatureSettings} from '../creature/settings';
import type {Block, CardWarning, SkillCard} from '../skill/read';

/** US-010 AC-1 (D3): how many characters one warning lists. */
export const GLYPH_LIST_LIMIT = 10;

/**
 * US-010 AC-2: spaces, control characters, zero-width and direction format
 * characters, the word joiner, the byte-order mark and the variation selectors
 * are not checked (they draw nothing or are not letters).
 */
const ignored = (code: number): boolean =>
  code === 0x20 ||
  code < 0x20 ||
  (code >= 0x7f && code <= 0x9f) ||
  (code >= 0x200b && code <= 0x200f) ||
  code === 0x2060 ||
  code === 0xfeff ||
  (code >= 0xfe00 && code <= 0xfe0f);

/** US-010 terms: every run of every paragraph and every list item, nested ones too. */
function blockText(blocks: readonly Block[], out: string[]): void {
  for (const block of blocks) {
    if (block.kind === 'paragraph')
      for (const run of block.runs) out.push(run.text);
    else if (block.kind === 'list')
      for (const item of block.items) blockText(item, out);
  }
}

/**
 * US-010 AC-2 and the terms: the sorted distinct code points of the text the
 * plugin sets on `card`, the ignored characters left out.
 *
 * A skill or spell card: its title, its tags (as shown), its details row
 * (`label: value`) and the note's text. A creature card: its title only when it
 * has no statblock (otherwise the band is Obsidian2Typst's), and the heading
 * and the text of each section that is drawn (a section with no blocks is not
 * drawn, so its heading is not set). Not card text: the statblock's own text,
 * the icons, the branches, the credit lines (D4). Iterates by code point, so an
 * astral character counts once and never as surrogate halves.
 */
export function cardCodePoints(
  card: SkillCard | CreatureCard,
  headings: CreatureSettings,
): number[] {
  const texts: string[] = [];
  if ('instincts' in card) {
    if (card.statblock === null) texts.push(card.name);
    const section = (heading: string, blocks: readonly Block[]): void => {
      if (blocks.length === 0) return;
      texts.push(heading.trim());
      blockText(blocks, texts);
    };
    section(headings.instinctsHeading, card.instincts);
    section(headings.actionsHeading, card.actions);
    section(headings.signsHeading, card.signs);
  } else {
    texts.push(
      card.name,
      ...card.tags,
      ...card.details.map((d) => `${d.label}: ${d.value}`),
    );
    blockText(card.blocks, texts);
  }
  const set = new Set<number>();
  for (const text of texts) {
    for (const ch of text) {
      const code = ch.codePointAt(0) as number;
      if (!ignored(code)) set.add(code);
    }
  }
  return [...set].sort((a, b) => a - b);
}

const hex = (code: number): string =>
  code.toString(16).toUpperCase().padStart(4, '0');

/**
 * US-010 AC-1 (D3): the detail of a glyph warning: the characters in code
 * point order, each as the character, a space and `U+` with its code point in
 * upper-case hexadecimal of at least four digits, joined by `, `; at most
 * `GLYPH_LIST_LIMIT`, then ` and N more`. Does not change `codes`.
 */
export function glyphDetail(codes: readonly number[]): string {
  const sorted = [...codes].sort((a, b) => a - b);
  const shown = sorted
    .slice(0, GLYPH_LIST_LIMIT)
    .map((code) => `${String.fromCodePoint(code)} U+${hex(code)}`)
    .join(', ');
  return sorted.length > GLYPH_LIST_LIMIT
    ? `${shown} and ${sorted.length - GLYPH_LIST_LIMIT} more`
    : shown;
}

/**
 * US-010 AC-1, AC-3, AC-5: one warning per note whose card has at least one
 * missing character (card text that `has` does not draw), in card order. The
 * code is made by `cardCode` for the card's kind and the problem
 * `GLYPH_MISSING`, the path is the note's. `has(codePoint)` says whether some font of the
 * compile draws it (AC-3). Does not change `cards`.
 */
export function glyphWarnings(
  cards: readonly (SkillCard | CreatureCard)[],
  has: (codePoint: number) => boolean,
  headings: CreatureSettings,
): CardWarning[] {
  const out: CardWarning[] = [];
  for (const card of cards) {
    const missing = cardCodePoints(card, headings).filter((c) => !has(c));
    if (missing.length === 0) continue;
    out.push({
      code: cardCode(card.kind ?? 'skill', 'GLYPH_MISSING'),
      path: card.path,
      detail: glyphDetail(missing),
    });
  }
  return out;
}
