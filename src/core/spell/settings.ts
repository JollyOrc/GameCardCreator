// US-003 settings table: the settings of the spell card. Spell notes carry
// only their tags, so the one property is the tags property; the size
// settings are the shared ones of every text card (D2, `CardSizes`). US-011 D5:
// the title settings of the spell kind.
import {
  DEFAULT_TITLES,
  checkTitleSettings,
  type TitleSettings,
} from '../card/titles';

/** US-003 settings table: the property that holds the tags of a spell. */
export interface SpellSettings extends TitleSettings {
  tagsProperty: string;
}

/** US-003 settings table: the default (an invented name, as for skills, D1). */
export const DEFAULT_SPELL: Readonly<SpellSettings> = Object.freeze({
  tagsProperty: 'tags',
  ...DEFAULT_TITLES,
});

/**
 * US-003, US-011 AC-9: checks the spell settings; one message per problem, empty
 * when they are valid. The tags property name must not be empty or only spaces;
 * the title settings are checked by `checkTitleSettings`.
 */
export function checkSpellSettings(settings: SpellSettings): string[] {
  return [
    ...(settings.tagsProperty.trim() === ''
      ? ['The tags property name of the spell card is empty']
      : []),
    ...checkTitleSettings('spell', settings),
  ];
}
