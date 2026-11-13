// US-005 settings table, AC-9 (a command refuses without an output folder or a
// kind rule, naming the setting): the settings of the run and their check.
// Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {DEFAULT_SKILL} from '../../src/core/skill/settings';
import {DEFAULT_SPELL} from '../../src/core/spell/settings';
import {DEFAULT_CREATURE} from '../../src/core/creature/settings';
import {
  DEFAULT_CARDS,
  checkCardsSettings,
  type CardsSettings,
} from '../../src/core/run/settings';

const ok: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [{folder: 'Skills', kind: 'skill'}],
  outputFolder: '/tmp/out',
};
const VAULT = '/v';

describe('US-005 settings table: the defaults', () => {
  it('no kind rules, no output folder, the card settings of US-001 to US-003', () => {
    expect(DEFAULT_CARDS).toEqual({
      kindRules: [],
      outputFolder: '',
      sheet: DEFAULT_SHEET,
      skill: DEFAULT_SKILL,
      spell: DEFAULT_SPELL,
      creature: DEFAULT_CREATURE,
    });
  });
});

describe('US-005 AC-9: checkCardsSettings', () => {
  it('valid settings give no message', () => {
    expect(checkCardsSettings(ok, VAULT)).toEqual([]);
  });
  it('the defaults are refused, naming the output folder and the kind rules', () => {
    const issues = checkCardsSettings(DEFAULT_CARDS, VAULT);
    expect(issues).toHaveLength(2);
    expect(issues.join(' ')).toMatch(/output folder/i);
    expect(issues.join(' ')).toMatch(/kind rules/i);
  });
  it('a refused output folder is named with its value', () => {
    const issues = checkCardsSettings({...ok, outputFolder: 'out'}, VAULT);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/output folder/i);
    expect(issues[0]).toContain('out');
  });
  it('an invalid kind rule is refused', () => {
    const issues = checkCardsSettings(
      {...ok, kindRules: [{folder: '', kind: 'skill'}]},
      VAULT,
    );
    expect(issues).toHaveLength(1);
  });
  it('the card settings are checked as well: a sheet margin of 51, a skill property clash, a spell tags name', () => {
    expect(
      checkCardsSettings(
        {...ok, sheet: {...DEFAULT_SHEET, margin: 51}},
        VAULT,
      ).join(' '),
    ).toMatch(/margin/i);
    expect(
      checkCardsSettings(
        {...ok, skill: {...DEFAULT_SKILL, kindProperty: 'timing'}},
        VAULT,
      ).join(' '),
    ).toMatch(/timing/);
    expect(
      checkCardsSettings({...ok, spell: {tagsProperty: ' '}}, VAULT).join(' '),
    ).toMatch(/tags/i);
  });
  it('sheet and skill sizes are each reported once (no double message)', () => {
    const issues = checkCardsSettings(
      {...ok, skill: {...DEFAULT_SKILL, maxSize: 4}},
      VAULT,
    );
    expect(issues).toHaveLength(1);
  });
});
