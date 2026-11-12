// US-004 AC-3, AC-11: the contract with Obsidian2Typst's API (the reader's side)
// and the warnings made from an answer. The fixture is a copy of the real 0.15.0
// output (SCAR-023); the first block checks that it is what the story says it is.
// Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {
  checkStatblockApi,
  forwardWarnings,
  parseAnswer,
  refusedWarning,
} from '../../src/core/creature/statblock';
import {
  FEN_HARE_ANSWER,
  REFUSED,
  type StatblockOk,
} from '../support/creature-fixtures';

describe('US-004 AC-3: the fixture is the real answer the story describes', () => {
  it('data starts as the story says; sizes and files as measured', () => {
    expect(
      FEN_HARE_ANSWER.data.startsWith(
        '(band: "Fen Hare", look: (fill: none, frame: (color: rgb("#000000"), width: 0.75pt), ',
      ),
    ).toBe(true);
    expect(FEN_HARE_ANSWER.data).toContain(
      'sizes: (band: 11.5pt, value: 11pt, label: 5.5pt, text: 7pt, attacks: 7.5pt, skills: 9pt)',
    );
    expect(FEN_HARE_ANSWER.files.map((f) => f.path)).toEqual([
      'o2t-icons/1.svg',
      'o2t-icons/2.svg',
      'o2t-icons/3.svg',
      'o2t-icons/4.svg',
    ]);
    expect(FEN_HARE_ANSWER.data).toContain(
      'attacks: (([Kick], [2d6]), ([*Bite*], [1d6]))',
    );
    expect(FEN_HARE_ANSWER.prelude).toContain('#let o2t-box-size(');
  });
});

describe('US-004 AC-3: the call (version, two functions, one message)', () => {
  const api = {
    version: 1,
    statblockTypst: async () => FEN_HARE_ANSWER,
    compileFonts: async () => [],
  };
  it('version 1 with both functions is accepted and handed back', () => {
    const r = checkStatblockApi(api);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.api).toBe(api);
  });
  it.each([
    ['no plugin (undefined)', undefined],
    ['null', null],
    ['an empty object', {}],
    ['version 2', {...api, version: 2}],
    [
      'no version',
      {statblockTypst: api.statblockTypst, compileFonts: api.compileFonts},
    ],
    ['no statblockTypst', {version: 1, compileFonts: api.compileFonts}],
    ['no compileFonts', {version: 1, statblockTypst: api.statblockTypst}],
    ['statblockTypst not a function', {...api, statblockTypst: 'x'}],
  ])(
    '%s is refused with a message naming the plugin and 0.15.0',
    (_n, value) => {
      const r = checkStatblockApi(value);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.message).toContain('Obsidian2Typst');
        expect(r.message).toContain('0.15.0');
      }
    },
  );
});

describe('US-004 AC-3: reading an answer', () => {
  it('the real answer is taken as it is', () => {
    expect(parseAnswer(FEN_HARE_ANSWER)).toEqual(FEN_HARE_ANSWER);
  });
  it('a refusal is taken as it is', () => {
    expect(parseAnswer(REFUSED)).toEqual(REFUSED);
  });
  it.each([
    ['null', null],
    ['a string', 'x'],
    ['an object without ok', {data: ''}],
    [
      'ok without data',
      {ok: true, prelude: '', files: [], credit: null, warnings: []},
    ],
    ['ok with files not a list', {...FEN_HARE_ANSWER, files: 'x'}],
    ['ok with a credit that is a number', {...FEN_HARE_ANSWER, credit: 3}],
  ])('%s is a refusal with a message, never a throw (rule 8)', (_n, raw) => {
    const r = parseAnswer(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/malformed|not understood/i);
  });
});

describe('US-004 AC-11: warnings made from an answer', () => {
  it("the answer's warnings are forwarded with their own code and message and the note path (D1)", () => {
    const answer: StatblockOk = {
      ...FEN_HARE_ANSWER,
      warnings: [
        {
          code: 'STAT_SUM_MISMATCH',
          message: '"Fen Hare": the stats add up to 11, vigour is 12',
        },
        {code: 'HTML_UNSUPPORTED', message: '"Fen Hare": a tag was dropped'},
      ],
    };
    expect(forwardWarnings(answer, 'creatures/Fen Hare.md')).toEqual([
      {
        code: 'STAT_SUM_MISMATCH',
        path: 'creatures/Fen Hare.md',
        detail: '"Fen Hare": the stats add up to 11, vigour is 12',
      },
      {
        code: 'HTML_UNSUPPORTED',
        path: 'creatures/Fen Hare.md',
        detail: '"Fen Hare": a tag was dropped',
      },
    ]);
  });
  it('an answer without warnings forwards none', () => {
    expect(forwardWarnings(FEN_HARE_ANSWER, 'creatures/Fen Hare.md')).toEqual(
      [],
    );
  });
  it('a refusal gives CREATURE_STATBLOCK_REFUSED with the note path and the API message (D2)', () => {
    if (REFUSED.ok) throw new Error('fixture');
    expect(refusedWarning('creatures/Bare.md', REFUSED.message)).toEqual({
      code: 'CREATURE_STATBLOCK_REFUSED',
      path: 'creatures/Bare.md',
      detail: 'The note has no stat and no attack',
    });
  });
});
