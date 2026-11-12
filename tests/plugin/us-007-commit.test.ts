// US-007 AC-3, AC-4, AC-5, AC-7, AC-8, AC-10, AC-11: committing one field: the
// value is parsed, checked by the existing checks (the screen adds no rule), and
// saved by loading the file, changing the one key and writing it back, keeping
// what the screen does not know. Expected messages are those of the checks of
// US-001 to US-005. Red until the tickets.
import {describe, expect, it} from 'vitest';
import {checkCardsSettings} from '../../src/core/run/settings';
import {readSettingsFile} from '../../src/plugin/settings-file';
import {commitSetting} from '../../src/plugin/settings/commit';
import {memoryStore} from '../support/memory-store';

const VAULT = '/v';
const deps = (store: ReturnType<typeof memoryStore>) => ({
  store,
  vaultRoot: () => VAULT,
});

/** The AC-8 table: the id, the label the message uses, examples that commit and values just outside. */
const NUMBERS: [string, string, string[], [string, string][]][] = [
  [
    'sheet.cardWidth',
    'Card width',
    ['30', '62', '100', '200'],
    [
      ['29', 'card width 29 is outside 30 to 200 mm'],
      ['201', 'card width 201 is outside 30 to 200 mm'],
    ],
  ],
  [
    'sheet.cardHeight',
    'Card height',
    ['30', '88', '120', '200'],
    [
      ['29', 'card height 29 is outside 30 to 200 mm'],
      ['201', 'card height 201 is outside 30 to 200 mm'],
    ],
  ],
  [
    'sheet.margin',
    'Margin',
    ['0', '10', '25', '50'],
    [
      ['-1', 'margin -1 is outside 0 to 50 mm'],
      ['51', 'margin 51 is outside 0 to 50 mm'],
    ],
  ],
  [
    'sheet.gap',
    'Gap',
    ['0', '2', '5', '10'],
    [
      ['-1', 'gap -1 is outside 0 to 10 mm'],
      ['11', 'gap 11 is outside 0 to 10 mm'],
    ],
  ],
  [
    'skill.maxSize',
    'Largest size',
    ['5.5', '7', '8.5', '10'],
    [
      ['5.4', 'The largest size 5.4 is outside 5.5 to 10 pt'],
      ['10.1', 'The largest size 10.1 is outside 5.5 to 10 pt'],
    ],
  ],
  [
    'skill.minSize',
    'Smallest size',
    ['4', '5.5', '6', '7'],
    [
      ['3.9', 'The smallest size 3.9 is outside 4 to 10 pt'],
      ['10.1', 'The smallest size 10.1 is outside 4 to 10 pt'],
    ],
  ],
  [
    'skill.sizeStep',
    'Size step',
    ['0.05', '0.25', '0.5', '1'],
    [
      ['0.04', 'The size step 0.04 is outside 0.05 to 1 pt'],
      ['1.1', 'The size step 1.1 is outside 0.05 to 1 pt'],
    ],
  ],
];
const dig = (file: unknown, id: string): unknown =>
  id
    .split('.')
    .reduce(
      (o, k) => (o as Record<string, unknown> | undefined)?.[k],
      file as unknown,
    );

describe.each(NUMBERS)('US-007 AC-8: %s', (id, label, valid, refused) => {
  it.each(valid)(
    '%s commits: saved as a number, one write, nothing else touched',
    async (text) => {
      const store = memoryStore({future: 1, sheet: {unknownKey: 'x'}});
      const r = await commitSetting(deps(store), id, text);
      expect(r).toEqual({ok: true, warnings: []});
      expect(store.writes).toHaveLength(1);
      expect(dig(store.file(), id)).toBe(Number(text));
      expect((store.file() as {future: number}).future).toBe(1);
      expect(
        (store.file() as {sheet: {unknownKey: string}}).sheet.unknownKey,
      ).toBe('x');
    },
  );
  it.each(refused)(
    "%s is refused with the check's message and nothing is written",
    async (text, message) => {
      const store = memoryStore({sheet: {margin: 12}});
      const r = await commitSetting(deps(store), id, text);
      expect(r).toEqual({ok: false, message});
      expect(store.writes).toEqual([]);
      expect(store.file()).toEqual({sheet: {margin: 12}});
    },
  );
  it.each(['abc', '', '   ', '1,5'])(
    '%j is no number: refused, nothing written',
    async (text) => {
      const store = memoryStore(null);
      const r = await commitSetting(deps(store), id, text);
      expect(r).toEqual({
        ok: false,
        message: `${label} "${text}" is not a number`,
      });
      expect(store.writes).toEqual([]);
    },
  );
});

describe('US-007 AC-8: the size rules between two fields, refused once with their own message', () => {
  it('a smallest size above the largest is refused once', async () => {
    const store = memoryStore(null);
    const r = await commitSetting(deps(store), 'skill.minSize', '10');
    expect(r).toEqual({
      ok: false,
      message: 'The largest size 7 is below the smallest size 10',
    });
    expect(store.writes).toEqual([]);
  });
  it('after the largest is raised the same smallest commits', async () => {
    const store = memoryStore(null);
    expect((await commitSetting(deps(store), 'skill.maxSize', '10')).ok).toBe(
      true,
    );
    expect((await commitSetting(deps(store), 'skill.minSize', '10')).ok).toBe(
      true,
    );
    expect(store.file()).toEqual({skill: {maxSize: 10, minSize: 10}});
  });
  it('a problem that is already in the file (a hand edit) does not block another field', async () => {
    const store = memoryStore({sheet: {gap: 99}});
    const r = await commitSetting(deps(store), 'sheet.margin', '12');
    expect(r.ok).toBe(true);
    expect(store.file()).toEqual({sheet: {gap: 99, margin: 12}});
  });
});

describe('US-007 AC-7: property names and labels', () => {
  it("an empty property name is refused with the check's message", async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'skill.tagsProperty', '  '),
    ).toEqual({
      ok: false,
      message: 'The tags property name is empty',
    });
    expect(await commitSetting(deps(store), 'spell.tagsProperty', '')).toEqual({
      ok: false,
      message: 'The tags property name of the spell card is empty',
    });
    expect(store.writes).toEqual([]);
  });
  it('two settings naming one property are refused, compared without case and spaces', async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'skill.kindProperty', ' TAGS '),
    ).toEqual({
      ok: false,
      message: 'The tags property and the kind property both name "TAGS"',
    });
    expect(store.writes).toEqual([]);
  });
  it('a name is saved without its surrounding spaces; a label may be anything, even empty', async () => {
    const store = memoryStore(null);
    expect(
      (await commitSetting(deps(store), 'skill.kindProperty', ' category ')).ok,
    ).toBe(true);
    expect((await commitSetting(deps(store), 'skill.kindLabel', '')).ok).toBe(
      true,
    );
    expect(
      (await commitSetting(deps(store), 'spell.tagsProperty', 'labels')).ok,
    ).toBe(true);
    expect(store.file()).toEqual({
      skill: {kindProperty: 'category', kindLabel: ''},
      spell: {tagsProperty: 'labels'},
    });
  });
});

describe('US-007 AC-3: the cut marks toggle', () => {
  it('commits a boolean both ways', async () => {
    const store = memoryStore(null);
    expect((await commitSetting(deps(store), 'sheet.cutMarks', false)).ok).toBe(
      true,
    );
    expect(dig(store.file(), 'sheet.cutMarks')).toBe(false);
    expect((await commitSetting(deps(store), 'sheet.cutMarks', true)).ok).toBe(
      true,
    );
    expect(dig(store.file(), 'sheet.cutMarks')).toBe(true);
  });
});

describe('US-007 AC-5 (SCAR-033): the output folder, from the text field or the dialog, goes through checkOutputFolder', () => {
  it('an absolute folder is saved in its normal form', async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'outputFolder', '/tmp//out/'),
    ).toEqual({
      ok: true,
      warnings: [],
    });
    expect(store.file()).toEqual({outputFolder: '/tmp/out'});
  });
  it('a folder inside the vault is allowed and gives no warning (D2)', async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'outputFolder', '/v/Cards'),
    ).toEqual({
      ok: true,
      warnings: [],
    });
    expect(store.file()).toEqual({outputFolder: '/v/Cards'});
  });
  it.each([
    ['relative', 'Output folder "relative" is not an absolute path'],
    ['~/cards', 'Output folder "~/cards" is not an absolute path'],
    ['/a/../b', 'Output folder "/a/../b" has a .. segment'],
    ['/', 'Output folder "/" is the filesystem root'],
    ['/v', 'Output folder "/v" is the vault\'s own folder'],
    ['/v/.obsidian/x', 'Output folder "/v/.obsidian/x" is inside .obsidian'],
    ['', 'Output folder is empty'],
  ])('%j is refused: %s; nothing is written', async (text, message) => {
    const store = memoryStore({outputFolder: '/keep'});
    const r = await commitSetting(deps(store), 'outputFolder', text);
    expect(r).toEqual({ok: false, message});
    expect(store.writes).toEqual([]);
    expect(store.file()).toEqual({outputFolder: '/keep'});
  });
});

describe('US-007 AC-10, AC-11: the file', () => {
  it('no file: the first commit writes just that key', async () => {
    const store = memoryStore(null);
    await commitSetting(deps(store), 'sheet.margin', '15');
    expect(store.file()).toEqual({sheet: {margin: 15}});
  });
  it('a file that is not an object is replaced by an object with the key', async () => {
    const store = memoryStore(5);
    expect((await commitSetting(deps(store), 'sheet.margin', '15')).ok).toBe(
      true,
    );
    expect(store.file()).toEqual({sheet: {margin: 15}});
  });
  it('a nested value of the wrong type is replaced; unknown keys at the top stay', async () => {
    const store = memoryStore({sheet: 'wide', future: [1, 2]});
    await commitSetting(deps(store), 'sheet.margin', '15');
    expect(store.file()).toEqual({sheet: {margin: 15}, future: [1, 2]});
  });
  it('the kind rules and the other pages are not touched by a commit', async () => {
    const start = {
      kindRules: [{folder: 'Skills', kind: 'skill'}],
      outputFolder: '/out',
      skill: {tagsProperty: 'labels'},
    };
    const store = memoryStore(start);
    await commitSetting(deps(store), 'sheet.gap', '2');
    expect(store.file()).toEqual({...start, sheet: {gap: 2}});
  });
  it('every commit loads the file at that moment: a hand edit between two commits is kept (SCAR-016)', async () => {
    const store = memoryStore({sheet: {margin: 12}});
    await commitSetting(deps(store), 'sheet.gap', '2');
    store.set({sheet: {margin: 12, gap: 2}, outputFolder: '/by-hand'});
    await commitSetting(deps(store), 'sheet.cardWidth', '70');
    expect(store.file()).toEqual({
      sheet: {margin: 12, gap: 2, cardWidth: 70},
      outputFolder: '/by-hand',
    });
    expect(store.reads).toBe(2);
  });
  it('the check sees the file as it is now: a hand edit changes what another field is checked against', async () => {
    const store = memoryStore({skill: {maxSize: 5.5, minSize: 5.5}});
    // smallest 4 is fine against the largest 5.5 from the file
    expect((await commitSetting(deps(store), 'skill.minSize', '4')).ok).toBe(
      true,
    );
    store.set({skill: {maxSize: 5.5, minSize: 4}});
    // largest 5.5 stays valid; raising the smallest above it is refused against the file
    expect(await commitSetting(deps(store), 'skill.minSize', '6')).toEqual({
      ok: false,
      message: 'The largest size 5.5 is below the smallest size 6',
    });
  });
  it('two commits started at once lose nothing: they run one after the other', async () => {
    const store = memoryStore({}, 20);
    const [a, b, c] = await Promise.all([
      commitSetting(deps(store), 'sheet.margin', '15'),
      commitSetting(deps(store), 'sheet.gap', '2'),
      commitSetting(deps(store), 'skill.maxSize', '8'),
    ]);
    expect([a.ok, b.ok, c.ok]).toEqual([true, true, true]);
    expect(store.file()).toEqual({
      sheet: {margin: 15, gap: 2},
      skill: {maxSize: 8},
    });
    expect(store.writes).toHaveLength(3);
  }, 10_000);
  it('a failing write is a message, not a throw; the next commit works', async () => {
    const store = memoryStore({});
    let fail = true;
    const original = store.write;
    store.write = async (data) => {
      if (fail) throw new Error('disk full');
      return original(data);
    };
    expect(await commitSetting(deps(store), 'sheet.gap', '2')).toEqual({
      ok: false,
      message: 'Could not save the settings: disk full',
    });
    fail = false;
    expect((await commitSetting(deps(store), 'sheet.gap', '2')).ok).toBe(true);
  });
  it('a failing read is a message too', async () => {
    const store = memoryStore({});
    store.read = async () => {
      throw new Error('cannot read');
    };
    expect(await commitSetting(deps(store), 'sheet.gap', '2')).toEqual({
      ok: false,
      message: 'Could not read the settings: cannot read',
    });
  });
  it('an unknown id is refused and nothing is read or written', async () => {
    const store = memoryStore({});
    expect(await commitSetting(deps(store), 'nope', '1')).toEqual({
      ok: false,
      message: 'Unknown setting nope',
    });
    expect(store.reads).toBe(0);
    expect(store.writes).toEqual([]);
  });
});

describe('US-007 (SCAR-019): non-default values committed one by one are what the run reads', () => {
  it('the whole file reads back through readSettingsFile with no notice and passes the checks', async () => {
    const store = memoryStore(null);
    const steps: [string, string | boolean][] = [
      ['outputFolder', '/out/cards'],
      ['sheet.cardWidth', '70'],
      ['sheet.margin', '15'],
      ['sheet.gap', '2'],
      ['sheet.cutMarks', false],
      ['skill.maxSize', '8.5'],
      ['skill.minSize', '6'],
      ['skill.sizeStep', '0.5'],
      ['skill.kindProperty', 'category'],
      ['skill.timingLabel', 'When'],
      ['spell.tagsProperty', 'labels'],
    ];
    for (const [id, value] of steps) {
      expect((await commitSetting(deps(store), id, value)).ok, id).toBe(true);
    }
    const read = readSettingsFile(store.file());
    expect(read.notice).toBeNull();
    expect(read.settings.outputFolder).toBe('/out/cards');
    expect(read.settings.sheet).toEqual({
      cardWidth: 70,
      cardHeight: 88,
      margin: 15,
      gap: 2,
      cutMarks: false,
    });
    expect(read.settings.skill).toMatchObject({
      maxSize: 8.5,
      minSize: 6,
      sizeStep: 0.5,
      kindProperty: 'category',
      timingLabel: 'When',
      tagsProperty: 'tags',
    });
    expect(read.settings.spell).toEqual({tagsProperty: 'labels'});
    // only the kind rules are missing now
    expect(checkCardsSettings(read.settings, VAULT)).toEqual([
      'Kind rules: add at least one rule (a folder and a kind)',
    ]);
  });
});
