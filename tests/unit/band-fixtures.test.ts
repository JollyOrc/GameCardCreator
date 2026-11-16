// US-012 fixtures (SCAR-040, SCAR-023): the model "an answer for another heading is the Fen
// Hare answer with the band's text replaced" is replayed against the real answers of
// Obsidian2Typst 0.15.2 recorded for the story's names. Green from the start: it guards the
// fixture, not the code.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {FEN_HARE_ANSWER} from '../support/creature-fixtures';
import {
  FEN,
  FERRY,
  MARSH,
  REED,
  THORN,
  answerNamed,
  BAND_FONT,
  LILITH,
  MAMMOTH,
} from '../support/band-fixtures';

const recorded = JSON.parse(
  readFileSync(
    join(process.cwd(), 'tests/fixtures/us-012-answers.json'),
    'utf8',
  ),
) as {
  data: Record<string, string>;
  prelude: string;
  bandFont: {data: Record<string, string>};
};

describe('US-012 fixtures: the model of the answers equals the recording', () => {
  it('the recording holds the five names of the story', () => {
    expect(Object.keys(recorded.data)).toEqual([
      FEN,
      REED,
      MARSH,
      FERRY,
      THORN,
    ]);
  });
  it.each([FEN, REED, MARSH, FERRY, THORN])(
    '%s: the data of the model is the real data',
    (name) => {
      expect(answerNamed(name).data).toBe(recorded.data[name]);
    },
  );
  it('the prelude of the recording is the one of the fixture (only the band text differs between names)', () => {
    expect(recorded.prelude).toBe(FEN_HARE_ANSWER.prelude);
    expect(answerNamed(FERRY).prelude).toBe(FEN_HARE_ANSWER.prelude);
    expect(answerNamed(FERRY).files).toBe(FEN_HARE_ANSWER.files);
  });
  it('the model changes the band and nothing else (a name the fixture does not have)', () => {
    const d = answerNamed(MARSH).data;
    expect(d.startsWith('(band: "Marsh Lantern Wisp",')).toBe(true);
    expect(d).not.toContain('Fen Hare');
  });
});

describe('US-012 fixtures (#48): a preset with a band font', () => {
  it.each([MAMMOTH, LILITH])(
    '%s: the model with the band font is the real data',
    (name) => {
      expect(Object.keys(recorded.bandFont.data)).toEqual([MAMMOTH, LILITH]);
      expect(answerNamed(name, BAND_FONT).data).toBe(
        recorded.bandFont.data[name],
      );
    },
  );
});
