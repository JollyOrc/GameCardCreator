// US-002 AC-2, AC-5, AC-6, AC-7, AC-9, AC-10, AC-12, US-003 AC-6, AC-7, US-004
// AC-4 to AC-9: cards of any kind (skill, spell, creature) as Typst on the sheet
// of US-001. Pure text: positions come from `sheet/layout.ts`
// through `sheetTypst`; every piece of user text goes through `typstString`
// (the one escaping function, rule 6). The size is chosen inside Typst with
// `measure`, in one compile; the chosen size and whether the text fits are
// written as a fact with the label `gcc-fit` (read by `fitWarnings`).
import {typstString} from '../card/escape';
import type {CreatureCard} from '../creature/read';
import {DEFAULT_CREATURE, type CreatureSettings} from '../creature/settings';
import {checkSizes, textSizes, type CardSizes} from '../skill/settings';
import {FIT_LABEL} from '../skill/fit';
import type {Block, Run, SkillCard} from '../skill/read';
import {sheetGrid, type SheetSettings} from '../sheet/layout';
import {mm, sheetTypst} from '../sheet/typst';

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

/** US-004 AC-9: the credit is set at this size, centred, at most two lines. */
const CREDIT_PT = 5;
/** US-004 AC-9: the room the credit needs inside the bottom band, in mm. */
const CREDIT_ROOM_MM = 5;
/** US-004 AC-4: the statblock's sizes are given for this text size, in pt. */
const STATBLOCK_BASE_PT = 7;

/**
 * US-004 AC-5, AC-9: the Typst helpers of creature cards. `gcc-fit-c` tries the
 * card at the largest size with all its parts, then with the parts given up one
 * by one (`parts` in the order they are given up), each time at the largest size
 * again; only when all of them are given up and it still does not fit is the
 * minimum tried at the smaller sizes, down to the smallest. The fact written
 * under the label `gcc-fit` has `dropped`: the parts given up. `gcc-credit` sets
 * a text in at most two centred lines, cut with an ellipsis at a word.
 */
const CREATURE_PRELUDE = `#let gcc-fit-c(i, sizes, w, h, build, parts) = context {
  let fits-at(s, dropped) = measure(block(width: w, build(s, dropped))).height <= h
  let chosen = none
  for n in range(parts.len() + 1) {
    let dropped = parts.slice(0, n)
    if fits-at(sizes.first(), dropped) {
      chosen = (sizes.first(), dropped, true)
      break
    }
  }
  if chosen == none {
    let dropped = parts
    for s in sizes {
      if fits-at(s, dropped) {
        chosen = (s, dropped, true)
        break
      }
    }
    if chosen == none { chosen = (sizes.last(), dropped, false) }
  }
  [#metadata((i: i, size: chosen.at(0), fits: chosen.at(2), dropped: chosen.at(1))) <${FIT_LABEL}>]
  block(width: w, height: h, clip: true, build(chosen.at(0), chosen.at(1)))
}
#let gcc-credit(txt, w) = context {
  let one(t) = block(width: w, align(center, text(size: ${CREDIT_PT}pt, par(leading: 0.3em, t))))
  let two = measure(one[x \\ x]).height
  let words = txt.split(" ")
  let shown = txt
  if measure(one(txt)).height > two + 0.01pt {
    for k in range(words.len(), 0, step: -1) {
      let t = words.slice(0, k).join(" ") + "…"
      if measure(one(t)).height <= two + 0.01pt {
        shown = t
        break
      }
    }
  }
  one(shown)
}`;

/** A creature card (it has sections), not a skill or spell card. */
const isCreature = (card: SkillCard | CreatureCard): card is CreatureCard =>
  'instincts' in card;

/** The Typst name of the statblock data of card `i`. */
const sbName = (i: number): string => `gcc-sb${i}`;

/**
 * US-004 AC-4 to AC-6, AC-11: the content builder `(s, drop) => ...` of one
 * creature card, `s` in pt, `drop` the parts given up.
 *
 * With a statblock: its data (bound as `gcc-sb<i>`, never edited as text) with
 * each size of `look.sizes` multiplied by s / 7 and, when Skills is given up,
 * `skills: none`, drawn by `o2t-sb-box`; without one the card's title (a refused
 * answer, D2). Then the Instincts, Actions and Signs sections, each with its
 * heading as a small bold line; a section with no blocks is not drawn.
 */
function creatureBuildCode(
  card: CreatureCard,
  i: number,
  headings: CreatureSettings,
): string {
  const hasStatblock = card.statblock !== null;
  const parts = [
    '(s, drop) => {',
    '  set text(size: s * 1pt)',
    '  set par(leading: 0.5em, spacing: 0.6em)',
    '  set list(tight: true, indent: 0pt, body-indent: 3pt, marker: [•])',
    '  set enum(tight: true, indent: 0pt, body-indent: 3pt)',
  ];
  if (hasStatblock) {
    parts.push(
      `  let d0 = ${sbName(i)}`,
      `  let f = s / ${STATBLOCK_BASE_PT}`,
      '  let sizes = d0.look.sizes.pairs().map(p => (p.at(0), p.at(1) * f)).to-dict()',
      '  let d = (..d0, look: (..d0.look, sizes: sizes), skills: if drop.contains("Skills") { none } else { d0.skills })',
      '  o2t-sb-box(d)',
      `  v(${GAP_PT}pt)`,
    );
  } else {
    parts.push(
      `  block(below: ${GAP_PT}pt, text(size: 1.3em, weight: "bold")[#${typstString(card.name)}])`,
      `  line(length: 100%, stroke: ${RULE_PT}pt)`,
      `  v(${GAP_PT}pt)`,
    );
  }
  const section = (
    name: 'Instincts' | 'Actions' | 'Signs',
    heading: string,
    blocks: readonly Block[],
  ): void => {
    if (blocks.length === 0) return;
    const body = [
      `block(below: 2.5pt, text(size: 0.9em, weight: "bold")[#${typstString(heading.trim())}])`,
      `[${blocksCode(blocks)}]`,
      `v(${GAP_PT}pt)`,
    ].join('\n    ');
    parts.push(
      name === 'Actions'
        ? `  {\n    ${body}\n  }`
        : `  if not drop.contains("${name}") {\n    ${body}\n  }`,
    );
  };
  section('Instincts', headings.instinctsHeading, card.instincts);
  section('Actions', headings.actionsHeading, card.actions);
  section('Signs', headings.signsHeading, card.signs);
  parts.push('}');
  return parts.join('\n');
}

/**
 * US-004 AC-5: the Typst array of the parts of creature card `i` that can be
 * given up, in the order they are given up: Signs and Instincts when the card
 * has them, Skills when its statblock has a Skills line (read from the data in
 * Typst, not from its text).
 */
function creaturePartsCode(card: CreatureCard, i: number): string {
  const lines = ['{', '  let p = ()'];
  if (card.signs.length > 0) lines.push('  p.push("Signs")');
  if (card.instincts.length > 0) lines.push('  p.push("Instincts")');
  if (card.statblock !== null) {
    lines.push(`  if ${sbName(i)}.skills != none { p.push("Skills") }`);
  }
  lines.push('  p', '}');
  return lines.join('\n');
}

/**
 * US-002 AC-2, AC-5 to AC-7, AC-9, AC-10, AC-12, US-003 AC-6, AC-7, US-004 AC-4
 * to AC-9, AC-11, AC-12: the Typst source of a sheet of cards, of any kind and
 * mixed, and the icon files its creature statblocks name.
 *
 * Each card sits in its US-001 frame, 4 mm inside it; its text area is the
 * card minus the padding. The sizes tried are those of `textSizes`, shared by
 * all kinds (D2); the fact `(i, size, fits)` of every card is written with the
 * label `gcc-fit` (a creature card's fact also has `dropped`). A creature
 * card's statblock is its `statblock` answer (null: a card without one); the
 * Typst definitions of the first answer are written once, the files of all
 * answers are returned once per path (the first wins; a conflict is the run's
 * to refuse, AC-12a). `headings` are the section headings printed on creature
 * cards. On each page that has a creature card with a credit, the credit is set
 * once at 5 pt, centred, at most two lines, in the band between the last card
 * row and the bottom edge; a band under 3 mm has no room and the line is left
 * out. Refuses invalid sizes, 0 cards and what the sheet refuses, with a
 * message and no source.
 */
export function cardSheetTypst(
  cards: readonly (SkillCard | CreatureCard)[],
  sheet: SheetSettings,
  sizes: CardSizes,
  headings: CreatureSettings = DEFAULT_CREATURE,
):
  | {
      ok: true;
      source: string;
      files: {path: string; bytes: Uint8Array}[];
    }
  | {ok: false; message: string} {
  const issues = checkSizes(sizes);
  if (issues.length > 0) return {ok: false, message: issues.join('; ')};
  const grid = sheetGrid(sheet);
  if (!grid.ok) return {ok: false, message: grid.message};
  // The trailing comma keeps one size an array: `(7)` is the number 7 in Typst.
  const sizeList = `(${textSizes(sizes).join(', ')},)`;
  const width = mm(sheet.cardWidth - 2 * PADDING_MM);
  const height = mm(sheet.cardHeight - 2 * PADDING_MM);

  const creatures = cards.flatMap((card, i) =>
    isCreature(card) ? [{card, i}] : [],
  );
  const files = new Map<string, Uint8Array>();
  const preludes: string[] = [PRELUDE];
  if (creatures.length > 0) preludes.push(CREATURE_PRELUDE);
  let answerPrelude = false;
  for (const {card, i} of creatures) {
    const answer = card.statblock;
    if (answer === null) continue;
    if (!answerPrelude) {
      preludes.push(answer.prelude);
      answerPrelude = true;
    }
    preludes.push(`#let ${sbName(i)} = ${answer.data}`);
    for (const file of answer.files) {
      if (!files.has(file.path)) files.set(file.path, file.bytes);
    }
  }
  for (const {card, i} of creatures) {
    preludes.push(`#let gcc-parts${i} = ${creaturePartsCode(card, i)}`);
  }

  const bandTop =
    grid.originY + grid.rows * sheet.cardHeight + (grid.rows - 1) * sheet.gap;
  const bandHeight = 297 - bandTop;
  const creditTop = bandTop + Math.max(0.5, (bandHeight - CREDIT_ROOM_MM) / 2);

  const result = sheetTypst(cards.length, sheet, {
    prelude: preludes.join('\n'),
    card: (placed) => {
      const card = cards[placed.index];
      if (card === undefined) return '';
      const at =
        `#place(top + left, dx: ${mm(placed.x + PADDING_MM)}, ` +
        `dy: ${mm(placed.y + PADDING_MM)}, `;
      if (isCreature(card)) {
        return (
          `${at}gcc-fit-c(${placed.index}, ${sizeList}, ${width}, ${height}, ` +
          `${creatureBuildCode(card, placed.index, headings)}, gcc-parts${placed.index}))`
        );
      }
      return `${at}gcc-fit(${placed.index}, ${sizeList}, ${width}, ${height}, ${buildCode(card)}))`;
    },
    page: (_page, onPage) => {
      if (bandHeight < 3) return '';
      const credit = onPage
        .map((p) => cards[p.index])
        .flatMap((c) =>
          c !== undefined && isCreature(c) && c.statblock !== null
            ? [c.statblock.credit ?? '']
            : [],
        )
        .find((text) => text.trim() !== '');
      if (credit === undefined) return '';
      return (
        `#place(top + left, dx: ${mm(sheet.margin)}, dy: ${mm(creditTop)}, ` +
        `gcc-credit(${typstString(credit.trim())}, ${mm(210 - 2 * sheet.margin)}))`
      );
    },
  });
  if (!result.ok) return result;
  return {
    ok: true,
    source: result.source,
    files: [...files].map(([path, bytes]) => ({path, bytes})),
  };
}
