// US-004 AC-3, AC-11, AC-12, AC-7: the run with creature notes, with a stand-in
// compiler and a stand-in for Obsidian2Typst's API (the real answer is the
// fixture, SCAR-023). Expected values from the story. Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {runCards, type RunDeps} from '../../src/core/run/run';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {EXAMPLE_NOTE} from '../support/skill-fixtures';
import {EXAMPLE_SPELL_NOTE} from '../support/spell-fixtures';
import {
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_ANSWER,
  FEN_HARE_WITH_CREDIT,
  REFUSED,
  type StatblockAnswer,
} from '../support/creature-fixtures';

const settings: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [
    {folder: 'creatures', kind: 'creature'},
    {folder: 'skills', kind: 'skill'},
    {folder: 'spells', kind: 'spell'},
  ],
  outputFolder: '/tmp/out',
};
const NOTES: Record<string, string> = {
  'creatures/Fen Hare.md': EXAMPLE_CREATURE_NOTE,
  'creatures/Bare.md': '---\ntags: []\n---\n### Actions\nWait.\n',
  'skills/Reed Sweep.md': EXAMPLE_NOTE,
  'spells/Reed Whisper.md': EXAMPLE_SPELL_NOTE,
};
const FONTS = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];

type Extra = {files: {path: string; bytes: Uint8Array}[]; fonts: Uint8Array[]};

/** Dependencies with call logs; `answer` is what the stand-in API gives. */
function setup(
  over: {
    answer?: (
      data: Record<string, unknown>,
      heading?: string,
    ) => StatblockAnswer;
    api?: () => unknown;
    facts?: unknown[];
  } = {},
) {
  const log = {
    api: [] as {data: Record<string, unknown>; heading?: string}[],
    fonts: 0,
    apiReads: 0,
    compile: [] as {source: string; extra?: Extra}[],
  };
  const api = {
    version: 1,
    statblockTypst: async (
      data: Record<string, unknown>,
      o?: {heading?: string},
    ) => {
      log.api.push({data, heading: o?.heading});
      return (over.answer ?? (() => FEN_HARE_ANSWER))(data, o?.heading);
    },
    compileFonts: async () => {
      log.fonts++;
      return FONTS;
    },
  };
  const d: RunDeps = {
    read: async (p) => {
      const t = NOTES[p];
      if (t === undefined) throw new Error(`no such note ${p}`);
      return t;
    },
    statblockApi: () => {
      log.apiReads++;
      return over.api ? over.api() : api;
    },
    compile: async (source: string, extra?: Extra) => {
      log.compile.push({source, ...(extra === undefined ? {} : {extra})});
      return {pdf: new Uint8Array([37, 80, 68, 70]), facts: over.facts ?? []};
    },
  };
  return {d, log};
}

describe('US-004 AC-3: what the run asks of the API', () => {
  it('asks once per creature note with its properties and the file name as heading', async () => {
    const {d, log} = setup();
    await runCards(['creatures/Fen Hare.md'], settings, d);
    expect(log.api).toHaveLength(1);
    expect(log.api[0]!.heading).toBe('Fen Hare');
    expect(log.api[0]!.data).toEqual({
      vigour: 11,
      might: 4,
      wits: 2,
      speed: 5,
      attacks: ['Kick: 2d6', '**Bite**: 1d6'],
      skills: ['Quick Step'],
      tags: ['beast'],
    });
  });
  it('reads the API object at each run, never keeps it (SCAR-016)', async () => {
    const first = setup();
    const second = setup({answer: () => REFUSED});
    const {d} = first;
    await runCards(['creatures/Fen Hare.md'], settings, d);
    const r2 = await runCards(['creatures/Fen Hare.md'], settings, second.d);
    expect(first.log.apiReads).toBe(1);
    expect(second.log.apiReads).toBe(1);
    expect(second.log.api).toHaveLength(1);
    expect(r2.ok && r2.warnings.map((w) => w.code)).toContain(
      'CREATURE_STATBLOCK_REFUSED',
    );
    // the same deps run again: read again, not cached
    await runCards(['creatures/Fen Hare.md'], settings, d);
    expect(first.log.apiReads).toBe(2);
  });
});

describe("US-004 AC-12: the compile takes the answer's files and the fonts", () => {
  it('one compile with the files of the answer and the fonts of compileFonts', async () => {
    const {d, log} = setup();
    await runCards(['creatures/Fen Hare.md'], settings, d);
    expect(log.compile).toHaveLength(1);
    expect(log.compile[0]!.extra).toEqual({
      files: FEN_HARE_ANSWER.files,
      fonts: FONTS,
    });
    expect(log.fonts).toBe(1);
    expect(log.compile[0]!.source).toContain(FEN_HARE_ANSWER.data);
    expect(log.compile[0]!.source).toContain('#let o2t-box-size(');
  });
  it('the prelude is in the source once, whatever the number of creature cards', async () => {
    const {d, log} = setup();
    const notes = [
      'creatures/Fen Hare.md',
      'creatures/Fen Hare.md',
      'creatures/Fen Hare.md',
    ];
    await runCards(notes, settings, d);
    const src = log.compile[0]!.source;
    expect(src.split('#let o2t-box-size(').length - 1).toBe(1);
    expect(src.split(FEN_HARE_ANSWER.data).length - 1).toBe(3);
    // equal files of the three answers are one file each
    expect(log.compile[0]!.extra!.files.map((f) => f.path)).toEqual(
      FEN_HARE_ANSWER.files.map((f) => f.path),
    );
  });
  it('a run without a creature card never calls the API and compiles with no extra', async () => {
    const {d, log} = setup();
    const r = await runCards(
      ['skills/Reed Sweep.md', 'spells/Reed Whisper.md'],
      settings,
      d,
    );
    expect(r.ok).toBe(true);
    expect(log.api).toHaveLength(0);
    expect(log.fonts).toBe(0);
    expect(log.apiReads).toBe(0);
    expect(log.compile).toHaveLength(1);
    expect(log.compile[0]!.extra).toBeUndefined();
  });
  it('a creature card whose statblock was refused brings no file and no prelude', async () => {
    const {d, log} = setup({answer: () => REFUSED});
    await runCards(['creatures/Bare.md'], settings, d);
    expect(log.compile[0]!.source).not.toContain('o2t-sb-box');
    expect(log.compile[0]!.extra?.files ?? []).toEqual([]);
  });
});

describe('US-004 AC-12a (D6): one path, two different files', () => {
  it('the later card is made without its statblock, with CREATURE_ICON_CONFLICT; equal files stay one', async () => {
    const other = {
      ...FEN_HARE_ANSWER,
      files: FEN_HARE_ANSWER.files.map((f, i) =>
        i === 1 ? {...f, bytes: new Uint8Array([9, 9, 9])} : f,
      ),
    };
    let n = 0;
    const {d, log} = setup({
      answer: () => (n++ === 0 ? FEN_HARE_ANSWER : other),
      facts: [
        {i: 0, size: 7, fits: true, dropped: []},
        {i: 1, size: 7, fits: true, dropped: []},
      ],
    });
    const r = await runCards(
      ['creatures/Fen Hare.md', 'creatures/Bare.md'],
      settings,
      d,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cards).toBe(2);
    expect(r.warnings).toEqual([
      {
        code: 'CREATURE_ICON_CONFLICT',
        path: 'creatures/Bare.md',
        detail: 'o2t-icons/2.svg',
      },
    ]);
    const src = log.compile[0]!.source;
    expect(src.split(FEN_HARE_ANSWER.data).length - 1).toBe(1);
    expect(log.compile[0]!.extra!.files).toEqual(FEN_HARE_ANSWER.files);
  });
});

describe('US-004 AC-11: warnings and refusals', () => {
  it("the answer's warnings are forwarded unchanged, in note order, before the fit warnings (D1)", async () => {
    const answer = {
      ...FEN_HARE_ANSWER,
      warnings: [
        {
          code: 'STAT_SUM_MISMATCH',
          message: '"Fen Hare": the stats do not add up',
        },
      ],
    };
    const {d} = setup({
      answer: () => answer,
      facts: [{i: 0, size: 7, fits: true, dropped: ['Signs', 'Instincts']}],
    });
    const r = await runCards(['creatures/Fen Hare.md'], settings, d);
    expect(r.ok && r.warnings).toEqual([
      {
        code: 'STAT_SUM_MISMATCH',
        path: 'creatures/Fen Hare.md',
        detail: '"Fen Hare": the stats do not add up',
      },
      {
        code: 'CREATURE_PART_DROPPED',
        path: 'creatures/Fen Hare.md',
        detail: 'Instincts',
      },
    ]);
  });
  it('a refused statblock: the card is made without it, one warning, the run goes on (D2)', async () => {
    const {d} = setup({
      answer: (data) => (data.vigour === undefined ? REFUSED : FEN_HARE_ANSWER),
      facts: [
        {i: 0, size: 7, fits: true, dropped: []},
        {i: 1, size: 7, fits: true, dropped: []},
      ],
    });
    const r = await runCards(
      ['creatures/Bare.md', 'creatures/Fen Hare.md'],
      settings,
      d,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cards).toBe(2);
    expect(r.warnings).toEqual([
      {
        code: 'CREATURE_STATBLOCK_REFUSED',
        path: 'creatures/Bare.md',
        detail: 'The note has no stat and no attack',
      },
    ]);
  });
  it('an API that throws gives the same card without statblock, with the error as the message (rule 8)', async () => {
    const {d} = setup({
      answer: () => {
        throw new Error('preset unreadable');
      },
      facts: [{i: 0, size: 7, fits: true, dropped: []}],
    });
    const r = await runCards(['creatures/Fen Hare.md'], settings, d);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cards).toBe(1);
    expect(r.warnings).toEqual([
      {
        code: 'CREATURE_STATBLOCK_REFUSED',
        path: 'creatures/Fen Hare.md',
        detail: 'preset unreadable',
      },
    ]);
  });
  it('a missing or too old plugin refuses the creature cards once; the other cards are made', async () => {
    for (const api of [undefined, {version: 1}]) {
      const {d, log} = setup({
        api: () => api,
        facts: [
          {i: 0, size: 7, fits: true},
          {i: 1, size: 7, fits: true},
        ],
      });
      const r = await runCards(
        [
          'creatures/Fen Hare.md',
          'skills/Reed Sweep.md',
          'creatures/Bare.md',
          'spells/Reed Whisper.md',
        ],
        settings,
        d,
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.cards).toBe(2);
      const refusals = r.warnings.filter(
        (w) => w.code === 'CREATURE_API_UNAVAILABLE',
      );
      expect(refusals).toHaveLength(1);
      expect(refusals[0]!.path).toBe('');
      expect(refusals[0]!.detail).toContain('Obsidian2Typst');
      expect(refusals[0]!.detail).toContain('0.15.0');
      expect(log.api).toHaveLength(0);
      expect(log.compile[0]!.source).not.toContain('"Fen Hare"');
      expect(log.compile[0]!.extra).toBeUndefined();
    }
  });
  it("a run with only creature notes and no plugin has no card and says so (the sheet's own refusal)", async () => {
    const {d, log} = setup({api: () => undefined});
    const r = await runCards(['creatures/Fen Hare.md'], settings, d);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/no cards/i);
    expect(log.compile).toHaveLength(0);
    expect(r.warnings.map((w) => w.code)).toEqual(['CREATURE_API_UNAVAILABLE']);
  });
});

describe('US-004 AC-7, AC-9: a mixed deck and the credit', () => {
  it('creature, skill and spell cards in the given order; the report counts them', async () => {
    const {d, log} = setup({
      facts: [
        {i: 0, size: 7, fits: true, dropped: []},
        {i: 1, size: 7, fits: true},
        {i: 2, size: 7, fits: true},
      ],
    });
    const r = await runCards(
      [
        'skills/Reed Sweep.md',
        'creatures/Fen Hare.md',
        'spells/Reed Whisper.md',
      ],
      settings,
      d,
    );
    expect(r.ok && r.cards).toBe(3);
    const src = log.compile[0]!.source;
    const at = (s: string) => src.indexOf(s);
    expect(at('"Reed Sweep"')).toBeLessThan(at('"Fen Hare"'));
    expect(at('"Fen Hare"')).toBeLessThan(at('"Reed Whisper"'));
  });
  it('the credit of the answers is in the source once, even with several creature cards', async () => {
    const {d, log} = setup({answer: () => FEN_HARE_WITH_CREDIT});
    await runCards(
      ['creatures/Fen Hare.md', 'creatures/Fen Hare.md'],
      settings,
      d,
    );
    const src = log.compile[0]!.source;
    expect(src.split(FEN_HARE_WITH_CREDIT.credit!).length - 1).toBe(1);
  });
  it('no credit text: nothing of it in a run without creature cards', async () => {
    const {d, log} = setup({answer: () => FEN_HARE_WITH_CREDIT});
    await runCards(['skills/Reed Sweep.md'], settings, d);
    expect(log.compile[0]!.source).not.toContain(FEN_HARE_WITH_CREDIT.credit!);
  });
});
