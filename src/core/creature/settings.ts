// US-004 settings table, AC-13: the settings of the creature card. The three
// section headings and, since US-012 (D14), the creature kind's title settings; the
// size settings are the shared ones of every text card (`CardSizes`, US-003 D2).
import {
  DEFAULT_CREATURE_TITLES,
  checkTitleSettings,
  type TitleSettings,
} from '../card/titles';

/**
 * US-004 settings table: the headings of the three sections the card shows; US-012
 * D14: the title settings of the creature kind (equal title bands).
 */
export interface CreatureSettings extends TitleSettings {
  instinctsHeading: string;
  actionsHeading: string;
  signsHeading: string;
}

/** US-004 settings table: the defaults (invented names, SCAR-035). */
export const DEFAULT_CREATURE: Readonly<CreatureSettings> = Object.freeze({
  instinctsHeading: 'Behaviour',
  actionsHeading: 'Actions',
  signsHeading: 'Signs',
  ...DEFAULT_CREATURE_TITLES,
});

/**
 * US-004 AC-13, US-012 AC-8: checks the creature settings; one message per problem,
 * empty when they are valid. A heading must not be empty or only spaces (it could
 * match no section, or every one). The headings' messages come first, then those of
 * the title settings (checked whether the switch is on or off).
 */
export function checkCreatureSettings(settings: CreatureSettings): string[] {
  const issues: string[] = [];
  const blank = (text: string): boolean => text.trim() === '';
  if (blank(settings.instinctsHeading)) {
    issues.push('The instincts heading of the creature card is empty');
  }
  if (blank(settings.actionsHeading)) {
    issues.push('The actions heading of the creature card is empty');
  }
  if (blank(settings.signsHeading)) {
    issues.push('The signs heading of the creature card is empty');
  }
  issues.push(...checkTitleSettings('creature', settings));
  return issues;
}
