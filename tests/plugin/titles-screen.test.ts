// US-011 AC-10: the title fields on the settings screen: the two groups of the page
// `Page and text size`, the fields shown only while the switch of their kind is on,
// committed through the screen's one path with the messages of the settings checks
// (SCAR-016: the page is drawn again when the switch changes; SCAR-031: the decisions
// are tested functions, the tab only calls them, named by a text check). Red until
// the code ticket (G2, 2026-11-16).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {readSettingsFile} from '../../src/plugin/settings-file';
import {commitSetting} from '../../src/plugin/settings/commit';
import {
  FIELDS,
  groupsOf,
  isShown,
  redraws,
  valueOf,
} from '../../src/plugin/settings/fields';
import {resetPage} from '../../src/plugin/settings/reset';
import {memoryStore} from '../support/memory-store';

const deps = (store: ReturnType<typeof memoryStore>) => ({
  store,
  vaultRoot: () => '/v',
});
const def = (id: string) => {
  const d = FIELDS.find((f) => f.id === id);
  if (d === undefined) throw new Error(id);
  return d;
};
const withSwitch = (kind: 'skill' | 'spell', on: boolean): CardsSettings => ({
  ...DEFAULT_CARDS,
  [kind]: {...DEFAULT_CARDS[kind], equalTitles: on},
});

describe('US-011 AC-10: the groups and fields', () => {
  it('two groups after Text size: Skill titles and Spell titles, with a toggle and two numbers each', () => {
    const groups = groupsOf('layout');
    expect(groups.map((g) => g.group)).toEqual([
      'Sheet',
      'Text size',
      'Skill titles',
      'Spell titles',
    ]);
    for (const kind of ['skill', 'spell'] as const) {
      const g = groups.find((x) =>
        x.group.startsWith(kind === 'skill' ? 'Skill' : 'Spell'),
      )!;
      expect(g.fields.map((f) => [f.id, f.label, f.kind])).toEqual([
        [`${kind}.equalTitles`, 'Equal title bars', 'toggle'],
        [`${kind}.titleSize`, 'Title size', 'number'],
        [`${kind}.minTitleSize`, 'Smallest title size', 'number'],
      ]);
    }
  });
  it('valueOf shows the defaults and a non-default value', () => {
    expect(valueOf(DEFAULT_CARDS, 'skill.equalTitles')).toBe(false);
    expect(valueOf(DEFAULT_CARDS, 'spell.titleSize')).toBe(9.1);
    expect(valueOf(DEFAULT_CARDS, 'spell.minTitleSize')).toBe(7);
    const s = {
      ...DEFAULT_CARDS,
      skill: {...DEFAULT_CARDS.skill, titleSize: 13},
    };
    expect(valueOf(s, 'skill.titleSize')).toBe(13);
  });
});

describe('US-011 AC-10: the two numbers are shown only while the switch is on', () => {
  it.each(['skill', 'spell'] as const)(
    '%s: off hides them, on shows them; the toggle is always shown',
    (kind) => {
      for (const on of [false, true]) {
        const s = withSwitch(kind, on);
        expect(isShown(def(`${kind}.equalTitles`), s)).toBe(true);
        expect(isShown(def(`${kind}.titleSize`), s)).toBe(on);
        expect(isShown(def(`${kind}.minTitleSize`), s)).toBe(on);
      }
    },
  );
  it("one kind's switch does not show the other kind's fields", () => {
    const s = withSwitch('skill', true);
    expect(isShown(def('spell.titleSize'), s)).toBe(false);
  });
  it('every other field is always shown', () => {
    const others = FIELDS.filter(
      (f) => !/\.(titleSize|minTitleSize)$/.test(f.id),
    );
    expect(others).toHaveLength(24);
    for (const f of others) expect(isShown(f, DEFAULT_CARDS), f.id).toBe(true);
  });
  it('the page is drawn again after a commit of exactly the two switches', () => {
    expect(FIELDS.filter((f) => redraws(f.id)).map((f) => f.id)).toEqual([
      'skill.equalTitles',
      'spell.equalTitles',
    ]);
  });
});

describe('US-011 AC-10, AC-9: committed through the one path', () => {
  it('the switch is saved as a boolean in its kind', async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'spell.equalTitles', true),
    ).toMatchObject({ok: true});
    expect(store.file()).toEqual({spell: {equalTitles: true}});
    expect(readSettingsFile(store.file()).settings.spell.equalTitles).toBe(
      true,
    );
  });
  it('a title size is saved; a value outside the range is refused with the message of the check', async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'skill.titleSize', '13'),
    ).toMatchObject({ok: true});
    expect(await commitSetting(deps(store), 'skill.titleSize', '21')).toEqual({
      ok: false,
      message: 'The skill title size 21 is outside 6 to 20 pt',
    });
    expect(store.file()).toEqual({skill: {titleSize: 13}});
  });
  it('a smallest size above the title size is refused; text that is no number too', async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'skill.minTitleSize', '10'),
    ).toEqual({
      ok: false,
      message: 'The skill smallest title size 10 is above the title size 9.1',
    });
    expect(await commitSetting(deps(store), 'spell.titleSize', 'big')).toEqual({
      ok: false,
      message: 'Title size "big" is not a number',
    });
    expect(store.writes).toEqual([]);
  });
  it('a hidden value is kept in the file when the switch goes off', async () => {
    const store = memoryStore({skill: {equalTitles: true, titleSize: 13}});
    await commitSetting(deps(store), 'skill.equalTitles', false);
    expect(store.file()).toEqual({skill: {equalTitles: false, titleSize: 13}});
  });
  it('the page reset puts both kinds back to the defaults (with the confirmation of US-007 AC-9)', async () => {
    const store = memoryStore({
      skill: {equalTitles: true, titleSize: 13, minTitleSize: 8},
      spell: {equalTitles: true, titleSize: 12},
    });
    await resetPage({store}, 'layout');
    const s = readSettingsFile(store.file()).settings;
    expect([
      s.skill.equalTitles,
      s.skill.titleSize,
      s.skill.minTitleSize,
    ]).toEqual([false, 9.1, 7]);
    expect([
      s.spell.equalTitles,
      s.spell.titleSize,
      s.spell.minTitleSize,
    ]).toEqual([false, 9.1, 7]);
  });
});

describe('US-011 AC-10: the tab calls the decisions (text check, SCAR-031)', () => {
  const tab = readFileSync(
    join(process.cwd(), 'src/plugin/settings/tab.ts'),
    'utf8',
  );
  it('the fields of a group are drawn through isShown with the settings of now', () => {
    expect(tab).toMatch(
      /this\.drawFields\(\s*el,\s*settings,\s*page,\s*fields\.filter\(\(f\) => isShown\(f, settings\)\),?\s*\)/,
    );
  });
  it('a toggle redraws the page after its commit when redraws(id) says so', () => {
    expect(tab).toMatch(
      /this\.commit\(def\.id, on, error\)\.then\(\(\) => \{\s*if \(redraws\(def\.id\)\) void this\.draw\(\);/,
    );
  });
});
