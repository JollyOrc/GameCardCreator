// US-012 AC-9: the creature title fields on the settings screen: the third group of the page
// `Page and text size`, its numbers shown only while its switch is on, committed through the
// one path with the messages of the checks, reset with the page (SCAR-016, SCAR-031: the
// decisions are the tested functions of US-011, the tab is unchanged). Red until the code
// ticket (G2, 2026-11-16).
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
const creatureOn = (on: boolean): CardsSettings => ({
  ...DEFAULT_CARDS,
  creature: {...DEFAULT_CARDS.creature, equalTitles: on},
});

describe('US-012 AC-9: the group and its fields', () => {
  it('Creature titles is the last group of the layout page, with a toggle and two numbers', () => {
    const groups = groupsOf('layout');
    expect(groups.map((g) => g.group).at(-1)).toBe('Creature titles');
    expect(groups.at(-1)!.fields.map((f) => [f.id, f.label, f.kind])).toEqual([
      ['creature.equalTitles', 'Equal title bars', 'toggle'],
      ['creature.titleSize', 'Title size', 'number'],
      ['creature.minTitleSize', 'Smallest title size', 'number'],
    ]);
  });
  it('the creature headings stay on the properties page', () => {
    expect(def('creature.actionsHeading').page).toBe('properties');
    expect(def('creature.titleSize').page).toBe('layout');
  });
  it('valueOf shows the defaults (11.5, 7) and a non-default value', () => {
    expect(valueOf(DEFAULT_CARDS, 'creature.equalTitles')).toBe(false);
    expect(valueOf(DEFAULT_CARDS, 'creature.titleSize')).toBe(11.5);
    expect(valueOf(DEFAULT_CARDS, 'creature.minTitleSize')).toBe(7);
    const s = {
      ...DEFAULT_CARDS,
      creature: {...DEFAULT_CARDS.creature, titleSize: 14},
    };
    expect(valueOf(s, 'creature.titleSize')).toBe(14);
  });
});

describe('US-012 AC-9: the two numbers are shown only while the switch is on', () => {
  it('off hides them, on shows them; the toggle is always shown', () => {
    for (const on of [false, true]) {
      const s = creatureOn(on);
      expect(isShown(def('creature.equalTitles'), s)).toBe(true);
      expect(isShown(def('creature.titleSize'), s)).toBe(on);
      expect(isShown(def('creature.minTitleSize'), s)).toBe(on);
    }
  });
  it("the creature switch does not show the skill's or spell's numbers, nor theirs the creature's", () => {
    expect(isShown(def('skill.titleSize'), creatureOn(true))).toBe(false);
    const skillOn = {
      ...DEFAULT_CARDS,
      skill: {...DEFAULT_CARDS.skill, equalTitles: true},
    };
    expect(isShown(def('creature.titleSize'), skillOn)).toBe(false);
  });
  it('a commit of the creature switch redraws the page', () => {
    expect(redraws('creature.equalTitles')).toBe(true);
    expect(redraws('creature.titleSize')).toBe(false);
  });
});

describe('US-012 AC-9, AC-8: committed through the one path', () => {
  it('the switch is saved as a boolean in creature, beside the headings', async () => {
    const store = memoryStore({creature: {actionsHeading: 'Moves'}});
    expect(
      await commitSetting(deps(store), 'creature.equalTitles', true),
    ).toMatchObject({ok: true});
    expect(store.file()).toEqual({
      creature: {actionsHeading: 'Moves', equalTitles: true},
    });
  });
  it('a title size is saved; outside the range it is refused with the message naming the creature kind', async () => {
    const store = memoryStore(null);
    expect(
      await commitSetting(deps(store), 'creature.titleSize', '14'),
    ).toMatchObject({ok: true});
    expect(
      await commitSetting(deps(store), 'creature.titleSize', '21'),
    ).toEqual({
      ok: false,
      message: 'The creature title size 21 is outside 6 to 20 pt',
    });
    expect(
      await commitSetting(deps(store), 'creature.minTitleSize', '15'),
    ).toEqual({
      ok: false,
      message: 'The creature smallest title size 15 is above the title size 14',
    });
    expect(store.file()).toEqual({creature: {titleSize: 14}});
  });
  it('the layout reset puts the creature title keys back and keeps the headings', async () => {
    const store = memoryStore({
      creature: {
        actionsHeading: 'Moves',
        equalTitles: true,
        titleSize: 14,
        minTitleSize: 8,
      },
    });
    await resetPage({store}, 'layout');
    const s = readSettingsFile(store.file()).settings.creature;
    expect([
      s.equalTitles,
      s.titleSize,
      s.minTitleSize,
      s.actionsHeading,
    ]).toEqual([false, 11.5, 7, 'Moves']);
  });
  it('the properties reset puts the headings back and keeps the creature title keys', async () => {
    const store = memoryStore({
      creature: {actionsHeading: 'Moves', equalTitles: true, titleSize: 14},
    });
    await resetPage({store}, 'properties');
    const s = readSettingsFile(store.file()).settings.creature;
    expect([s.actionsHeading, s.equalTitles, s.titleSize]).toEqual([
      DEFAULT_CARDS.creature.actionsHeading,
      true,
      14,
    ]);
  });
});
