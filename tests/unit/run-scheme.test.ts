// US-009 AC-1, AC-2, AC-6, AC-7, AC-10: the run with a scheme note. The stand-in
// compiler logs the Typst source; notes and scheme are the story's invented
// example (SCAR-035). Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {schemeCode} from '../../src/core/card/warning';
import {runCards, type RunDeps} from '../../src/core/run/run';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_WITH_CREDIT,
} from '../support/creature-fixtures';
import {
  EMBER_SPARK_NOTE,
  EXAMPLE_SCHEME,
  PARRY_NOTE,
  PLAIN_NOTE,
  SCHEME_PATH,
  SCORCH_HEX_NOTE,
  SPELLING_NOTE,
} from '../support/scheme-fixtures';

const settings: CardsSettings = {
  ...DEFAULT_CARDS,
  schemeNote: SCHEME_PATH,
  kindRules: [
    {folder: 'skills', kind: 'skill'},
    {folder: 'spells', kind: 'spell'},
    {folder: 'creatures', kind: 'creature'},
  ],
  outputFolder: '/tmp/out',
};
const NOTES: Record<string, string> = {
  [SCHEME_PATH]: EXAMPLE_SCHEME,
  'skills/Parry.md': PARRY_NOTE,
  'skills/Plain.md': PLAIN_NOTE,
  'skills/Spelling.md': SPELLING_NOTE,
  'spells/Ember Spark.md': EMBER_SPARK_NOTE,
  'spells/Scorch Hex.md': SCORCH_HEX_NOTE,
  'creatures/Fen Hare.md': EXAMPLE_CREATURE_NOTE.replace('beast', 'Pyromancy'),
};

function setup(
  over: {notes?: Record<string, string | Error>; api?: unknown} = {},
) {
  const notes = over.notes ?? NOTES;
  const log = {reads: [] as string[], compile: [] as string[]};
  const d: RunDeps = {
    read: async (p) => {
      log.reads.push(p);
      const t = notes[p];
      if (t === undefined) throw new Error(`no such note ${p}`);
      if (t instanceof Error) throw t;
      return t;
    },
    statblockApi: () =>
      over.api ?? {
        version: 1,
        statblockTypst: async () => FEN_HARE_WITH_CREDIT,
        compileFonts: async () => [],
      },
    compile: async (source) => {
      log.compile.push(source);
      return {pdf: new Uint8Array([37, 80, 68, 70]), facts: []};
    },
  };
  return {d, log};
}
const codes = (r: Awaited<ReturnType<typeof runCards>>) =>
  r.warnings.map((w) => w.code);
const run = (names: string[], s = settings, over = {}) => {
  const {d, log} = setup(over);
  return runCards(names, s, d).then((r) => ({r, log}));
};

describe('US-009 AC-1: when the scheme note is read', () => {
  it('once per run that has a skill or spell card, by the path of the setting', async () => {
    const {log} = await run(['skills/Parry.md', 'spells/Ember Spark.md']);
    expect(log.reads.filter((p) => p === SCHEME_PATH)).toHaveLength(1);
  });
  it('the path is used trimmed', async () => {
    const {log} = await run(['skills/Parry.md'], {
      ...settings,
      schemeNote: `  ${SCHEME_PATH} `,
    });
    expect(log.reads).toContain(SCHEME_PATH);
  });
  it('again at every run, never kept: a changed note is seen by the next run (SCAR-016)', async () => {
    const notes: Record<string, string | Error> = {...NOTES};
    const {d, log} = setup({notes});
    await runCards(['skills/Parry.md'], settings, d);
    notes[SCHEME_PATH] = EXAMPLE_SCHEME.replace('#F4D6B0', '#123456');
    await runCards(['skills/Parry.md'], settings, d);
    expect(log.reads.filter((p) => p === SCHEME_PATH)).toHaveLength(2);
    expect(log.compile[0]).toContain('#f4d6b0');
    expect(log.compile[1]).toContain('#123456');
    expect(log.compile[1]).not.toContain('#f4d6b0');
  });
  it('not read without a setting, and not for a run of creature cards only', async () => {
    const a = await run(['skills/Parry.md'], {...settings, schemeNote: ''});
    expect(a.log.reads).not.toContain(SCHEME_PATH);
    expect(codes(a.r)).toEqual([]);
    const b = await run(['creatures/Fen Hare.md']);
    expect(b.log.reads).not.toContain(SCHEME_PATH);
  });
  it('the scheme note is not a card and gives no card warning of its own', async () => {
    const {r} = await run(['skills/Parry.md']);
    expect(r.ok && r.cards).toBe(1);
    expect(r.warnings).toEqual([]);
  });
});

describe('US-009 AC-2, AC-7: the colours reach the source in their normal form', () => {
  it('a skill with one branch: its colour, lower case, once per card', async () => {
    const {log} = await run(['skills/Parry.md']);
    expect(log.compile[0]!.split('#f4d6b0').length - 1).toBeGreaterThanOrEqual(
      1,
    );
    expect(log.compile[0]).not.toContain('#F4D6B0');
  });
  it('a note whose tag is spelled differently from the row still has its branch', async () => {
    const {log, r} = await run(['skills/Spelling.md']);
    expect(log.compile[0]).toContain('#f4d6b0');
    expect(r.warnings).toEqual([]);
  });
  it("two branches: both colours, in the order of the note's tags", async () => {
    const {log} = await run(['spells/Scorch Hex.md']);
    const src = log.compile[0]!;
    expect(src.indexOf('#ffb4a2')).toBeGreaterThanOrEqual(0);
    expect(src.indexOf('#ffb4a2')).toBeLessThan(src.indexOf('#e4f0a8'));
  });
  it('a creature card with a tag of the scheme gets nothing of it (D11)', async () => {
    const {log, r} = await run(['creatures/Fen Hare.md']);
    expect(r.ok).toBe(true);
    expect(log.compile[0]).not.toContain('#ffb4a2');
    expect(codes(r)).not.toContain('SKILL_BRANCH_UNKNOWN');
  });
});

describe('US-009 AC-6: a note with no branch', () => {
  it("one warning with the note's tags, when the scheme has a valid row", async () => {
    const {r, log} = await run(['skills/Plain.md']);
    expect(r.ok && r.cards).toBe(1);
    expect(r.warnings).toEqual([
      {code: 'SKILL_BRANCH_UNKNOWN', path: 'skills/Plain.md', detail: 'Misc'},
    ]);
    expect(log.compile[0]).not.toContain('#f4d6b0');
  });
  it('a spell gets the spell code; a note without tags an empty detail', async () => {
    const {r} = await run(['spells/Bare.md'], settings, {
      notes: {...NOTES, 'spells/Bare.md': 'No properties here.\n'},
    });
    expect(r.warnings).toContainEqual({
      code: 'SPELL_BRANCH_UNKNOWN',
      path: 'spells/Bare.md',
      detail: '',
    });
  });
  it('several tags: comma separated, as written without the #', async () => {
    const {r} = await run(['skills/Two.md'], settings, {
      notes: {
        ...NOTES,
        'skills/Two.md': '---\ntags:\n  - "#Misc"\n  - CombatSkill\n---\nx\n',
      },
    });
    expect(r.warnings).toEqual([
      {
        code: 'SKILL_BRANCH_UNKNOWN',
        path: 'skills/Two.md',
        detail: 'Misc, CombatSkill',
      },
    ]);
  });
  it('no warning without a setting, nor when the scheme has no valid row', async () => {
    const a = await run(['skills/Plain.md'], {...settings, schemeNote: ''});
    expect(a.r.warnings).toEqual([]);
    const b = await run(['skills/Plain.md'], settings, {
      notes: {...NOTES, [SCHEME_PATH]: 'No table in this note.\n'},
    });
    expect(codes(b.r)).toEqual([schemeCode('TABLE_MISSING')]);
  });
  it("the warnings of a note follow the reader's own, in note order", async () => {
    const {r} = await run([
      'skills/Plain.md',
      'spells/Ember Spark.md',
      'skills/Parry.md',
    ]);
    expect(r.warnings.map((w) => w.path)).toEqual(['skills/Plain.md']);
  });
});

describe('US-009 AC-7: a bad scheme note never stops the run', () => {
  it('missing or unreadable: SCHEME_NOTE_UNREADABLE with the reason, plain headers, cards made', async () => {
    const {r, log} = await run(
      ['skills/Parry.md', 'spells/Ember Spark.md'],
      settings,
      {
        notes: {
          ...NOTES,
          [SCHEME_PATH]: new Error(
            'Cannot read: it is not a file of the vault',
          ),
        },
      },
    );
    expect(r.ok && r.cards).toBe(2);
    expect(r.warnings).toEqual([
      {
        code: schemeCode('NOTE_UNREADABLE'),
        path: SCHEME_PATH,
        detail: 'Cannot read: it is not a file of the vault',
      },
    ]);
    expect(log.compile[0]).not.toContain('#f4d6b0');
  });
  it("the scheme warnings come once, before the first skill or spell note's own", async () => {
    const text = EXAMPLE_SCHEME.replace('#CBD5E8', '#zzz');
    const {r} = await run(['skills/Plain.md', 'skills/Parry.md'], settings, {
      notes: {...NOTES, [SCHEME_PATH]: text},
    });
    expect(r.warnings.map((w) => w.code)).toEqual([
      schemeCode('ROW_INVALID'),
      'SKILL_BRANCH_UNKNOWN',
    ]);
    expect(r.warnings[0]!.path).toBe(SCHEME_PATH);
  });
  it('an unsupported scheme: its warning, no colour on any card, no branch warnings', async () => {
    const text = EXAMPLE_SCHEME.replace('schemeVersion: 1', 'schemeVersion: 2');
    const {r, log} = await run(
      ['skills/Parry.md', 'skills/Plain.md'],
      settings,
      {
        notes: {...NOTES, [SCHEME_PATH]: text},
      },
    );
    expect(r.warnings).toEqual([
      {
        code: schemeCode('UNSUPPORTED'),
        path: SCHEME_PATH,
        detail: 'schemeVersion: 2',
      },
    ]);
    expect(log.compile[0]).not.toContain('#f4d6b0');
  });
  it('the scheme note is only read, never written (no write dependency exists; the text is unchanged)', async () => {
    const notes: Record<string, string | Error> = {...NOTES};
    await run(['skills/Parry.md'], settings, {notes});
    expect(notes[SCHEME_PATH]).toBe(EXAMPLE_SCHEME);
  });
});

describe('US-009 AC-10: the credit text reaches the sheet', () => {
  const CREDIT = 'Icons: Game-icons.net (CC BY 3.0), via RPG Awesome';
  const count = (src: string, s: string) => src.split(s).length - 1;
  it("the note's credit, once, even with several icon cards", async () => {
    const {log} = await run([
      'skills/Parry.md',
      'spells/Ember Spark.md',
      'spells/Scorch Hex.md',
    ]);
    expect(count(log.compile[0]!, CREDIT)).toBe(1);
  });
  it('a note without a credit property: the default text', async () => {
    const text = EXAMPLE_SCHEME.replace(/^credit:.*\n/m, '');
    const {log} = await run(['skills/Parry.md'], settings, {
      notes: {...NOTES, [SCHEME_PATH]: text},
    });
    expect(count(log.compile[0]!, CREDIT)).toBe(1);
  });
  it('an empty credit: no line; no icon on the sheet: no line', async () => {
    const empty = EXAMPLE_SCHEME.replace(/^credit:.*$/m, 'credit: ""');
    const a = await run(['skills/Parry.md'], settings, {
      notes: {...NOTES, [SCHEME_PATH]: empty},
    });
    expect(a.log.compile[0]).not.toContain('Game-icons');
    const b = await run(['skills/Plain.md']);
    expect(b.log.compile[0]).not.toContain('Game-icons');
  });
  it('with a creature credit on the same sheet: the creature credit first, a sentence apart', async () => {
    const {log} = await run(['creatures/Fen Hare.md', 'skills/Parry.md']);
    const src = log.compile[0]!;
    const creature = FEN_HARE_WITH_CREDIT.credit!;
    const joined = `${creature}${/[.!?]$/.test(creature) ? '' : '.'} ${CREDIT}`;
    expect(count(src, joined)).toBe(1);
  });
});
