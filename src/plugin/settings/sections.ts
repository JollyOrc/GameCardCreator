// US-013 AC-7, AC-9, AC-10 (SCAR-014, SCAR-031, SCAR-038): the settings tab's sections as
// data and pure functions: which section a field is in, which section opens first, reset
// per section and the feature rows of the title bars. No Obsidian import; the tab calls
// these, and the runner names a refusal's section with `firstProblemSection`.
import type {ReplaceDialog} from '../../core/run/confirm';
import {checkKindRules} from '../../core/run/kinds';
import {checkOutputFolder} from '../../core/run/output';
import {
  checkCardSettings,
  DEFAULT_CARDS,
  type CardsSettings,
} from '../../core/run/settings';
import type {SettingsStore} from './commit';
import {setRaw} from './commit';
import {FIELDS, valueOf} from './fields';
import {resetFields} from './reset';

/** US-013 AC-7: the sections of the tab. */
export type SectionId = 'output' | 'kinds' | 'properties' | 'layout' | 'titles';

/** US-013 AC-7: the sections in the order of the tab, with their headings. */
export const SECTIONS: readonly {
  id: SectionId;
  title: string;
  description: string;
}[] = [
  {
    id: 'output',
    title: 'Output',
    description: 'The folder the PDF and its warnings file are written to.',
  },
  {
    id: 'kinds',
    title: 'Which note is which card',
    description: 'Folders whose notes become skill, spell or creature cards.',
  },
  {
    id: 'properties',
    title: 'Note properties',
    description: 'The property names, labels and headings the cards read.',
  },
  {
    id: 'layout',
    title: 'Page and text size',
    description: 'The sheet, the card size and the text sizes.',
  },
  {
    id: 'titles',
    title: 'Titles',
    description: 'One title size for all cards of a kind.',
  },
];

/** US-013 AC-9: the field groups shown as feature rows in *Titles*. */
const TITLE_GROUPS = ['Skill titles', 'Spell titles', 'Creature titles'];

/**
 * US-013 | AC-7: The section of the field `id`, from its page and group: the main page's
 * field is *Output*, the properties page *Note properties*, the title groups *Titles*,
 * the rest of the layout page *Page and text size*. Throws for an unknown id.
 */
export function sectionOf(id: string): SectionId {
  const def = FIELDS.find((f) => f.id === id);
  if (def === undefined) throw new Error(`Unknown setting ${id}`);
  if (def.page === 'main') return 'output';
  if (def.page === 'properties') return 'properties';
  return TITLE_GROUPS.includes(def.group) ? 'titles' : 'layout';
}

/** The ids of the fields of `section`, in the order of `FIELDS`. */
const idsOf = (section: SectionId): string[] =>
  FIELDS.filter((f) => sectionOf(f.id) === section).map((f) => f.id);

/** `settings` with the fields of `section` at their defaults (a copy). */
function withDefaults(
  settings: CardsSettings,
  section: SectionId,
): CardsSettings {
  const copy = structuredClone(settings) as unknown as Record<string, unknown>;
  for (const id of idsOf(section)) {
    setRaw(copy, id, valueOf(DEFAULT_CARDS, id));
  }
  return copy as unknown as CardsSettings;
}

/**
 * US-013 | AC-7, AC-11 (SCAR-038): The first section, in the tab's order, that holds a
 * problem of the checks a run makes; `null` when the settings are ready. Only looks.
 *
 * *Output*: the folder's check; *Which note is which card*: no rule or a refused rule;
 * the other three: the card checks find fewer problems with that section's fields at
 * their defaults (the defaults are valid).
 */
export function firstProblemSection(
  settings: CardsSettings,
  vaultRoot: string,
): SectionId | null {
  if (!checkOutputFolder(settings.outputFolder, vaultRoot).ok) return 'output';
  if (
    settings.kindRules.length === 0 ||
    checkKindRules(settings.kindRules).length > 0
  ) {
    return 'kinds';
  }
  const problems = checkCardSettings(settings).length;
  for (const section of ['properties', 'layout', 'titles'] as const) {
    if (checkCardSettings(withDefaults(settings, section)).length < problems) {
      return section;
    }
  }
  return null;
}

/** US-013 | AC-7: The section open when the tab is drawn: the first with a problem, else *Output*. */
export function initiallyOpen(
  settings: CardsSettings,
  vaultRoot: string,
): SectionId {
  return firstProblemSection(settings, vaultRoot) ?? 'output';
}

/** US-013 AC-10: the sections with a reset; the output folder and the kind rules never are. */
export const RESETTABLE: readonly SectionId[] = [
  'properties',
  'layout',
  'titles',
];

/** US-013 | AC-7: The heading of `section`. */
export function sectionTitle(section: SectionId): string {
  return SECTIONS.find((s) => s.id === section)!.title;
}

/**
 * US-013 | AC-10 (SCAR-014): The question for resetting `section`: it names the section,
 * the buttons are `Reset` and `Cancel`, and the focus is on `Cancel`.
 */
export function resetSectionDialog(section: SectionId): ReplaceDialog {
  return {
    message: `Reset "${sectionTitle(section)}" to its defaults?\nYour values in this section will be lost.`,
    replaceLabel: 'Reset',
    cancelLabel: 'Cancel',
    focus: 'cancel',
  };
}

/**
 * US-013 | AC-10: Puts the fields of `section` back to their defaults through
 * `resetFields`; every other key stays. A section outside `RESETTABLE` is refused with a
 * thrown error before anything is read or written.
 */
export async function resetSection(
  deps: {store: SettingsStore},
  section: SectionId,
): Promise<void> {
  if (!RESETTABLE.includes(section)) {
    throw new Error(`"${sectionTitle(section)}" has no reset`);
  }
  await resetFields(deps, idsOf(section));
}

/** US-013 AC-9: one feature row of *Titles*: its toggle and the two sizes of its gear's modal. */
export interface FeatureRow {
  title: string;
  toggle: string;
  fields: readonly [string, string];
}

/** US-013 AC-9: the rows of *Titles*, one per card kind, in the order skill, spell, creature. */
export const FEATURE_ROWS: readonly FeatureRow[] = (
  [
    ['skill', 'Skill titles'],
    ['spell', 'Spell titles'],
    ['creature', 'Creature titles'],
  ] as const
).map(([kind, title]) => ({
  title,
  toggle: `${kind}.equalTitles`,
  fields: [`${kind}.titleSize`, `${kind}.minTitleSize`] as const,
}));
