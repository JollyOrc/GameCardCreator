// US-005 settings table, AC-9: the settings of the run and their check. The
// card settings are those of US-001 (sheet), US-002 (skill, with the sizes both
// kinds share, US-003 D2) and US-003 (spell); the new ones are the kind rules
// and the output folder.
import {
  DEFAULT_SHEET,
  checkSettings as checkSheet,
  type SheetSettings,
} from '../sheet/layout';
import {
  DEFAULT_SKILL,
  checkSkillSettings,
  type SkillSettings,
} from '../skill/settings';
import {
  DEFAULT_SPELL,
  checkSpellSettings,
  type SpellSettings,
} from '../spell/settings';
import {checkKindRules, type KindRule} from './kinds';
import {checkOutputFolder} from './output';

/** US-005 settings table: everything a run reads from the settings. */
export interface CardsSettings {
  /** Folder rules that give a note its kind (AC-3). */
  kindRules: KindRule[];
  /** The absolute folder the PDF and the warnings file are written to (AC-5). */
  outputFolder: string;
  sheet: SheetSettings;
  skill: SkillSettings;
  spell: SpellSettings;
}

/** US-005 settings table: the defaults. No rule and no folder: the author adds theirs. */
export const DEFAULT_CARDS: Readonly<CardsSettings> = Object.freeze({
  kindRules: [],
  outputFolder: '',
  sheet: DEFAULT_SHEET,
  skill: DEFAULT_SKILL,
  spell: DEFAULT_SPELL,
});

/**
 * US-005 AC-4: checks the card settings (sheet, skill with its sizes, spell);
 * one message per problem, empty when valid. Does not look at the output
 * folder or the kind rules (the runner does, with the vault's folder).
 */
export function checkCardSettings(settings: CardsSettings): string[] {
  return [
    ...checkSheet(settings.sheet),
    ...checkSkillSettings(settings.skill),
    ...checkSpellSettings(settings.spell),
  ];
}

/**
 * US-005 AC-9: checks all the settings a command needs; one message per
 * problem, empty when the run can start. The output folder is classified
 * against `vaultRoot` (AC-5); at least one kind rule is needed (AC-3).
 */
export function checkCardsSettings(
  settings: CardsSettings,
  vaultRoot: string,
): string[] {
  const issues: string[] = [];
  const folder = checkOutputFolder(settings.outputFolder, vaultRoot);
  if (!folder.ok) issues.push(folder.message);
  if (settings.kindRules.length === 0) {
    issues.push('Kind rules: add at least one rule (a folder and a kind)');
  } else {
    issues.push(...checkKindRules(settings.kindRules));
  }
  issues.push(...checkCardSettings(settings));
  return issues;
}
