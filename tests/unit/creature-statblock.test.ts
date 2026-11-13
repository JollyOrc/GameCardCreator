// US-004 AC-3, AC-11: the contract with Obsidian2Typst's API (the reader's side)
// and the warnings made from an answer. The fixture is a copy of the real 0.15.1
// output (SCAR-023); the first block checks that it is what the story says it is.
// Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {
  checkStatblockApi,
  forwardWarnings,
  parseAnswer,
  mergeFiles,
  refusedWarning,
  unavailableWarning,
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
      'o2t-icons/5.svg',
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
    '%s is refused with a message naming the plugin and 0.15.1',
    (_n, value) => {
      const r = checkStatblockApi(value);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.message).toContain('Obsidian2Typst');
        expect(r.message).toContain('0.15.1');
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
    [
      'a file without bytes',
      {...FEN_HARE_ANSWER, files: [{path: 'o2t-icons/1.svg'}]},
    ],
    [
      'a file whose bytes are a plain array',
      {...FEN_HARE_ANSWER, files: [{path: 'o2t-icons/1.svg', bytes: [1]}]},
    ],
    [
      'a warning without a message',
      {...FEN_HARE_ANSWER, warnings: [{code: 'X'}]},
    ],
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

describe('US-004 AC-3, AC-12a: the other warnings and the files of several answers', () => {
  it('a missing plugin: one warning with an empty path and the message', () => {
    expect(unavailableWarning('No plugin')).toEqual({
      code: 'CREATURE_API_UNAVAILABLE',
      path: '',
      detail: 'No plugin',
    });
  });
  it('a duplicate of the same path with the same bytes is one file; nothing is a conflict', () => {
    const merged = new Map<string, Uint8Array>();
    expect(mergeFiles(merged, FEN_HARE_ANSWER, 'c/A.md')).toBeNull();
    expect(mergeFiles(merged, FEN_HARE_ANSWER, 'c/B.md')).toBeNull();
    expect([...merged.keys()]).toEqual([
      'o2t-icons/1.svg',
      'o2t-icons/2.svg',
      'o2t-icons/3.svg',
      'o2t-icons/5.svg',
    ]);
  });
  it('a path with other bytes is a conflict naming the file path; nothing of that answer is added', () => {
    const merged = new Map<string, Uint8Array>();
    mergeFiles(merged, FEN_HARE_ANSWER, 'c/A.md');
    const other: StatblockOk = {
      ...FEN_HARE_ANSWER,
      files: [
        {path: 'o2t-icons/9.svg', bytes: new Uint8Array([1])},
        {path: 'o2t-icons/2.svg', bytes: new Uint8Array([9, 9, 9])},
      ],
    };
    expect(mergeFiles(merged, other, 'c/B.md')).toEqual({
      code: 'CREATURE_ICON_CONFLICT',
      path: 'c/B.md',
      detail: 'o2t-icons/2.svg',
    });
    expect(merged.has('o2t-icons/9.svg')).toBe(false);
    expect(merged.size).toBe(4);
  });
  it('bytes that are a prefix of the known bytes are a conflict, not the same file', () => {
    const merged = new Map<string, Uint8Array>([
      ['o2t-icons/1.svg', new Uint8Array([1, 2, 3])],
    ]);
    const shorter: StatblockOk = {
      ...FEN_HARE_ANSWER,
      files: [{path: 'o2t-icons/1.svg', bytes: new Uint8Array([1, 2])}],
    };
    expect(mergeFiles(merged, shorter, 'c/B.md')?.code).toBe(
      'CREATURE_ICON_CONFLICT',
    );
    const longer: StatblockOk = {
      ...FEN_HARE_ANSWER,
      files: [{path: 'o2t-icons/1.svg', bytes: new Uint8Array([1, 2, 3, 4])}],
    };
    expect(mergeFiles(merged, longer, 'c/C.md')?.code).toBe(
      'CREATURE_ICON_CONFLICT',
    );
  });
  it('non-consecutive numbers (1, 2, 3, 5) and consecutive ones (1 to 4) merge alike', () => {
    const merged = new Map<string, Uint8Array>();
    const old: StatblockOk = {
      ...FEN_HARE_ANSWER,
      files: [1, 2, 3, 4].map((n) => ({
        path: `o2t-icons/${n}.svg`,
        bytes: new Uint8Array([n]),
      })),
    };
    expect(mergeFiles(merged, old, 'c/A.md')).toBeNull();
    expect(merged.size).toBe(4);
  });
  it('an answer with a refusal reason it does not know is not understood', () => {
    const r = parseAnswer({ok: false, reason: 'other', message: 'x'});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/malformed/);
  });
});
