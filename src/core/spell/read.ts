// US-003 AC-1 to AC-4: a spell note read into its card. A spell note is a skill
// note without the details row: the one reader (`readText`) is used with the
// kind `spell` and no properties besides the tags.
import {readText, type CardWarning, type SkillCard} from '../skill/read';
import type {SpellSettings} from './settings';

/**
 * US-003 AC-1 to AC-4: reads a spell note into its card.
 *
 * The title is the file name without `.md`, the tags come from the tags
 * property of `settings`, every other property is ignored (AC-2: a spell has
 * no details row, and a property a skill would warn about gives no warning),
 * and the description is read as the blocks of US-002 AC-4. The warnings carry
 * the codes of the spell kind (`cardCode`) and are returned in the order of the
 * note's text.
 */
export function readSpell(
  path: string,
  text: string,
  settings: SpellSettings,
): {card: SkillCard; warnings: CardWarning[]} {
  return readText('spell', path, text, {
    tagsProperty: settings.tagsProperty,
    rows: [],
  });
}
