// US-008 AC-4: the settings read from the plugin's data.json, until the
// settings screen of US-007 exists. Pure: Obsidian's `loadData` gives the raw
// value, nothing is ever written back (the author's file is never overwritten).
import {DEFAULT_CARDS, type CardsSettings} from '../core/run/settings';
import type {KindRule} from '../core/run/kinds';

/** What the file gave: the settings, and a notice when something was ignored. */
export interface SettingsFileResult {
  settings: CardsSettings;
  notice: string | null;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A kind rule of the right shape: a folder text and a known kind. */
const isKindRule = (value: unknown): value is KindRule =>
  isObject(value) &&
  typeof value.folder === 'string' &&
  (value.kind === 'skill' ||
    value.kind === 'spell' ||
    value.kind === 'creature');

/**
 * US-008 | AC-4: `defaults` with every key of `raw` that has the type of the
 * default's value taken over; a key with another type is ignored and named as
 * `<name>.<key>`; an unknown key is ignored silently; a `raw` that is not an
 * object is ignored and named as `<name>`. A fresh object: the defaults are
 * never changed.
 */
function mergeObject<T extends object>(
  name: string,
  defaults: Readonly<T>,
  raw: unknown,
  ignored: string[],
): T {
  const result = {...defaults} as Record<string, unknown>;
  if (raw === undefined) return result as T;
  if (!isObject(raw)) {
    ignored.push(name);
    return result as T;
  }
  for (const [key, fallback] of Object.entries(defaults)) {
    if (!(key in raw)) continue;
    if (typeof raw[key] === typeof fallback) result[key] = raw[key];
    else ignored.push(`${name}.${key}`);
  }
  return result as T;
}

/**
 * US-008 | AC-4: Reads the settings from the raw value of `data.json`.
 *
 * `null` (no file) gives the defaults and no notice; a value that is not an
 * object gives the defaults and `Settings file: not an object, using the
 * defaults`; a key of the wrong type is ignored and named, in the order
 * `outputFolder`, `sheet.*`, `skill.*`, `spell.*`, `creature.*`, `kindRules`. Values are
 * passed on as they are: refusing a value out of range is the check of
 * US-005. The result is a copy.
 */
export function readSettingsFile(raw: unknown): SettingsFileResult {
  const fresh = (): CardsSettings => ({
    kindRules: [],
    outputFolder: DEFAULT_CARDS.outputFolder,
    sheet: {...DEFAULT_CARDS.sheet},
    skill: {...DEFAULT_CARDS.skill},
    spell: {...DEFAULT_CARDS.spell},
    creature: {...DEFAULT_CARDS.creature},
  });
  if (raw === null) return {settings: fresh(), notice: null};
  if (!isObject(raw)) {
    return {
      settings: fresh(),
      notice: 'Settings file: not an object, using the defaults',
    };
  }
  const ignored: string[] = [];
  let outputFolder: string = DEFAULT_CARDS.outputFolder;
  if (typeof raw.outputFolder === 'string') outputFolder = raw.outputFolder;
  else if (raw.outputFolder !== undefined) ignored.push('outputFolder');
  const sheet = mergeObject('sheet', DEFAULT_CARDS.sheet, raw.sheet, ignored);
  const skill = mergeObject('skill', DEFAULT_CARDS.skill, raw.skill, ignored);
  const spell = mergeObject('spell', DEFAULT_CARDS.spell, raw.spell, ignored);
  const creature = mergeObject(
    'creature',
    DEFAULT_CARDS.creature,
    raw.creature,
    ignored,
  );
  let kindRules: KindRule[] = [];
  if (Array.isArray(raw.kindRules) && raw.kindRules.every(isKindRule)) {
    kindRules = raw.kindRules.map((rule) => ({...rule}));
  } else if (raw.kindRules !== undefined) ignored.push('kindRules');
  return {
    settings: {kindRules, outputFolder, sheet, skill, spell, creature},
    notice:
      ignored.length === 0
        ? null
        : `Settings file: ignored ${ignored.join(', ')}`,
  };
}
