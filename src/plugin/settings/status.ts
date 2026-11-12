// US-007 AC-2, AC-8, D16: the status line of the main page and the line under the sheet
// fields. Pure: the problems are the messages of the checks that already exist.
import {checkOutputFolder} from '../../core/run/output';
import {checkCardsSettings, type CardsSettings} from '../../core/run/settings';
import {
  checkSettings,
  sheetGrid,
  type SheetSettings,
} from '../../core/sheet/layout';

/**
 * US-007 AC-8: `9 cards per A4 page (3 × 3)` for the sheet settings, `1 card per A4 page
 * (1 × 1)` for one, or the layout function's message when none fits or a value is out of
 * range.
 */
export function gridLine(sheet: SheetSettings): string {
  const grid = sheetGrid(sheet);
  if (!grid.ok) return grid.message;
  const cards = grid.perPage === 1 ? 'card' : 'cards';
  return `${grid.perPage} ${cards} per A4 page (${grid.columns} × ${grid.rows})`;
}

/**
 * US-007 AC-2, D16: `Ready: N kind rules, output folder <path>` when the settings pass the
 * checks a run makes, otherwise `Not ready:` and every problem on its own line starting
 * with `- `, in the order of the checks. A sheet on which no card fits is a problem too
 * (a run would refuse it), added once and only when the sheet's own values are valid.
 */
export function statusLine(settings: CardsSettings, vaultRoot: string): string {
  const problems = checkCardsSettings(settings, vaultRoot);
  if (checkSettings(settings.sheet).length === 0) {
    const grid = sheetGrid(settings.sheet);
    if (!grid.ok) problems.push(grid.message);
  }
  if (problems.length > 0) {
    return `Not ready:\n${problems.map((p) => `- ${p}`).join('\n')}`;
  }
  const checked = checkOutputFolder(settings.outputFolder, vaultRoot);
  const folder = checked.ok ? checked.folder : settings.outputFolder;
  const n = settings.kindRules.length;
  return `Ready: ${n} kind rule${n === 1 ? '' : 's'}, output folder ${folder}`;
}
