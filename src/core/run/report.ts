// US-005 AC-8: the text of the warnings file. No date: the same run gives the
// same file.
import type {CardWarning} from '../skill/read';

/**
 * US-005 AC-8: the warnings file for the run `name`: the heading `# <name>
 * cards: warnings`, an empty line, then one line `- CODE — path — detail` per
 * warning in order (`- CODE — path` without a detail), or `No warnings.`; a
 * line break ends the file.
 */
export function warningsFile(
  name: string,
  warnings: readonly CardWarning[],
): string {
  const head = `# ${name} cards: warnings\n\n`;
  if (warnings.length === 0) return `${head}No warnings.\n`;
  const lines = warnings.map(
    (w) =>
      `- ${w.code} — ${w.path}${w.detail === '' ? '' : ` — ${w.detail}`}\n`,
  );
  return head + lines.join('');
}
