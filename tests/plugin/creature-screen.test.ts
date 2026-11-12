// US-004 AC-13: the three section headings on the settings screen and the rule
// kind `creature` in the rule rows: committed through the screen's one path
// (US-007: the same commit and reset rules as the other text settings, an empty
// heading refused). Expected messages are those of the creature settings check.
// Red until the code ticket.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {readSettingsFile} from '../../src/plugin/settings-file';
import {commitSetting} from '../../src/plugin/settings/commit';
import {commitRule} from '../../src/plugin/settings/rules';
import {memoryStore} from '../support/memory-store';

const deps = (store: ReturnType<typeof memoryStore>) => ({
  store,
  vaultRoot: () => '/v',
});

describe('US-004 AC-13: the headings are committed like the other text settings', () => {
  it('a heading is saved; the others stay out of the file (the file keeps what it had)', async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'creature.actionsHeading', ' Moves '),
    ).toMatchObject({ok: true});
    expect(store.file()).toEqual({creature: {actionsHeading: 'Moves'}});
    expect(readSettingsFile(store.file()).settings.creature).toEqual({
      instinctsHeading: 'Behaviour',
      actionsHeading: 'Moves',
      signsHeading: 'Signs',
    });
  });
  it.each([
    [
      'creature.instinctsHeading',
      'The instincts heading of the creature card is empty',
    ],
    [
      'creature.actionsHeading',
      'The actions heading of the creature card is empty',
    ],
    [
      'creature.signsHeading',
      'The signs heading of the creature card is empty',
    ],
  ])(
    '%s: an empty heading is refused with the checks message, nothing written',
    async (id, message) => {
      for (const bad of ['', '   ']) {
        const store = memoryStore(null);
        expect(await commitSetting(deps(store), id, bad)).toEqual({
          ok: false,
          message,
        });
        expect(store.writes).toEqual([]);
      }
    },
  );
});

describe('US-004 AC-13: a rule of the kind creature', () => {
  it('is saved as set, and read back as a creature rule', async () => {
    const store = memoryStore(null);
    const r = await commitRule(
      {...deps(store), folderExists: () => true},
      {op: 'set', index: 0, rule: {folder: 'Creatures', kind: 'creature'}},
    );
    expect(r).toEqual({ok: true, warnings: []});
    expect(readSettingsFile(store.file()).settings.kindRules).toEqual([
      {folder: 'Creatures', kind: 'creature'},
    ]);
  });
});

describe('US-004 AC-13 (SCAR-017, SCAR-031): the tab offers the kind', () => {
  it('the kind choice of a rule row lists creature (text check of tab.ts, as US-007 wiring does)', () => {
    const tab = readFileSync(
      join(process.cwd(), 'src/plugin/settings/tab.ts'),
      'utf8',
    );
    expect(tab).toMatch(/creature\s*:\s*'creature'/);
  });
});
