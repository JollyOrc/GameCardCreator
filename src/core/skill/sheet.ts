// US-002 AC-2, AC-5 to AC-7, AC-9, AC-10, AC-12: the skill cards on the sheet.
// The layout and the escaping live in `card/sheet.ts` (US-003, D4); this is the
// skill's entry: it checks the skill settings, then makes the sheet.
import {cardSheetTypst} from '../card/sheet';
import type {SheetSettings} from '../sheet/layout';
import type {SkillCard} from './read';
import {checkSkillSettings, type SkillSettings} from './settings';

/**
 * US-002 AC-2, AC-5 to AC-7, AC-9, AC-10, AC-12: the Typst source of a sheet
 * of skill cards.
 *
 * Refuses invalid skill settings (properties, labels and sizes), then makes the
 * sheet as `cardSheetTypst` does; the sizes are the shared ones of the skill
 * settings. Refuses 0 cards and what the sheet refuses, with a message and no
 * source.
 */
export function skillSheetTypst(
  cards: readonly SkillCard[],
  sheet: SheetSettings,
  skill: SkillSettings,
): {ok: true; source: string} | {ok: false; message: string} {
  const issues = checkSkillSettings(skill);
  if (issues.length > 0) return {ok: false, message: issues.join('; ')};
  return cardSheetTypst(cards, sheet, skill);
}
