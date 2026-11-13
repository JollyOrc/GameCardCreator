// US-005 AC-4: the run from notes to PDF bytes and warnings, with a stand-in
// compiler (the real one is in the integration test). Expected values from the
// story. Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {runCards} from '../../src/core/run/run';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {EXAMPLE_NOTE} from '../support/skill-fixtures';
import {EXAMPLE_SPELL_NOTE} from '../support/spell-fixtures';

const settings: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [
    {folder: 'skills', kind: 'skill'},
    {folder: 'spells', kind: 'spell'},
  ],
  outputFolder: '/tmp/out',
};
const NOTES: Record<string, string> = {
  'skills/Reed Sweep.md': EXAMPLE_NOTE,
  'spells/Reed Whisper.md': EXAMPLE_SPELL_NOTE,
  'skills/Plain.md': '---\ntags: []\n---\nJust text.\n',
  'misc/Loose.md': 'Loose text.\n',
};
/** Dependencies with call logs; the compiler gives a PDF and a fact per card. */
function deps(
  over: Partial<{
    facts: (n: number) => unknown[];
    pdf: Uint8Array | null;
    message: string;
    read: (p: string) => Promise<string>;
  }> = {},
) {
  const log = {read: [] as string[], compile: [] as string[]};
  return {
    log,
    d: {
      read: async (p: string) => {
        log.read.push(p);
        if (over.read) return over.read(p);
        const t = NOTES[p];
        if (t === undefined) throw new Error(`no such note ${p}`);
        return t;
      },
      compile: async (source: string) => {
        log.compile.push(source);
        const n = (source.match(/gcc-fit\(\d+, /g) ?? []).length;
        return {
          pdf:
            over.pdf === undefined
              ? new Uint8Array([37, 80, 68, 70])
              : over.pdf,
          facts: over.facts
            ? over.facts(n)
            : Array.from({length: n}, (_, i) => ({i, size: 7, fits: true})),
          ...(over.message === undefined ? {} : {message: over.message}),
        };
      },
    },
  };
}

describe('US-005 AC-4: the run', () => {
  it('reads each note, makes the cards in order and returns the PDF, the counts and no warning', async () => {
    const {d, log} = deps();
    const r = await runCards(
      ['skills/Reed Sweep.md', 'spells/Reed Whisper.md', 'skills/Plain.md'],
      settings,
      d,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Array.from(r.pdf)).toEqual([37, 80, 68, 70]);
    expect(r.cards).toBe(3);
    expect(r.pages).toBe(1);
    expect(log.read).toEqual([
      'skills/Reed Sweep.md',
      'spells/Reed Whisper.md',
      'skills/Plain.md',
    ]);
    expect(log.compile).toHaveLength(1);
    const src = log.compile[0]!;
    expect(src.indexOf('"Reed Sweep"')).toBeGreaterThan(0);
    expect(src.indexOf('"Reed Whisper"')).toBeGreaterThan(
      src.indexOf('"Reed Sweep"'),
    );
    expect(src.indexOf('"Plain"')).toBeGreaterThan(
      src.indexOf('"Reed Whisper"'),
    );
    // the example skill has an image: the one warning the run has
    expect(r.warnings).toEqual([
      {
        code: 'SKILL_IMAGE_OMITTED',
        path: 'skills/Reed Sweep.md',
        detail: 'pics/reed.png',
      },
    ]);
  });
  it('ten cards give two pages', async () => {
    const {d} = deps();
    const notes = Array.from({length: 10}, () => 'skills/Plain.md');
    const r = await runCards(notes, settings, d);
    if (!r.ok) throw new Error(r.message);
    expect([r.cards, r.pages]).toEqual([10, 2]);
  });
  it('a note of unknown kind: no card, CARD_KIND_UNKNOWN with its path, the others are made', async () => {
    const {d, log} = deps();
    const r = await runCards(['misc/Loose.md', 'skills/Plain.md'], settings, d);
    if (!r.ok) throw new Error(r.message);
    expect(r.cards).toBe(1);
    expect(r.warnings).toEqual([
      {code: 'CARD_KIND_UNKNOWN', path: 'misc/Loose.md', detail: ''},
    ]);
    expect(log.read).toEqual(['skills/Plain.md']); // a note without a kind is not read
  });
  it('a note that cannot be read: no card, NOTE_UNREADABLE with the reason, the others are made (rule 8)', async () => {
    const {d} = deps();
    const r = await runCards(
      ['skills/Missing.md', 'skills/Plain.md'],
      settings,
      d,
    );
    if (!r.ok) throw new Error(r.message);
    expect(r.cards).toBe(1);
    expect(r.warnings).toEqual([
      {
        code: 'NOTE_UNREADABLE',
        path: 'skills/Missing.md',
        detail: 'no such note skills/Missing.md',
      },
    ]);
  });
  it('reading warnings come in card order, then the fit warnings', async () => {
    const {d} = deps({
      facts: () => [
        {i: 0, size: 5.5, fits: false},
        {i: 1, size: 7, fits: true},
      ],
    });
    const r = await runCards(
      ['skills/Reed Sweep.md', 'skills/Plain.md', 'misc/Loose.md'],
      settings,
      d,
    );
    if (!r.ok) throw new Error(r.message);
    expect(r.warnings.map((w) => w.code)).toEqual([
      'SKILL_IMAGE_OMITTED',
      'CARD_KIND_UNKNOWN',
      'SKILL_TEXT_OVERFLOW',
    ]);
    expect(r.warnings[2]).toEqual({
      code: 'SKILL_TEXT_OVERFLOW',
      path: 'skills/Reed Sweep.md',
      detail: '5.5 pt',
    });
  });
  it('a card without a fact: FIT_UNKNOWN by kind, never an assumed fit', async () => {
    const {d} = deps({facts: () => []});
    const r = await runCards(
      ['skills/Plain.md', 'spells/Reed Whisper.md'],
      settings,
      d,
    );
    if (!r.ok) throw new Error(r.message);
    expect(r.warnings.map((w) => w.code)).toEqual([
      'SKILL_FIT_UNKNOWN',
      'SPELL_FIT_UNKNOWN',
    ]);
  });
  it('the settings reach the reader and the sheet (non-default tags property, smaller sizes)', async () => {
    const {d, log} = deps();
    const custom: CardsSettings = {
      ...settings,
      skill: {
        ...settings.skill,
        tagsProperty: 'labels',
        maxSize: 6,
        minSize: 5,
        sizeStep: 0.5,
      },
    };
    NOTES['skills/Labelled.md'] =
      '---\nlabels:\n  - FieldCraft\ntags:\n  - Other\n---\nText.\n';
    const r = await runCards(['skills/Labelled.md'], custom, d);
    if (!r.ok) throw new Error(r.message);
    expect(log.compile[0]).toContain('"Field Craft"');
    expect(log.compile[0]).not.toContain('"Other"');
    expect(log.compile[0]).toContain('(6, 5.5, 5,)');
  });
  it('the spell settings reach the spell reader (a non-default tags property)', async () => {
    const {d, log} = deps();
    NOTES['spells/Labelled.md'] =
      '---\nlabels:\n  - Wizardry\ntags:\n  - Other\n---\nText.\n';
    const r = await runCards(
      ['spells/Labelled.md'],
      {...settings, spell: {tagsProperty: 'labels'}},
      d,
    );
    if (!r.ok) throw new Error(r.message);
    expect(log.compile[0]).toContain('"Wizardry"');
    expect(log.compile[0]).not.toContain('"Other"');
  });
  it('a compile message of several lines is cut at its first line', async () => {
    const {d} = deps({
      pdf: null,
      message:
        'main.typ:3:1: error: first\n  trace line two\n  trace line three',
    });
    const r = await runCards(['skills/Plain.md'], settings, d);
    expect(r).toMatchObject({ok: false, message: 'main.typ:3:1: error: first'});
  });
  it('no cards: no compile, no file, the message', async () => {
    const {d, log} = deps();
    const r = await runCards(['misc/Loose.md'], settings, d);
    expect(r).toMatchObject({
      ok: false,
      message: 'There are no cards to print',
    });
    expect(log.compile).toEqual([]);
    expect((await runCards([], settings, d)).ok).toBe(false);
  });
  it("a compile without a PDF: no file, the compiler's first diagnostic in the message", async () => {
    const {d} = deps({
      pdf: null,
      message: 'main.typ:3:1: error: unclosed delimiter',
    });
    const r = await runCards(['skills/Plain.md'], settings, d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('unclosed delimiter');
  });
  it('every settings problem is in the message, not only the first', async () => {
    const {d} = deps();
    const r = await runCards(
      ['skills/Plain.md'],
      {
        ...settings,
        sheet: {...settings.sheet, margin: 51},
        skill: {...settings.skill, kindProperty: 'timing'},
      },
      d,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/margin/i);
      expect(r.message).toMatch(/timing/);
    }
  });
  it('invalid card settings are refused before any read', async () => {
    const {d, log} = deps();
    const r = await runCards(
      ['skills/Plain.md'],
      {...settings, sheet: {...settings.sheet, margin: 51}},
      d,
    );
    expect(r.ok).toBe(false);
    expect(log.read).toEqual([]);
  });
});
