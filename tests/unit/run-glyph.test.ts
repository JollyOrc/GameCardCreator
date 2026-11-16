// US-010 AC-1, AC-3, AC-4, AC-5, AC-6: the run with the glyph check. The stand-in
// compiler logs the Typst source and writes one fit fact per card; the stand-in
// coverage answers the faces of the compile's fonts as the worker would: the
// plugin's own faces (Latin here) and the faces of the extra fonts it is given
// (SCAR-023: a stand-in returns what the real one returns for the call the code
// makes). Invented notes (SCAR-035). Red until the code ticket (G2, 2026-11-17).
import {describe, expect, it} from 'vitest';
import {runCards, type RunDeps} from '../../src/core/run/run';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {
  EXAMPLE_CREATURE_NOTE,
  FEN_HARE_ANSWER,
} from '../support/creature-fixtures';
import {EXTRA, LATIN, type Face} from '../support/glyph-faces';
import {EXAMPLE_SCHEME, SCHEME_PATH} from '../support/scheme-fixtures';

const FONTS = [new Uint8Array([1, 2, 3])];
const settings: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [
    {folder: 'skills', kind: 'skill'},
    {folder: 'spells', kind: 'spell'},
    {folder: 'creatures', kind: 'creature'},
  ],
  outputFolder: '/tmp/out',
};
const NOTES: Record<string, string> = {
  'skills/Parry.md':
    '---\ntags:\n  - CombatSkill\n---\nYou turn a blow aside.\n',
  'skills/Chinese.md':
    '---\ntags:\n  - CombatSkill\n---\nA 漢 and a 😀 here.\n',
  'skills/Tick.md': 'A ✓ mark.\n',
  'spells/Plain.md': 'A spark.\n',
  'spells/Glyph.md': 'A spark 漢.\n',
  'creatures/Fen Hare.md': `${EXAMPLE_CREATURE_NOTE}`,
};

interface Log {
  reads: string[];
  compile: string[];
  coverage: (readonly Uint8Array[])[];
}
function setup(
  over: {
    notes?: Record<string, string>;
    coverage?: RunDeps['coverage'] | null;
    facts?: (n: number) => unknown[];
    api?: unknown;
  } = {},
) {
  const notes = over.notes ?? NOTES;
  const log: Log = {reads: [], compile: [], coverage: []};
  const faces = (fonts: readonly Uint8Array[]): Face[] => [
    LATIN,
    ...(fonts.length > 0 ? [EXTRA] : []),
  ];
  const d: RunDeps = {
    read: async (p) => {
      log.reads.push(p);
      const t = notes[p];
      if (t === undefined) throw new Error(`no such note ${p}`);
      return t;
    },
    statblockApi: () =>
      over.api ?? {
        version: 1,
        statblockTypst: async () => FEN_HARE_ANSWER,
        compileFonts: async () => FONTS,
      },
    compile: async (source) => {
      log.compile.push(source);
      const n = [...source.matchAll(/gcc-fit(?:-b|-c)?\((\d+), /g)].length;
      return {
        pdf: new Uint8Array([37, 80, 68, 70]),
        facts:
          over.facts?.(n) ??
          Array.from({length: n}, (_, i) => ({
            i,
            size: 7,
            fits: true,
            dropped: [],
          })),
      };
    },
    ...(over.coverage === null
      ? {}
      : {
          coverage:
            over.coverage ??
            (async (fonts: readonly Uint8Array[]) => {
              log.coverage.push(fonts);
              return faces(fonts);
            }),
        }),
  };
  return {d, log};
}
type Over = NonNullable<Parameters<typeof setup>[0]>;
const run = (names: string[], over: Over = {}, s = settings) => {
  const {d, log} = setup(over);
  return runCards(names, s, d).then((r) => ({r, log}));
};
const codes = (r: Awaited<ReturnType<typeof runCards>>) =>
  r.warnings.map((w) => w.code);

describe('US-010 AC-1: the warning of a note', () => {
  it("a note with 漢 and 😀: one warning, its kind's code, the path, the detail of the story", async () => {
    const {r} = await run(['skills/Chinese.md']);
    expect(r.ok && r.cards).toBe(1);
    expect(r.warnings).toEqual([
      {
        code: 'SKILL_GLYPH_MISSING',
        path: 'skills/Chinese.md',
        detail: '漢 U+6F22, 😀 U+1F600',
      },
    ]);
  });
  it('a spell gets the spell code; notes with every character drawn give nothing', async () => {
    const {r} = await run([
      'skills/Parry.md',
      'spells/Plain.md',
      'spells/Glyph.md',
    ]);
    expect(r.warnings).toEqual([
      {
        code: 'SPELL_GLYPH_MISSING',
        path: 'spells/Glyph.md',
        detail: '漢 U+6F22',
      },
    ]);
  });
  it('the PDF is made as before: the card is made and the source holds the character as written', async () => {
    const {r, log} = await run(['skills/Chinese.md']);
    expect(r.ok).toBe(true);
    expect(log.compile[0]).toContain('漢');
    expect(log.compile[0]).toContain('😀');
  });
});

describe('US-010 AC-3: a font of the compile that draws it', () => {
  it("a creature run: the answer's fonts are given to the coverage and a character they draw gives no warning", async () => {
    const {r, log} = await run(['creatures/Fen Hare.md', 'skills/Tick.md']);
    expect(log.coverage).toEqual([FONTS]);
    expect(codes(r)).not.toContain('SKILL_GLYPH_MISSING'); // ✓ is in the extra face
  });
  it('the same note on a run without such a font: the warning', async () => {
    const {r, log} = await run(['skills/Tick.md']);
    expect(log.coverage).toEqual([[]]);
    expect(r.warnings).toEqual([
      {code: 'SKILL_GLYPH_MISSING', path: 'skills/Tick.md', detail: '✓ U+2713'},
    ]);
  });
  it('the coverage is asked once per run, after the cards are made and before the compile', async () => {
    const {log} = await run(['skills/Parry.md', 'spells/Plain.md']);
    expect(log.coverage).toHaveLength(1);
    expect(log.compile).toHaveLength(1);
  });
});

describe('US-010 AC-4: the coverage cannot be read; no coverage dependency', () => {
  it('a rejected coverage: one GLYPH_CHECK_UNAVAILABLE with the reason, the run goes on', async () => {
    const {r} = await run(['skills/Chinese.md', 'skills/Parry.md'], {
      coverage: async () => {
        throw new Error('The font driver failed');
      },
    });
    expect(r.ok && r.cards).toBe(2);
    expect(r.warnings).toEqual([
      {
        code: 'GLYPH_CHECK_UNAVAILABLE',
        path: '',
        detail: 'The font driver failed',
      },
    ]);
  });
  it('no coverage dependency (a plugin of an older wiring, a test): no check and no warning', async () => {
    const {r} = await run(['skills/Chinese.md'], {coverage: null});
    expect(r.ok && r.cards).toBe(1);
    expect(r.warnings).toEqual([]);
  });
  it('a run with no skill, spell or creature card to check does not ask for the coverage', async () => {
    const {log} = await run(['other/Loose.md']);
    expect(log.coverage).toEqual([]);
  });
});

describe('US-010 AC-5: the place of the glyph warnings in the list', () => {
  it("after the notes' own warnings and before the fit warnings, in card order", async () => {
    const {r} = await run(
      [
        'other/Loose.md',
        'skills/Chinese.md',
        'spells/Glyph.md',
        'skills/Parry.md',
      ],
      {
        // the third card (Parry) does not fit: its fit warning comes last
        facts: (n) =>
          Array.from({length: n}, (_, i) => ({
            i,
            size: i === 2 ? 5.5 : 7,
            fits: i !== 2,
          })),
      },
    );
    expect(codes(r)).toEqual([
      'CARD_KIND_UNKNOWN',
      'SKILL_GLYPH_MISSING',
      'SPELL_GLYPH_MISSING',
      'SKILL_TEXT_OVERFLOW',
    ]);
  });
  it('the unavailable warning stands in the same place', async () => {
    const {r} = await run(['other/Loose.md', 'skills/Parry.md'], {
      coverage: async () => {
        throw new Error('nope');
      },
      facts: () => [{i: 0, size: 5.5, fits: false}],
    });
    expect(codes(r)).toEqual([
      'CARD_KIND_UNKNOWN',
      'GLYPH_CHECK_UNAVAILABLE',
      'SKILL_TEXT_OVERFLOW',
    ]);
  });
});

describe('US-010 AC-6 and D4: nothing else changes; the credit is not checked', () => {
  it('every character drawn: the same warnings and the same source as a run without the coverage', async () => {
    const a = await run(['skills/Parry.md', 'spells/Plain.md']);
    const b = await run(['skills/Parry.md', 'spells/Plain.md'], {
      coverage: null,
    });
    expect(a.r.warnings).toEqual(b.r.warnings);
    expect(a.log.compile[0]).toBe(b.log.compile[0]);
  });
  it('two runs give the same warnings in the same order (US-005 AC-11)', async () => {
    const names = ['skills/Chinese.md', 'spells/Glyph.md', 'skills/Tick.md'];
    const a = await run(names);
    const b = await run(names);
    expect(b.r.warnings).toEqual(a.r.warnings);
  });
  it("a character in the scheme note's credit is not checked (the credit is not a card's text)", async () => {
    const s: CardsSettings = {...settings, schemeNote: SCHEME_PATH};
    const notes = {
      ...NOTES,
      [SCHEME_PATH]: EXAMPLE_SCHEME.replace(
        /^credit:.*$/m,
        'credit: "Icons 漢 by 😀"',
      ),
      'skills/Parry.md':
        '---\ntags:\n  - Swordplay\n---\nYou turn a blow aside.\n',
    };
    const {r} = await run(['skills/Parry.md'], {notes}, s);
    expect(codes(r)).not.toContain('SKILL_GLYPH_MISSING');
    expect(codes(r)).not.toContain('SCHEME_GLYPH_MISSING');
  });
  it("a character in the statblock's properties is not checked (the statblock is the other plugin's text)", async () => {
    const notes = {
      ...NOTES,
      'creatures/Fen Hare.md': EXAMPLE_CREATURE_NOTE.replace(
        'Kick: 2d6',
        'Kick 漢: 2d6',
      ),
    };
    const {r} = await run(['creatures/Fen Hare.md'], {notes});
    expect(codes(r)).not.toContain('CREATURE_GLYPH_MISSING');
  });
});
