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
import {iconCodePoint} from '../scheme/icons';
import type {SchemeRow} from '../scheme/read';
import {sheetGrid, type SheetSettings} from '../sheet/layout';
import {mm, sheetTypst, STROKE_PT} from '../sheet/typst';
import {titleSizes, type TitleSettings} from './titles';

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

/** US-002 "The card": the set rules every builder starts with, `s` in pt. */
const BUILDER_SETS = [
  '  set text(size: s * 1pt)',
  '  set par(leading: 0.5em, spacing: 0.6em)',
];
const LIST_SETS = [
  '  set list(tight: true, indent: 0pt, body-indent: 3pt, marker: [•])',
  '  set enum(tight: true, indent: 0pt, body-indent: 3pt)',
];

/** US-002 "The card": the header's lines: tags, title, details row (each when present). */
function headerLines(card: SkillCard): string[] {
  const parts: string[] = [];
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
  return parts;
}

/** US-002, US-009 AC-8: the note's text as one line of a builder (the one place its blocks are written). */
const bodyLine = (card: SkillCard): string => `  [${blocksCode(card.blocks)}]`;

/** US-002 "The card": the content builder `s => ...` of one card, `s` in pt. */
function buildCode(card: SkillCard): string {
  return [
    's => {',
    ...BUILDER_SETS,
    ...LIST_SETS,
    ...headerLines(card),
    `  line(length: 100%, stroke: ${RULE_PT}pt)`,
    `  v(${GAP_PT}pt)`,
    bodyLine(card),
    '}',
  ].join('\n');
}

/** US-009 AC-3: the header builder of a banded card: the header's lines alone. */
function bandHeaderCode(card: SkillCard): string {
  return ['s => {', ...BUILDER_SETS, ...headerLines(card), '}'].join('\n');
}

/** US-009 AC-8: the body builder of a banded card: the text under the band. */
function bandBodyCode(card: SkillCard): string {
  return ['s => {', ...BUILDER_SETS, ...LIST_SETS, bodyLine(card), '}'].join(
    '\n',
  );
}

/** US-009 AC-7: a colour is written into Typst only in this one checked form. */
const HEX_COLOUR = /^#[0-9a-f]{6}$/;
/** US-009 AC-5: the icon's size in pt, and the room kept free beside it, in mm. */
const ICON_PT = 18;
const ICON_ROOM_MM = 1.5;
/** US-009 AC-3: the band ends this far under the header, and the text this far under the band, in mm. */
const BAND_BELOW_MM = 2;
/**
 * US-009 AC-3 (amended, US-011 D8): the band ends at least this far under the lowest icon,
 * in mm. A header is counted as at least the icon's height less this difference
 * (`BAND_BELOW_MM` - `ICON_BELOW_MM` = 1 mm), so band = 4 mm + max(header + 2, icon + 1).
 */
const ICON_BELOW_MM = BAND_BELOW_MM - 1;

/**
 * US-009 AC-3, AC-5, AC-8: the Typst helper of a banded card. Draws, relative to the
 * card's top-left corner and in this order: the band (`band.fill`, `l`, `r`, `t` the
 * bleed on the left, right and top), the card's frame again, the header (4 mm from
 * the left, in the width left by the icons), the icons (right-aligned in the order
 * given) and the text. The sizes are tried as in `gcc-fit`; the header's height at a
 * size, but at least the lowest icon's height less 1 mm (US-009 AC-3 amended, D8),
 * decides the band and the room left for the text, so the band follows the chosen size
 * and the size follows the band. The fact written
 * under the label `gcc-fit` is the same `(i, size, fits)`.
 */
const BAND_PRELUDE = `#let gcc-fit-b(i, sizes, cw, ch, w, h, band, icons, header, body) = context {
  let ic = icons.map(g => box(text(font: "rpg-awesome", size: ${ICON_PT}pt, fill: black, top-edge: "bounds", bottom-edge: "bounds", g)))
  let iw = ic.map(b => measure(b).width).sum(default: 0pt)
  let ih = ic.map(b => measure(b).height).fold(0pt, calc.max)
  let hw = if ic.len() > 0 { w - iw - ${ICON_ROOM_MM}mm } else { w }
  let inner(s) = calc.max(measure(block(width: hw, header(s))).height, ih - ${ICON_BELOW_MM}mm)
  let chosen = sizes.last()
  let fits = false
  for s in sizes {
    if measure(block(width: w, body(s))).height <= h - inner(s) - 2 * ${BAND_BELOW_MM}mm {
      chosen = s
      fits = true
      break
    }
  }
  let hh = inner(chosen)
  [#metadata((i: i, size: chosen, fits: fits)) <${FIT_LABEL}>]
  box(width: cw, height: ch, {
    place(top + left, dx: -band.l, dy: -band.t, rect(width: cw + band.l + band.r, height: band.t + 4mm + hh + ${BAND_BELOW_MM}mm, fill: band.fill, stroke: none))
    place(top + left, rect(width: cw, height: ch, stroke: ${STROKE_PT}pt))
    place(top + left, dx: 4mm, dy: 4mm, block(width: hw, header(chosen)))
    place(top + left, dx: 4mm + w - iw, dy: 4mm, stack(dir: ltr, ..ic))
    place(top + left, dx: 4mm, dy: 4mm + hh + 2 * ${BAND_BELOW_MM}mm, block(width: w, height: h - hh - 2 * ${BAND_BELOW_MM}mm, clip: true, body(chosen)))
  })
}`;

/**
 * US-011 AC-2, AC-3, AC-5, AC-8: the Typst helpers of equal title bars.
 *
 * `gcc-eq(d)` measures, for the data `d` of one kind (`sizes`: the title sizes tried,
 * `w`: the text width, `items`: per card its title, its icons and its header builder,
 * `idx`: the card indexes), the kind's title size `t` (the largest size at which every
 * title fits on one line in its own header width: the text width, minus the icons and
 * 1.5 mm on a card with icons; else the smallest), its header height `H`
 * (the tallest header at the text size `t / 1.3`; a card with icons counts as at least its
 * lowest icon less 1 mm, US-011 D9), the wrapped cards and the widest
 * title's card. It reads the titles and headers only, never the fit (SCAR-021), and is
 * called with the same data by every card of the kind (Typst memoizes the call).
 *
 * `gcc-fit-e` is `gcc-fit` with the kind's header: a box `H` high, the rule
 * 2 pt under it, then the text fitted as in `gcc-fit`. `gcc-fit-be` is `gcc-fit-b`
 * (US-009) with the kind's header: the band from `H`, the header set at `t / 1.3`;
 * everything else as `gcc-fit-b` (kept as its own copy because `gcc-fit-b`'s text is
 * part of the golden sources of US-009 AC-1).
 */
const EQUAL_PRELUDE = `#let gcc-eq(d) = {
  let hws = d.items.map(it => {
    let ic = it.icons.map(g => box(text(font: "rpg-awesome", size: ${ICON_PT}pt, fill: black, top-edge: "bounds", bottom-edge: "bounds", g)))
    let iw = ic.map(b => measure(b).width).sum(default: 0pt)
    if ic.len() > 0 { d.w - iw - ${ICON_ROOM_MM}mm } else { d.w }
  })
  let ks = range(d.items.len())
  let wide(k, s) = measure(text(size: s * 1pt, weight: "bold", d.items.at(k).title)).width
  let t = d.sizes.last()
  for s in d.sizes {
    if ks.all(k => wide(k, s) <= hws.at(k)) {
      t = s
      break
    }
  }
  let wrapped = ks.filter(k => wide(k, t) > hws.at(k)).map(k => d.idx.at(k))
  let best = 0
  for k in ks {
    if wide(k, t) / hws.at(k) > wide(best, t) / hws.at(best) { best = k }
  }
  let ihs = d.items.map(it => it.icons.map(g => measure(box(text(font: "rpg-awesome", size: ${ICON_PT}pt, fill: black, top-edge: "bounds", bottom-edge: "bounds", g))).height).fold(0pt, calc.max))
  let own(k) = measure(block(width: hws.at(k), (d.items.at(k).header)(t / 1.3))).height
  let h = ks.map(k => if d.items.at(k).icons.len() > 0 { calc.max(own(k), ihs.at(k) - ${ICON_BELOW_MM}mm) } else { own(k) }).fold(0pt, calc.max)
  (t: t, h: h, wrapped: wrapped, widest: d.idx.at(best))
}
#let gcc-fit-e(i, sizes, w, h, header, body, d) = context {
  let e = gcc-eq(d)
  let build(s) = {
    set text(size: s * 1pt)
    set par(leading: 0.5em, spacing: 0.6em)
    block(width: w, height: e.h, below: ${GAP_PT}pt, header(e.t / 1.3))
    line(length: 100%, stroke: ${RULE_PT}pt)
    v(${GAP_PT}pt)
    body(s)
  }
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

/** US-011 AC-6: `gcc-fit-b` with the kind's header (see `EQUAL_PRELUDE`). */
const EQUAL_BAND_PRELUDE = `#let gcc-fit-be(i, sizes, cw, ch, w, h, band, icons, header, body, d) = context {
  let e = gcc-eq(d)
  let ic = icons.map(g => box(text(font: "rpg-awesome", size: ${ICON_PT}pt, fill: black, top-edge: "bounds", bottom-edge: "bounds", g)))
  let iw = ic.map(b => measure(b).width).sum(default: 0pt)
  let hw = if ic.len() > 0 { w - iw - ${ICON_ROOM_MM}mm } else { w }
  let hh = e.h
  let chosen = sizes.last()
  let fits = false
  for s in sizes {
    if measure(block(width: w, body(s))).height <= h - hh - 2 * ${BAND_BELOW_MM}mm {
      chosen = s
      fits = true
      break
    }
  }
  [#metadata((i: i, size: chosen, fits: fits)) <${FIT_LABEL}>]
  box(width: cw, height: ch, {
    place(top + left, dx: -band.l, dy: -band.t, rect(width: cw + band.l + band.r, height: band.t + 4mm + hh + ${BAND_BELOW_MM}mm, fill: band.fill, stroke: none))
    place(top + left, rect(width: cw, height: ch, stroke: ${STROKE_PT}pt))
    place(top + left, dx: 4mm, dy: 4mm, block(width: hw, header(e.t / 1.3)))
    place(top + left, dx: 4mm + w - iw, dy: 4mm, stack(dir: ltr, ..ic))
    place(top + left, dx: 4mm, dy: 4mm + hh + 2 * ${BAND_BELOW_MM}mm, block(width: w, height: h - hh - 2 * ${BAND_BELOW_MM}mm, clip: true, body(chosen)))
  })
}`;

/** US-011 AC-8: the Typst name of the data of a kind in equal mode. */
const equalName = (kind: 'skill' | 'spell'): string => `gcc-eqd-${kind}`;

/**
 * US-011 AC-2, AC-8: the data of `kind` for `gcc-eq` and the statement that writes the
 * kind's fact (one line, under the label of the fit facts). Every title goes through
 * `typstString` (rule 6); the icons are those the card draws (`drawable`).
 */
function equalDataCode(
  kind: 'skill' | 'spell',
  members: readonly {card: SkillCard; i: number}[],
  sizes: readonly number[],
  width: string,
): string[] {
  const items = members.map(({card}) => {
    const rows = drawable(card);
    const icons = rows.length > 0 ? iconsCode(rows) : '()';
    return `(title: ${typstString(card.name)}, icons: ${icons}, header: ${bandHeaderCode(card)})`;
  });
  return [
    `#let ${equalName(kind)} = (sizes: (${sizes.join(', ')},), w: ${width}, items: (${items.join(',\n')},), idx: (${members.map((m) => m.i).join(', ')},))`,
    `#context { let e = gcc-eq(${equalName(kind)}); [#metadata((titles: "${kind}", size: e.t, height: e.h.mm(), wrapped: e.wrapped, widest: e.widest)) <${FIT_LABEL}>] }`,
  ];
}

/** US-009 AC-5, AC-7: the branches that can be written: a valid colour and a known icon. */
const drawable = (card: SkillCard): SchemeRow[] =>
  (card.branches ?? []).filter(
    (b) => HEX_COLOUR.test(b.colour) && iconCodePoint(b.icon) !== undefined,
  );

/** US-009 AC-4: one colour, or the gradient across the band (equal steps, Typst's default space). */
function bandFillCode(rows: readonly SchemeRow[]): string {
  const colours = rows.map((r) => `rgb("${r.colour}")`);
  return colours.length === 1
    ? colours[0]!
    : `gradient.linear(${colours.join(', ')})`;
}

/** US-009 AC-5: the Typst array of the icons' glyphs, by code point from the table only. */
function iconsCode(rows: readonly SchemeRow[]): string {
  const glyphs = rows.map(
    (r) => `"\\u{${iconCodePoint(r.icon)!.toString(16)}}"`,
  );
  return `(${glyphs.join(', ')}${glyphs.length === 1 ? ',' : ''})`;
}

/** US-004 AC-9: the credit is set at this size, centred, at most two lines. */
const CREDIT_PT = 5;
/** US-004 AC-9: the room the credit needs inside the bottom band, in mm. */
const CREDIT_ROOM_MM = 5;
/** US-004 AC-9: a band lower than this has no room for the credit line, in mm. */
const MIN_BAND_MM = 3;
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
}`;

/**
 * US-004 AC-9, US-009 AC-10: `gcc-credit` sets a text in at most two centred lines,
 * cut with an ellipsis at a word; used for the creature credit and the icon credit.
 */
const CREDIT_PRELUDE = `#let gcc-credit(txt, w) = context {
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

/** US-012 AC-2, AC-7: the Typst name of the creature kind's data in equal mode. */
const EQUAL_CREATURE_DATA = 'gcc-eqd-creature';
/**
 * US-012 AC-3, AC-5: the kind's name size `t`, read inside a card's builder from the state
 * the prelude sets once (see `EQUAL_CREATURE_PRELUDE`).
 */
const EQUAL_CREATURE_T = 'gcc-eqc-size()';

/**
 * US-012 AC-2 to AC-7: the Typst helpers of equal title bands on creature cards.
 *
 * `gcc-eqc(d)` measures, for the creature kind's data `d` (`sizes`: the sizes tried,
 * `w`: the text width, `items`: per card its statblock data `sb` or, without one, its
 * `name`; `idx`: the card indexes), the kind's name size `t`: the largest size at which
 * every item is one line, else the smallest. One line is decided by measuring the item
 * as the card draws it, never by a copy of Obsidian2Typst's band rule (SCAR-017): a
 * statblock is drawn by `o2t-sb-box` with only its band (every other part in the
 * contract's empty form, US-004 AC-3; `look.sizes.band` set to the size) and compared
 * with the same band holding a two-letter name; a card without a statblock is its bold
 * title compared with a two-letter title. It also gives the tallest item at `t` (`h`),
 * the wrapped cards and the card of the widest name at `t` (in its band font). It reads
 * the names only, never the fit (SCAR-021). It is called once, before the cards: the
 * result goes into the state `gcc-eqc-t`, which each card reads with `gcc-eqc-size()`
 * (a call per card with the whole data made the compile grow with the square of the
 * cards and fail at 200 in typst.ts, #48). On the first layout pass the state is still
 * empty and the cards use `sizes.first()`; the next pass has `t`.
 */
const EQUAL_CREATURE_PRELUDE = `#let gcc-eqc-band(sb, band, s) = (band: band, look: (..sb.look, sizes: (..sb.look.sizes, band: s * 1pt)), boxes: none, track: none, attributes: none, traits: none, attacks: (), skills: none, tags: none)
#let gcc-eqc-draw(it, s, name) = if it.sb == none { text(size: s * 1pt, weight: "bold", name) } else { o2t-sb-box(gcc-eqc-band(it.sb, name, s)) }
#let gcc-eqc-name(it) = if it.sb == none { it.name } else { it.sb.band }
#let gcc-eqc-wide(it, s) = {
  let f = if it.sb == none { none } else { it.sb.look.fonts.at("band", default: none) }
  let b = if it.sb == none { text(size: s * 1pt, weight: "bold", it.name) } else { text(size: s * 1pt, it.sb.band) }
  measure(if f == none { b } else { text(font: f, b) }).width
}
#let gcc-eqc(d) = {
  let ks = range(d.items.len())
  let high(k, s) = measure(block(width: d.w, gcc-eqc-draw(d.items.at(k), s, gcc-eqc-name(d.items.at(k))))).height
  let one(k, s) = high(k, s) <= measure(block(width: d.w, gcc-eqc-draw(d.items.at(k), s, "Xy"))).height + 0.01pt
  let t = d.sizes.last()
  for s in d.sizes {
    if ks.all(k => one(k, s)) {
      t = s
      break
    }
  }
  let wrapped = ks.filter(k => not one(k, t)).map(k => d.idx.at(k))
  let best = 0
  for k in ks {
    if gcc-eqc-wide(d.items.at(k), t) > gcc-eqc-wide(d.items.at(best), t) { best = k }
  }
  let h = ks.map(k => high(k, t)).fold(0pt, calc.max)
  (t: t, h: h, wrapped: wrapped, widest: d.idx.at(best))
}
#let gcc-eqc-t = state("gcc-eqc-t", none)
#let gcc-eqc-size() = {
  let t = gcc-eqc-t.get()
  (if t == none { gcc-eqc-first } else { t }) * 1pt
}`;

/**
 * US-012 AC-2, AC-7: the creature kind's data for `gcc-eqc`, the first size (the cards'
 * size before the state is set) and the statement that measures once, sets the state
 * and writes the fact (one line, under the label of the fit facts). A card's statblock data
 * is the answer's text, written as it is (never edited); the name of a card without a
 * statblock goes through `typstString` (rule 6).
 */
function creatureEqualCode(
  members: readonly {card: CreatureCard; i: number}[],
  sizes: readonly number[],
  width: string,
): string[] {
  const items = members.map(({card}) =>
    card.statblock === null
      ? `(sb: none, name: ${typstString(card.name)})`
      : `(sb: ${card.statblock.data}, name: none)`,
  );
  return [
    `#let ${EQUAL_CREATURE_DATA} = (sizes: (${sizes.join(', ')},), w: ${width}, items: (${items.join(',\n')},), idx: (${members.map((m) => m.i).join(', ')},))`,
    `#let gcc-eqc-first = ${sizes[0]}`,
    `#context { let e = gcc-eqc(${EQUAL_CREATURE_DATA}); gcc-eqc-t.update(e.t); [#metadata((titles: "creature", size: e.t, height: e.h.mm(), wrapped: e.wrapped, widest: e.widest)) <${FIT_LABEL}>] }`,
  ];
}

/**
 * US-004 AC-4 to AC-6, AC-11: the content builder `(s, drop) => ...` of one
 * creature card, `s` in pt, `drop` the parts given up.
 *
 * With a statblock: its data (bound as `gcc-sb<i>`, never edited as text) with
 * each size of `look.sizes` multiplied by s / 7 and, when Skills is given up,
 * `skills: none`, drawn by `o2t-sb-box`; without one the card's title (a refused
 * answer, D2). Then the Instincts, Actions and Signs sections, each with its
 * heading as a small bold line; a section with no blocks is not drawn. US-012 AC-3,
 * AC-5: with `equal` the band's size is the kind's name size `t` (every other size
 * still s / 7) and the title of a card without a statblock is set at `t`, not 1.3 em.
 */
function creatureBuildCode(
  card: CreatureCard,
  i: number,
  headings: CreatureSettings,
  equal = false,
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
      equal
        ? `  let sizes = d0.look.sizes.pairs().map(p => (p.at(0), if p.at(0) == "band" { ${EQUAL_CREATURE_T} } else { p.at(1) * f })).to-dict()`
        : '  let sizes = d0.look.sizes.pairs().map(p => (p.at(0), p.at(1) * f)).to-dict()',
      '  let d = (..d0, look: (..d0.look, sizes: sizes), skills: if drop.contains("Skills") { none } else { d0.skills })',
      '  o2t-sb-box(d)',
      `  v(${GAP_PT}pt)`,
    );
  } else {
    parts.push(
      `  block(below: ${GAP_PT}pt, text(size: ${equal ? EQUAL_CREATURE_T : '1.3em'}, weight: "bold")[#${typstString(card.name)}])`,
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
 * US-004 AC-9, US-009 AC-10: the one line of a sheet's credits. The non-blank texts
 * (trimmed) in the order given, each but the last followed by a full stop when it
 * has none of `.!?`, joined by a space; none gives ''.
 */
function joinCredits(texts: readonly string[]): string {
  const used = texts.map((text) => text.trim()).filter((text) => text !== '');
  return used
    .map((text, i) =>
      i < used.length - 1 && !/[.!?]$/.test(text) ? `${text}.` : text,
    )
    .join(' ');
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
 * row and the bottom edge; a band under 3 mm has no room: the line is left
 * out and `creditOmitted` says how high the band was (the run warns). US-011: a kind
 * (skill, spell) whose `titles` setting is on and that has cards gets one title size
 * and one header height (`EQUAL_PRELUDE`), with its data and its fact written once;
 * with every kind off the source is the text of 0.4.0. US-012: with `titles.creature` on
 * and creature cards in the run, the creature kind gets one name size
 * (`EQUAL_CREATURE_PRELUDE`), its data and its fact written once; off, the source is the
 * text of 0.5.0. Refuses invalid sizes, 0 cards
 * and what the sheet refuses, with a message and no source.
 */
export function cardSheetTypst(
  cards: readonly (SkillCard | CreatureCard)[],
  sheet: SheetSettings,
  sizes: CardSizes,
  headings: CreatureSettings = DEFAULT_CREATURE,
  options: {
    iconCredit?: string;
    /**
     * US-011, US-012: the title settings of the kinds; absent or off: the cards of 0.4.0
     * (skill, spell) and 0.5.0 (creature).
     */
    titles?: {
      skill?: TitleSettings;
      spell?: TitleSettings;
      creature?: TitleSettings;
    };
  } = {},
):
  | {
      ok: true;
      source: string;
      files: {path: string; bytes: Uint8Array}[];
      /** US-004 AC-9: the band's height in mm when a credit had no room, else null. */
      creditOmitted: number | null;
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
  const banded = cards.some((c) => !isCreature(c) && drawable(c).length > 0);
  if (
    creatures.length > 0 ||
    (banded && (options.iconCredit ?? '').trim() !== '')
  )
    preludes.push(CREDIT_PRELUDE);
  if (banded) preludes.push(BAND_PRELUDE);
  // US-011 AC-1, AC-8: the kinds in equal mode that have cards; none: nothing is added.
  const kindOf = (card: SkillCard): 'skill' | 'spell' =>
    card.kind === 'spell' ? 'spell' : 'skill';
  const equalKinds = (['skill', 'spell'] as const).filter(
    (kind) =>
      options.titles?.[kind]?.equalTitles === true &&
      cards.some((c) => !isCreature(c) && kindOf(c) === kind),
  );
  if (equalKinds.length > 0) {
    preludes.push(EQUAL_PRELUDE);
    if (banded) preludes.push(EQUAL_BAND_PRELUDE);
    for (const kind of equalKinds) {
      const members = cards.flatMap((card, i) =>
        !isCreature(card) && kindOf(card) === kind ? [{card, i}] : [],
      );
      preludes.push(
        ...equalDataCode(
          kind,
          members,
          titleSizes(options.titles![kind]!, sizes.sizeStep),
          width,
        ),
      );
    }
  }
  const equalOf = (card: SkillCard): string | null =>
    (equalKinds as readonly string[]).includes(kindOf(card))
      ? equalName(kindOf(card))
      : null;
  let answerPrelude = false;
  for (const {card} of creatures) {
    const answer = card.statblock;
    if (answer === null) continue;
    if (!answerPrelude) {
      preludes.push(answer.prelude);
      answerPrelude = true;
    }
    for (const file of answer.files) {
      if (!files.has(file.path)) files.set(file.path, file.bytes);
    }
  }
  // US-012 AC-1, AC-7: the creature kind in equal mode, after the answer's prelude
  // (`o2t-sb-box`) it measures with; off or without creature cards nothing is added.
  const creatureEqual =
    options.titles?.creature?.equalTitles === true && creatures.length > 0;
  if (creatureEqual) {
    preludes.push(
      EQUAL_CREATURE_PRELUDE,
      ...creatureEqualCode(
        creatures,
        titleSizes(options.titles!.creature!, sizes.sizeStep),
        width,
      ),
    );
  }

  const bandTop =
    grid.originY + grid.rows * sheet.cardHeight + (grid.rows - 1) * sheet.gap;
  const bandHeight = 297 - bandTop;
  const creditTop = bandTop + Math.max(0.5, (bandHeight - CREDIT_ROOM_MM) / 2);

  const iconCredit = (options.iconCredit ?? '').trim();
  const iconPage = (index: number): boolean => {
    const card = cards[index];
    return card !== undefined && !isCreature(card) && drawable(card).length > 0;
  };
  const creditWanted =
    creatures.some(({card}) => (card.statblock?.credit ?? '').trim() !== '') ||
    (iconCredit !== '' && cards.some((_, i) => iconPage(i)));
  const result = sheetTypst(cards.length, sheet, {
    prelude: preludes.join('\n'),
    card: (placed) => {
      const card = cards[placed.index];
      if (card === undefined) return '';
      const at =
        `#place(top + left, dx: ${mm(placed.x + PADDING_MM)}, ` +
        `dy: ${mm(placed.y + PADDING_MM)}, `;
      if (isCreature(card)) {
        // The card's own data and parts are bound just before it, so the source
        // keeps the order of the cards (US-004 AC-7).
        const binds = [
          card.statblock === null
            ? ''
            : `#let ${sbName(placed.index)} = ${card.statblock.data}\n`,
          `#let gcc-parts${placed.index} = ${creaturePartsCode(card, placed.index)}\n`,
        ].join('');
        return (
          `${binds}${at}gcc-fit-c(${placed.index}, ${sizeList}, ${width}, ${height}, ` +
          `${creatureBuildCode(card, placed.index, headings, creatureEqual)}, gcc-parts${placed.index}))`
        );
      }
      const rows = drawable(card);
      if (rows.length > 0) {
        // US-009 AC-15: the bleed on a side is the whole bleed when no card is
        // there, half the gap at most when one is (two bands never overlap).
        const side = (neighbour: boolean): string =>
          mm(neighbour ? Math.min(sheet.bleed, sheet.gap / 2) : sheet.bleed);
        const left = side(placed.col > 0);
        const right = side(
          placed.col < grid.columns - 1 && placed.index + 1 < cards.length,
        );
        const above = side(placed.row > 0);
        const band = `(fill: ${bandFillCode(rows)}, l: ${left}, r: ${right}, t: ${above})`;
        // US-011 AC-6: a card of a kind in equal mode gets the kind's header.
        const equal = equalOf(card);
        return (
          `#place(top + left, dx: ${mm(placed.x)}, dy: ${mm(placed.y)}, ` +
          `gcc-fit-b${equal === null ? '' : 'e'}(${placed.index}, ${sizeList}, ${mm(sheet.cardWidth)}, ${mm(sheet.cardHeight)}, ` +
          `${width}, ${height}, ${band}, ${iconsCode(rows)}, ` +
          `${bandHeaderCode(card)}, ${bandBodyCode(card)}${equal === null ? '' : `, ${equal}`}))`
        );
      }
      const equal = equalOf(card);
      if (equal !== null) {
        // US-011 AC-3, AC-6: a plain card of a kind in equal mode.
        return `${at}gcc-fit-e(${placed.index}, ${sizeList}, ${width}, ${height}, ${bandHeaderCode(card)}, ${bandBodyCode(card)}, ${equal}))`;
      }
      return `${at}gcc-fit(${placed.index}, ${sizeList}, ${width}, ${height}, ${buildCode(card)}))`;
    },
    page: (_page, onPage) => {
      if (bandHeight < MIN_BAND_MM) return '';
      const creature = onPage
        .map((p) => cards[p.index])
        .flatMap((c) =>
          c !== undefined && isCreature(c) && c.statblock !== null
            ? [c.statblock.credit ?? '']
            : [],
        )
        .find((text) => text.trim() !== '');
      const icons = onPage.some((p) => iconPage(p.index)) ? iconCredit : '';
      const credit = joinCredits([creature ?? '', icons]);
      if (credit === '') return '';
      return (
        `#place(top + left, dx: ${mm(sheet.margin)}, dy: ${mm(creditTop)}, ` +
        `gcc-credit(${typstString(credit)}, ${mm(210 - 2 * sheet.margin)}))`
      );
    },
  });
  if (!result.ok) return result;
  return {
    ok: true,
    source: result.source,
    files: [...files].map(([path, bytes]) => ({path, bytes})),
    creditOmitted:
      creditWanted && bandHeight < MIN_BAND_MM
        ? Math.round(bandHeight * 10) / 10
        : null,
  };
}
