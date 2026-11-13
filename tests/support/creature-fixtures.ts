// Invented fixtures for the creature card tests (SCAR-035). The answer is a
// COPY of the real output of Obsidian2Typst 0.15.1 (commit bf5f036, tag 0.15.1,
// `api.statblockTypst` for the note below under that plugin's own sample
// preset, run 2026-11-13 with tests/support/us-039-answer-cli.ts there); nothing in
// it is typed by hand (SCAR-023). The icon files are that run's stand-ins
// (69-byte SVG files). Not copied: the credit, which is `null` in that run.
import {inventedParagraphs} from './skill-fixtures';

/** The statblock answer of 0.15.1 (US-004 AC-3). */
export interface StatblockOk {
  ok: true;
  prelude: string;
  data: string;
  files: {path: string; bytes: Uint8Array}[];
  credit: string | null;
  warnings: {code: string; message: string}[];
}
export type StatblockAnswer =
  | StatblockOk
  | {ok: false; reason: 'no-settings' | 'no-statblock'; message: string};

export const FENCE = '```';

/** The example note of US-004 (docs/user-stories/US-004-creature-card.md). */
export const EXAMPLE_CREATURE_NOTE = [
  '---',
  'vigour: 11',
  'might: 4',
  'wits: 2',
  'speed: 5',
  'attacks:',
  '  - "Kick: 2d6"',
  '  - "**Bite**: 1d6"',
  'skills:',
  '  - Quick Step',
  'tags:',
  '  - beast',
  '---',
  'Fen hares are quick and shy.',
  '',
  '### Signs',
  'Flattened reeds in a ring.',
  '',
  '### Behaviour',
  '- flee at the first sound',
  '- never fight unless cornered',
  '',
  '### Actions',
  '- sprint: 12 squares over two Actions',
  '- kick, 2d6',
  '',
].join('\n');

/** The real answer for the example note (heading `Fen Hare`); no credit. */
export const FEN_HARE_ANSWER: StatblockOk = {
  ok: true,
  prelude:
    '#let o2t-box-size(w) = (w - 12 * 0.35mm - 2 * 1.25mm) / 15\n#let o2t-box-rows(count, s, lk) = {\n  let one = box(width: s, height: s, fill: lk.box-fill, stroke: 0.5pt + lk.frame.color)\n  let lines = range(calc.ceil(count / 15)).map(r => {\n    let n = calc.min(15, count - r * 15)\n    let row = ()\n    for i in range(n) {\n      row.push(one)\n      if i < n - 1 { row.push(h(if calc.rem(i + 1, 5) == 0 { 1.25mm } else { 0.35mm })) }\n    }\n    row.join()\n  })\n  stack(spacing: 0.35mm, ..lines)\n}\n#let o2t-icon(path, colour) = {\n  let lk = (icon: colour)\n  let svg = read(path).replace(regex("\\\\b(fill|stroke)=\\"([^\\"]*)\\""), m => if m.captures.at(1).trim() == "none" { m.text } else { m.captures.at(0) + "=\\"" + lk.icon + "\\"" })\n  image(bytes(svg.replace(regex("<svg\\\\b"), "<svg opacity=\\"0.75\\"", count: 1)), format: "svg", height: 100%)\n}\n#let o2t-cell(c, lk, height: 6mm) = box(\n  width: 100%, height: height, fill: lk.box-fill, stroke: 0.5pt + lk.frame.color, inset: 0.5mm,\n  align(center + horizon, if c.icon == none { none } else { o2t-icon(c.icon, lk.icon) }))\n#let o2t-sb-box(d) = {\n  let lk = d.look\n  let fonted(role, body) = {\n    let f = lk.fonts.at(role, default: none)\n    if f == none { body } else { text(font: f, body) }\n  }\n  let rule = line(length: 100%, stroke: lk.rules.width + lk.rules.color)\n  let pieces = ()\n  let parts = ("band",)\n  pieces.push(align(center, fonted("band", text(size: lk.sizes.band, fill: lk.accent)[◆ #d.band ◆])))\n  let count = 0\n  let rows = 0\n  if d.boxes != none {\n    parts.push("boxes")\n    count = d.boxes.count\n    rows = calc.ceil(count / 15)\n    let label-col = stack(spacing: 0.6mm,\n      text(size: lk.sizes.label, fill: lk.accent, d.boxes.label),\n      fonted("values", text(size: lk.sizes.value, fill: lk.accent, d.boxes.value)))\n    let field = layout(size => o2t-box-rows(count, o2t-box-size(size.width), lk))\n    pieces.push(grid(columns: (7.5mm, 1fr), column-gutter: 1mm, align: left + horizon, label-col, field))\n  }\n  if d.track != none {\n    parts.push("track")\n    let cells = d.track.cells.map(c => o2t-cell(c, lk))\n    let head = if d.track.label == none { () } else { (text(size: lk.sizes.label, fill: lk.accent, d.track.label),) }\n    pieces.push(stack(spacing: 0.6mm, ..head, grid(columns: (1fr,) * cells.len(), column-gutter: 0.8mm, ..cells)))\n  }\n  if d.attributes != none { parts.push("attributes"); pieces.push(align(center, fonted("values", text(size: lk.sizes.text, d.attributes)))) }\n  if d.traits != none { parts.push("traits"); pieces.push(align(center, fonted("values", text(size: lk.sizes.text, d.traits)))) }\n  if d.attacks.len() > 0 {\n    parts.push("attacks")\n    pieces.push(fonted("text", text(size: lk.sizes.attacks, stack(spacing: 0.8mm, ..d.attacks.map(a => grid(columns: (1fr, auto), column-gutter: 2mm,\n      par(hanging-indent: 1em, a.at(0)), if a.at(1) == none { [] } else { a.at(1) }))))))\n  }\n  if d.skills != none { parts.push("skills"); pieces.push(fonted("skills", text(size: lk.sizes.skills)[#emph[Skills:]#h(0.3em)#d.skills])) }\n  if d.tags != none { parts.push("tags"); pieces.push(align(center, fonted("tags", text(size: lk.sizes.text, fill: lk.accent, d.tags)))) }\n  [#metadata((band: d.band, boxes: count, rows: rows, cells: if d.track == none { () } else { d.track.cells.map(c => c.label) }, parts: parts)) <o2t-statblock>]\n  block(width: 100%, breakable: false, fill: lk.fill, stroke: lk.frame.width + lk.frame.color, inset: 2mm,\n    stack(spacing: 1.2mm, ..pieces.intersperse(rule)))\n}\n// US-034 AC-6 (decision 2): the column beside the statblock (100 % less the\n// statblock\'s 55% and the gutter) is under 60 % of the width.\n#let o2t-statblock(d, blocks: ()) = layout(size => {\n  let w = o2t-wrap(o2t-sb-box(d), blocks, size.width, narrow: d.look.at("narrow", default: none), band: d.band)\n  w.top\n  w.rest.join(parbreak())\n})',
  data: '(band: "Fen Hare", look: (fill: none, frame: (color: rgb("#000000"), width: 0.75pt), rules: (color: rgb("#000000"), width: 0.4pt), box-fill: rgb("#ffffff"), accent: rgb("#000000"), icon: "#000000", fonts: (:), sizes: (band: 11.5pt, value: 11pt, label: 5.5pt, text: 7pt, attacks: 7.5pt, skills: 9pt), narrow: (spacing: (min: 80%, max: 150%), tracking: (min: -0.01em, max: 0.03em))), boxes: (label: [VIGOUR], value: [11], count: 11), track: (label: [STATE], cells: ((label: "Fine", icon: "o2t-icons/1.svg"), (label: "Hurt", icon: "o2t-icons/2.svg"), (label: "Down", icon: "o2t-icons/3.svg"), (label: "Gone", icon: "o2t-icons/5.svg"))), attributes: [Might 4 · Wits 2 · Speed 5], traits: none, attacks: (([Kick], [2d6]), ([*Bite*], [1d6])), skills: [Quick Step, Keen Nose], tags: [Beast])',
  files: [
    {
      path: 'o2t-icons/1.svg',
      bytes: Uint8Array.from(
        atob(
          'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwhLS0gSWNvbnMvZmluZS5zdmcgLS0+PC9zdmc+',
        ),
        (c) => c.charCodeAt(0),
      ),
    },
    {
      path: 'o2t-icons/2.svg',
      bytes: Uint8Array.from(
        atob(
          'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwhLS0gSWNvbnMvaHVydC5zdmcgLS0+PC9zdmc+',
        ),
        (c) => c.charCodeAt(0),
      ),
    },
    {
      path: 'o2t-icons/3.svg',
      bytes: Uint8Array.from(
        atob(
          'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwhLS0gSWNvbnMvZG93bi5zdmcgLS0+PC9zdmc+',
        ),
        (c) => c.charCodeAt(0),
      ),
    },
    {
      path: 'o2t-icons/5.svg',
      bytes: Uint8Array.from(
        atob(
          'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwhLS0gSWNvbnMvZ29uZS5zdmcgLS0+PC9zdmc+',
        ),
        (c) => c.charCodeAt(0),
      ),
    },
  ],
  credit: null,
  warnings: [],
};

/**
 * A second REAL answer (same 0.15.1 run, same preset): the attacks of AC-6 and a
 * link, `Kick <x>` giving the forwarded warning. Only `data` and `warnings`
 * differ from the first answer; the prelude and the icon files are the same.
 */
export const LITERAL_ANSWER: StatblockOk = {
  ...FEN_HARE_ANSWER,
  data: '(band: "Fen Hare", look: (fill: none, frame: (color: rgb("#000000"), width: 0.75pt), rules: (color: rgb("#000000"), width: 0.4pt), box-fill: rgb("#ffffff"), accent: rgb("#000000"), icon: "#000000", fonts: (:), sizes: (band: 11.5pt, value: 11pt, label: 5.5pt, text: 7pt, attacks: 7.5pt, skills: 9pt), narrow: (spacing: (min: 80%, max: 150%), tracking: (min: -0.01em, max: 0.03em))), boxes: (label: [VIGOUR], value: [11], count: 11), track: (label: [STATE], cells: ((label: "Fine", icon: "o2t-icons/1.svg"), (label: "Hurt", icon: "o2t-icons/2.svg"), (label: "Down", icon: "o2t-icons/3.svg"), (label: "Gone", icon: "o2t-icons/5.svg"))), attributes: [Might 4 · Wits 2 · Speed 5], traits: none, attacks: (([Kick], [2d6]), ([*Bite*], [1d6]), ([a\\#b \\$c], [1d4]), ([\\= x], [1d4]), ([Kick ], [1d4]), ([Whisper], [1d4])), skills: [Quick Step, Keen Nose], tags: [Beast])',
  warnings: [
    {code: 'HTML_UNSUPPORTED', message: 'Unsupported HTML tag <x> dropped'},
  ],
};

/** The same answer with a credit text (the only edit; the text is invented). */
export const CREDIT_TEXT = 'Icons by Test Author, CC BY 3.0, game-icons.net';
export const FEN_HARE_WITH_CREDIT: StatblockOk = {
  ...FEN_HARE_ANSWER,
  credit: CREDIT_TEXT,
};

/** A refusal as the API gives it (no stat and no attack in the data). */
export const REFUSED: StatblockAnswer = {
  ok: false,
  reason: 'no-statblock',
  message: 'The note has no stat and no attack',
};

/** `n` invented words in paragraphs of 14 words (the measured shape, AC-5). */
export function words14(n: number): string[] {
  const all = inventedParagraphs(n).join(' ').split(' ');
  const out: string[] = [];
  for (let i = 0; i < all.length; i += 14)
    out.push(all.slice(i, i + 14).join(' ') + '.');
  return out;
}
