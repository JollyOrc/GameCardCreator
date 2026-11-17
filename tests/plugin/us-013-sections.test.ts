// US-013 AC-7, AC-9, AC-10: the settings tab in sections, as data and pure functions
// (SCAR-031): which section a field is in, which section opens first, reset per section,
// the feature rows of the title bars. Red until the code ticket (G2, 2026-11-17).
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {FIELDS, valueOf} from '../../src/plugin/settings/fields';
import {
  FEATURE_ROWS,
  firstProblemSection,
  initiallyOpen,
  RESETTABLE,
  resetSection,
  resetSectionDialog,
  SECTIONS,
  sectionOf,
} from '../../src/plugin/settings/sections';
import {memoryStore} from '../support/memory-store';

const READY: CardsSettings = {
  ...DEFAULT_CARDS,
  outputFolder: '/out',
  kindRules: [{folder: 'Skills', kind: 'skill'}],
};

describe('US-013 AC-7: the sections', () => {
  it('five sections in this order, each with a title and a description', () => {
    expect(SECTIONS.map((s) => [s.id, s.title])).toEqual([
      ['output', 'Output'],
      ['kinds', 'Which note is which card'],
      ['properties', 'Note properties'],
      ['layout', 'Page and text size'],
      ['titles', 'Titles'],
    ]);
    for (const s of SECTIONS) expect(s.description.length).toBeGreaterThan(0);
  });
  it('every field is in exactly one section: 1 output, 12 properties, 9 layout, 9 titles', () => {
    const count = (id: string) =>
      FIELDS.filter((f) => sectionOf(f.id) === id).length;
    expect(FIELDS).toHaveLength(31);
    expect([
      count('output'),
      count('kinds'),
      count('properties'),
      count('layout'),
      count('titles'),
    ]).toEqual([1, 0, 12, 9, 9]);
  });
  it.each([
    ['outputFolder', 'output'],
    ['skill.tagsProperty', 'properties'],
    ['creature.signsHeading', 'properties'],
    ['schemeNote', 'properties'],
    ['sheet.bleed', 'layout'],
    ['skill.sizeStep', 'layout'],
    ['skill.equalTitles', 'titles'],
    ['spell.titleSize', 'titles'],
    ['creature.minTitleSize', 'titles'],
  ])('%s is in %s', (id, section) => {
    expect(sectionOf(id)).toBe(section);
  });
});

describe('US-013 AC-7, AC-11: the first section with a problem', () => {
  it.each<[string, CardsSettings, string | null]>([
    ['nothing set (no folder, no rule): Output', DEFAULT_CARDS, 'output'],
    ['a folder, no rule: the kind rules', {...READY, kindRules: []}, 'kinds'],
    [
      'an empty tags property: Note properties',
      {...READY, skill: {...READY.skill, tagsProperty: ''}},
      'properties',
    ],
    [
      'a card width of 10 mm: Page and text size',
      {...READY, sheet: {...READY.sheet, cardWidth: 10}},
      'layout',
    ],
    [
      'a smallest title size above the title size: Titles',
      {...READY, skill: {...READY.skill, titleSize: 9, minTitleSize: 15}},
      'titles',
    ],
    ['ready: none', READY, null],
  ])('%s', (_name, settings, section) => {
    expect(firstProblemSection(settings, '/v')).toBe(section);
  });
  it('two problems: the earlier section in the order wins', () => {
    const s = {
      ...READY,
      outputFolder: '',
      sheet: {...READY.sheet, cardWidth: 10},
    };
    expect(firstProblemSection(s, '/v')).toBe('output');
  });
  it('the section that opens: the first with a problem, else Output', () => {
    expect(initiallyOpen({...READY, kindRules: []}, '/v')).toBe('kinds');
    expect(initiallyOpen(READY, '/v')).toBe('output');
    expect(initiallyOpen(DEFAULT_CARDS, '/v')).toBe('output');
  });
});

describe('US-013 AC-10: reset per section (SCAR-014)', () => {
  it('Note properties, Page and text size and Titles can be reset; Output and the kind rules never', () => {
    expect([...RESETTABLE]).toEqual(['properties', 'layout', 'titles']);
  });
  it('the question names the section; Reset and Cancel; focus on Cancel', () => {
    expect(resetSectionDialog('layout')).toEqual({
      message:
        'Reset "Page and text size" to its defaults?\nYour values in this section will be lost.',
      replaceLabel: 'Reset',
      cancelLabel: 'Cancel',
      focus: 'cancel',
    });
  });
  it('resetting Page and text size puts the card width back to 62 mm and leaves Titles, folder and rules', async () => {
    const store = memoryStore({
      outputFolder: '/out',
      kindRules: [{folder: 'Skills', kind: 'skill'}],
      sheet: {cardWidth: 70, cutMarks: false},
      skill: {
        maxSize: 9,
        titleSize: 13,
        equalTitles: true,
        tagsProperty: 'labels',
      },
      unknownKey: 1,
    });
    await resetSection({store}, 'layout');
    const file = store.file() as Record<string, Record<string, unknown>>;
    expect(file.sheet!.cardWidth).toBe(62);
    expect(file.sheet!.cutMarks).toBe(valueOf(DEFAULT_CARDS, 'sheet.cutMarks'));
    expect(file.skill!.maxSize).toBe(valueOf(DEFAULT_CARDS, 'skill.maxSize'));
    expect(file.skill!.titleSize).toBe(13);
    expect(file.skill!.equalTitles).toBe(true);
    expect(file.skill!.tagsProperty).toBe('labels');
    expect(file.outputFolder).toBe('/out');
    expect(file.kindRules).toEqual([{folder: 'Skills', kind: 'skill'}]);
    expect(file.unknownKey).toBe(1);
    expect(store.writes).toHaveLength(1);
  });
  it('resetting Titles puts the three kinds back and leaves the text sizes', async () => {
    const store = memoryStore({
      skill: {maxSize: 9, titleSize: 13, equalTitles: true},
      creature: {equalTitles: true, minTitleSize: 9},
    });
    await resetSection({store}, 'titles');
    const file = store.file() as Record<string, Record<string, unknown>>;
    expect(file.skill!.titleSize).toBe(
      valueOf(DEFAULT_CARDS, 'skill.titleSize'),
    );
    expect(file.skill!.equalTitles).toBe(false);
    expect(file.creature!.equalTitles).toBe(false);
    expect(file.creature!.minTitleSize).toBe(
      valueOf(DEFAULT_CARDS, 'creature.minTitleSize'),
    );
    expect(file.skill!.maxSize).toBe(9);
  });
  it('a section that cannot be reset is refused without writing', async () => {
    const store = memoryStore({outputFolder: '/out'});
    await expect(resetSection({store}, 'output')).rejects.toThrow();
    expect(store.writes).toHaveLength(0);
  });
});

describe('US-013 AC-9: the feature rows of the title bars', () => {
  it('one row per kind: its toggle, and the two sizes in the gear’s modal', () => {
    expect(FEATURE_ROWS.map((r) => [r.title, r.toggle, [...r.fields]])).toEqual(
      [
        [
          'Skill titles',
          'skill.equalTitles',
          ['skill.titleSize', 'skill.minTitleSize'],
        ],
        [
          'Spell titles',
          'spell.equalTitles',
          ['spell.titleSize', 'spell.minTitleSize'],
        ],
        [
          'Creature titles',
          'creature.equalTitles',
          ['creature.titleSize', 'creature.minTitleSize'],
        ],
      ],
    );
  });
  it('every id of a row is a field of the Titles section, and every Titles field is in a row', () => {
    const ids = FEATURE_ROWS.flatMap((r) => [r.toggle, ...r.fields]).sort();
    const titles = FIELDS.filter((f) => sectionOf(f.id) === 'titles')
      .map((f) => f.id)
      .sort();
    expect(ids).toEqual(titles);
  });
});
