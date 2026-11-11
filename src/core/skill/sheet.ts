// US-002 AC-2, AC-5, AC-6, AC-7, AC-9, AC-10, AC-12: the skill cards as Typst
// on the sheet of US-001. Pure text: positions come from `sheet/layout.ts`
// through `sheetTypst`; every piece of user text goes through `typstString`
// (the one escaping function, rule 6). The size is chosen inside Typst with
// `measure`, in one compile; the chosen size and whether the text fits are
// written as a fact with the label `gcc-fit` (read by `fitWarnings`).
import {typstString} from '../card/escape';
import {checkSkillSettings, textSizes, type SkillSettings} from './settings';
import {FIT_LABEL} from './fit';
import type {Block, Run, SkillCard} from './read';
import {mm, sheetTypst} from '../sheet/typst';
import type {SheetSettings} from '../sheet/layout';

/** US-002 "The card": padding inside the frame, in mm. */
const PADDING_MM = 4;
/** US-002 "The card": gap after each element and rule stroke, in pt. */
const GAP_PT = 2;
const RULE_PT = 0.4;

/** The Typst helper that tries the sizes and writes the fact (AC-5, AC-6). */
const PRELUDE = `#set text(font: "Libertinus Serif", hyphenate: false, lang: "en")
#let gcc-fit(i, sizes, w, h, build) = context {
  let chosen = sizes.last()
  let fits = false
  for s in sizes {
    if measure(block(width: w, build(s))).height <= h {
      chosen = s
      fits = true
      break
    }
  }
  [#metadata((i: i, size: chosen, fits: fits)) <${FIT_LABEL}>]
  block(width: w, height: h, clip: true, build(chosen))
}`;

/** A run as markup: its text as a string literal, wrapped for its formatting. */
function runCode(run: Run): string {
  let code = typstString(run.text);
  if (run.italic === true) code = `emph(${code})`;
  if (run.bold === true) code = `strong(${code})`;
  return `#${code}`;
}

/** US-002 AC-4: a block as markup; blocks are separated by a blank line. */
function blockCode(block: Block): string {
  switch (block.kind) {
    case 'paragraph':
      return block.runs.map(runCode).join('');
    case 'rule':
      return `#line(length: 100%, stroke: ${RULE_PT}pt)`;
    case 'list': {
      const items = block.items.map((item) => `[${blocksCode(item)}]`);
      return `#${block.ordered ? 'enum' : 'list'}(${items.join(', ')})`;
    }
  }
}

function blocksCode(blocks: readonly Block[]): string {
  return blocks.map(blockCode).join('\n\n');
}

/** US-002 "The card": the content builder `s => ...` of one card, `s` in pt. */
function buildCode(card: SkillCard): string {
  const parts = [
    's => {',
    '  set text(size: s * 1pt)',
    '  set par(leading: 0.5em, spacing: 0.6em)',
    '  set list(tight: true, indent: 0pt, body-indent: 3pt, marker: [•])',
    '  set enum(tight: true, indent: 0pt, body-indent: 3pt)',
  ];
  if (card.tags.length > 0) {
    const tags = card.tags.map((t) => `#${typstString(t)}`).join(' · ');
    parts.push(
      `  block(below: ${GAP_PT}pt, text(size: 0.8em, weight: "bold")[${tags}])`,
    );
  }
  parts.push(
    `  block(below: ${GAP_PT}pt, text(size: 1.3em, weight: "bold")[#${typstString(card.name)}])`,
  );
  if (card.details.length > 0) {
    const row = card.details
      .map((d) => `#${typstString(`${d.label}: ${d.value}`)}`)
      .join(' · ');
    parts.push(`  block(below: ${GAP_PT}pt, text(size: 0.9em)[${row}])`);
  }
  parts.push(
    `  line(length: 100%, stroke: ${RULE_PT}pt)`,
    `  v(${GAP_PT}pt)`,
    `  [${blocksCode(card.blocks)}]`,
    '}',
  );
  return parts.join('\n');
}

/**
 * US-002 AC-2, AC-5 to AC-7, AC-9, AC-10, AC-12: the Typst source of a sheet
 * of skill cards.
 *
 * Each card sits in its US-001 frame, 4 mm inside it; its text area is the
 * card minus the padding. The sizes tried are those of `textSizes`; the fact
 * `(i, size, fits)` of every card is written with the label `gcc-fit`.
 * Refuses invalid skill settings, 0 cards and what the sheet refuses, with a
 * message and no source.
 */
export function skillSheetTypst(
  cards: readonly SkillCard[],
  sheet: SheetSettings,
  skill: SkillSettings,
): {ok: true; source: string} | {ok: false; message: string} {
  const issues = checkSkillSettings(skill);
  if (issues.length > 0) return {ok: false, message: issues.join('; ')};
  const sizes = `(${textSizes(skill).join(', ')})`;
  const width = mm(sheet.cardWidth - 2 * PADDING_MM);
  const height = mm(sheet.cardHeight - 2 * PADDING_MM);
  return sheetTypst(cards.length, sheet, {
    prelude: PRELUDE,
    card: (placed) => {
      const card = cards[placed.index];
      if (card === undefined) return '';
      return (
        `#place(top + left, dx: ${mm(placed.x + PADDING_MM)}, ` +
        `dy: ${mm(placed.y + PADDING_MM)}, ` +
        `gcc-fit(${placed.index}, ${sizes}, ${width}, ${height}, ${buildCode(card)}))`
      );
    },
  });
}
