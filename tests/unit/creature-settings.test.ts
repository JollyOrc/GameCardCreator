// US-004 AC-13 and the settings table: the three section headings, the rule
// kind `creature`, and the settings file. Expected values from the story's
// defaults; every setting is also tested at a value other than the default
// (SCAR-019). Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {
  checkCreatureSettings,
  DEFAULT_CREATURE,
} from '../../src/core/creature/settings';
import {checkKindRules, kindOf} from '../../src/core/run/kinds';
import {DEFAULT_CARDS, checkCardSettings} from '../../src/core/run/settings';
import {readSettingsFile} from '../../src/plugin/settings-file';
import {FIELDS} from '../../src/plugin/settings/fields';

describe('US-004 settings: the defaults and their check', () => {
  it('the defaults are Behaviour, Actions, Signs (invented, SCAR-035)', () => {
    expect(DEFAULT_CREATURE).toEqual({
      instinctsHeading: 'Behaviour',
      actionsHeading: 'Actions',
      signsHeading: 'Signs',
    });
    expect(DEFAULT_CARDS.creature).toEqual(DEFAULT_CREATURE);
    expect(checkCreatureSettings(DEFAULT_CREATURE)).toEqual([]);
  });
  it.each([
    ['instinctsHeading', 'The instincts heading of the creature card is empty'],
    ['actionsHeading', 'The actions heading of the creature card is empty'],
    ['signsHeading', 'The signs heading of the creature card is empty'],
  ] as const)(
    'an empty or blank %s is refused with its own message',
    (key, message) => {
      for (const bad of ['', '   ']) {
        expect(
          checkCreatureSettings({...DEFAULT_CREATURE, [key]: bad}),
        ).toEqual([message]);
      }
    },
  );
  it('the card settings check includes the creature settings', () => {
    const bad = {
      ...DEFAULT_CARDS,
      kindRules: [{folder: 'Creatures', kind: 'creature' as const}],
      outputFolder: '/out',
      creature: {...DEFAULT_CREATURE, actionsHeading: ''},
    };
    expect(checkCardSettings(bad)).toEqual([
      'The actions heading of the creature card is empty',
    ]);
  });
});

describe('US-004 AC-13: the rule kind creature', () => {
  const rules = [
    {folder: 'Creatures', kind: 'creature' as const},
    {folder: 'Creatures/Magic', kind: 'spell' as const},
  ];
  it('is accepted by the rule check and gives the kind by folder', () => {
    expect(checkKindRules(rules)).toEqual([]);
    expect(kindOf('Creatures/Fen Hare.md', rules)).toBe('creature');
    expect(kindOf('Creatures/Magic/Hex.md', rules)).toBe('spell');
    expect(kindOf('Creatures Extra/A.md', rules)).toBeNull();
  });
  it('an unknown kind is still refused', () => {
    const issues = checkKindRules([
      {folder: 'A', kind: 'monster' as unknown as 'creature'},
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('monster');
    expect(issues[0]).toMatch(/creature/);
  });
});

describe('US-004 AC-13: the settings file', () => {
  it('no file: the creature defaults, no notice', () => {
    const r = readSettingsFile({});
    expect(r.settings.creature).toEqual(DEFAULT_CREATURE);
    expect(r.notice).toBeNull();
  });
  it('one heading changes, the others stay (key by key)', () => {
    const r = readSettingsFile({creature: {actionsHeading: 'Moves'}});
    expect(r.notice).toBeNull();
    expect(r.settings.creature).toEqual({
      ...DEFAULT_CREATURE,
      actionsHeading: 'Moves',
    });
  });
  it('a rule of the kind creature is kept, not dropped as unknown', () => {
    const r = readSettingsFile({
      kindRules: [{folder: 'Creatures', kind: 'creature'}],
    });
    expect(r.settings.kindRules).toEqual([
      {folder: 'Creatures', kind: 'creature'},
    ]);
    expect(r.notice).toBeNull();
  });
});

describe('US-004 AC-13: the fields on the settings screen', () => {
  it('three text fields under Creature notes with their labels, on the properties page', () => {
    const f = FIELDS.filter((x) => x.id.startsWith('creature.'));
    expect(f.map((x) => [x.id, x.label, x.group, x.page, x.kind])).toEqual([
      [
        'creature.instinctsHeading',
        'Instincts heading',
        'Creature notes',
        'properties',
        'text',
      ],
      [
        'creature.actionsHeading',
        'Actions heading',
        'Creature notes',
        'properties',
        'text',
      ],
      [
        'creature.signsHeading',
        'Signs heading',
        'Creature notes',
        'properties',
        'text',
      ],
    ]);
  });
});
