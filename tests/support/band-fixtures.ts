// Invented fixtures for US-012 (SCAR-035): creature cards with the story's invented names and
// their statblock answers. An answer is the REAL answer of Obsidian2Typst 0.15.2 for that
// heading (recorded in tests/fixtures/us-012-answers.json, run 2026-11-16): measured to be the
// Fen Hare answer of US-004 with only the band's text changed, so `answerNamed` builds it that
// way, and the guard test `band-fixtures.test.ts` replays the recording against it (SCAR-040:
// the model is checked against the measurement, SCAR-023: nothing typed by hand).
import type {TitleSettings} from '../../src/core/card/titles';
import {readCreature, type CreatureCard} from '../../src/core/creature/read';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import type {Block} from '../../src/core/skill/read';
import {
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_ANSWER,
  words14,
  type StatblockOk,
} from './creature-fixtures';

/** The story's names (US-012 "The examples used below"). */
export const FEN = 'Fen Hare';
export const REED = 'Reedmother';
export const MARSH = 'Marsh Lantern Wisp';
export const FERRY = 'Old Grey Ferryman of the Sunken Weir';
export const THORN = 'Thornwhisperingbramblequeen';

/** Two names whose order of width flips between the card's font and the band font (#48). */
export const MAMMOTH = 'Mammoth Wombat';
export const LILITH = 'Lilith of Little Hill';
/** The band font of the recorded `bandFont` answers (a test font, tests/fixtures/fonts). */
export const BAND_FONT = 'DejaVu Sans Mono';

/**
 * The real answer for `name` (the Fen Hare answer with the band's text replaced); with
 * `bandFont`, also the look's fonts `(band: <font>)`, as a preset that names a band font
 * writes it (measured, recorded in `bandFont`).
 */
export function answerNamed(name: string, bandFont?: string): StatblockOk {
  const from = '(band: "Fen Hare",';
  if (!FEN_HARE_ANSWER.data.startsWith(from)) throw new Error('fixture moved');
  let data = `(band: ${JSON.stringify(name)},${FEN_HARE_ANSWER.data.slice(from.length)}`;
  if (bandFont !== undefined) {
    if (!data.includes('fonts: (:)')) throw new Error('fixture moved');
    data = data.replace(
      'fonts: (:)',
      `fonts: (band: ${JSON.stringify(bandFont)})`,
    );
  }
  return {...FEN_HARE_ANSWER, data};
}

const para = (text: string): Block => ({kind: 'paragraph', runs: [{text}]});
const section = (n: number): Block[] => (n === 0 ? [] : words14(n).map(para));

/**
 * A creature card named `name` (path `creatures/<name>.md`) with `words` invented words
 * spread over its three sections (Instincts, Actions, Signs: 35 %, 35 %, the rest), and its
 * real answer; `statblock: false` gives the card of a refused answer (US-004 D2).
 */
export function creatureNamed(
  name: string,
  words = 40,
  statblock = true,
  bandFont?: string,
): CreatureCard {
  const {card} = readCreature(
    `creatures/${name}.md`,
    EXAMPLE_CREATURE_NOTE,
    DEFAULT_CREATURE,
  );
  const a = Math.round(words * 0.35);
  return {
    ...card,
    path: `creatures/${name}.md`,
    name,
    instincts: section(a),
    actions: section(a),
    signs: section(words - 2 * a),
    statblock: statblock ? answerNamed(name, bandFont) : null,
  };
}

/** Run A of the story: Fen Hare, Reedmother, Marsh Lantern Wisp. */
export const runA = (): CreatureCard[] => [
  creatureNamed(FEN),
  creatureNamed(REED),
  creatureNamed(MARSH),
];
/** Run B: run A and Old Grey Ferryman of the Sunken Weir. */
export const runB = (): CreatureCard[] => [...runA(), creatureNamed(FERRY)];

/** The creature defaults of the story (D14) with the switch on. */
export const ON_C: TitleSettings = {
  equalTitles: true,
  titleSize: 11.5,
  minTitleSize: 7,
};
/** The creature defaults with the switch off. */
export const OFF_C: TitleSettings = {...ON_C, equalTitles: false};
