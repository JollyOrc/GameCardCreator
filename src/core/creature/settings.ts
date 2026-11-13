// US-004 settings table, AC-13: the settings of the creature card. The three
// section headings are the only ones; the size settings are the shared ones of
// every text card (`CardSizes`, US-003 D2).

/** US-004 settings table: the headings of the three sections the card shows. */
export interface CreatureSettings {
  instinctsHeading: string;
  actionsHeading: string;
  signsHeading: string;
}

/** US-004 settings table: the defaults (invented names, SCAR-035). */
export const DEFAULT_CREATURE: Readonly<CreatureSettings> = Object.freeze({
  instinctsHeading: 'Behaviour',
  actionsHeading: 'Actions',
  signsHeading: 'Signs',
});

/**
 * US-004 AC-13: checks the creature settings; one message per problem, empty
 * when they are valid. A heading must not be empty or only spaces (it could
 * match no section, or every one).
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
  return issues;
}
