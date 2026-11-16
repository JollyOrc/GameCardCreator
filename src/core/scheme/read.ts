// US-009 AC-1, AC-7: the scheme note read into its rows. Pure: no Obsidian, Node or
// I/O. The note is a Markdown note of the vault; its format is the convention other
// tools can share (the story's "The scheme note"): front matter `schemeVersion`,
// `iconSet`, `credit`, and the first TOP-LEVEL table with the columns `Tag`,
// `Colour` and `Icon`. The front matter is removed once (`splitHeader`, SCAR-034);
// the table is found as a `table` token at level 0, never by a text match, so a
// table in a quote, a list item or a code fence is no scheme (SCAR-026, SCAR-041).
// Problems are returned as warnings, never reported or thrown (SCAR-038, rule 8).
import {schemeCode} from '../card/warning';
import {
  headerEntries,
  parseBody,
  Reading,
  splitHeader,
  type CardWarning,
  type Token,
} from '../skill/read';
import {tagKey} from './branches';
import {iconCodePoint} from './icons';

/** US-009 AC-1: one row of the scheme: a tag, its colour and its icon. */
export interface SchemeRow {
  /** The tag as written in the table, without backticks and a leading `#`. */
  tag: string;
  /** `#rrggbb`, lower case. */
  colour: string;
  /** The icon name, lower case, one of `ICON_NAMES`. */
  icon: string;
  /** The line of the row in the note (from 1, the front matter counted). */
  line: number;
}

/** US-009 AC-1, AC-10: what the note gives. */
export interface Scheme {
  rows: SchemeRow[];
  /** The `credit` property: null when absent, `''` when empty. */
  credit: string | null;
}

/** US-009 AC-10: the credit text when the note has no `credit` property. */
export const DEFAULT_ICON_CREDIT =
  'Icons made by Lorc, Delapouite, sbed and other authors. Available on https://game-icons.net (CC BY 3.0), via RPG Awesome';

/** A cell's text: without backticks and surrounding spaces. */
const cellText = (text: string): string => text.replace(/`/g, '').trim();

/** The rows of the table whose `table_open` is at `tokens[at]`: cells per row, with the row's line. */
function tableRows(
  tokens: readonly Token[],
  at: number,
  offset: number,
): {cells: string[]; line: number}[] {
  const rows: {cells: string[]; line: number}[] = [];
  let cells: string[] | null = null;
  let line = 0;
  for (let i = at + 1; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type === 'table_close') break;
    if (t.type === 'tr_open') {
      cells = [];
      line = (t.map?.[0] ?? 0) + offset + 1;
    } else if (t.type === 'inline' && cells !== null) {
      cells.push(t.content);
    } else if (t.type === 'tr_close' && cells !== null) {
      rows.push({cells, line});
      cells = null;
    }
  }
  return rows;
}

/**
 * US-009 AC-1, AC-7: reads the scheme note `text` (of the vault path `path`, named in
 * every warning).
 *
 * Front matter: `schemeVersion` other than 1 or `iconSet` other than `rpg-awesome`
 * give the unsupported warning (detail as written, e.g. `schemeVersion: 2`) and no rows;
 * a front matter that is not valid YAML gives the same warning (detail
 * `front matter: yaml`) and the table is still read; `credit` is returned as it is.
 * Table: the first top-level table whose header row has `Tag`, `Colour` and `Icon`
 * (any case, any order); no such table gives the table-missing warning. Each body row
 * becomes a row, or the row-invalid warning with `line <n>: <reason>` and is ignored
 * (an empty tag, a colour that is not `#` and six hexadecimal digits, an icon name not
 * in the font's list, a tag already used by an earlier row: the earlier one stays).
 * The colour is stored in lower case, the icon without case. Never throws; the same
 * text gives the same result.
 */
export function readScheme(
  path: string,
  text: string,
): {scheme: Scheme; warnings: CardWarning[]} {
  const warnings: CardWarning[] = [];
  const warn = (name: string, detail: string): void => {
    warnings.push({code: schemeCode(name), path, detail});
  };
  const scheme: Scheme = {rows: [], credit: null};
  const {header, body} = splitHeader(text);
  // The body's lines are counted from the line after the header.
  const offset = header === null ? 0 : header[0].split('\n').length - 1;

  const reading = new Reading(path, 'skill');
  const entries = headerEntries(header, reading);
  if (reading.warnings.length > 0) warn('UNSUPPORTED', 'front matter: yaml');
  const prop = (key: string): unknown => entries.find(([k]) => k === key)?.[1];
  const credit = prop('credit');
  if (typeof credit === 'string') scheme.credit = credit;
  const version = prop('schemeVersion');
  if (version !== undefined && String(version) !== '1') {
    warn('UNSUPPORTED', `schemeVersion: ${String(version)}`);
    return {scheme, warnings};
  }
  const iconSet = prop('iconSet');
  if (iconSet !== undefined && String(iconSet) !== 'rpg-awesome') {
    warn('UNSUPPORTED', `iconSet: ${String(iconSet)}`);
    return {scheme, warnings};
  }

  const tokens = parseBody(body);
  for (let i = 0; i < tokens.length; i++) {
    const open = tokens[i]!;
    if (open.type !== 'table_open' || open.level !== 0) continue;
    const rows = tableRows(tokens, i, offset);
    const head = (rows[0]?.cells ?? []).map((c) => cellText(c).toLowerCase());
    const col = {
      tag: head.indexOf('tag'),
      colour: head.indexOf('colour'),
      icon: head.indexOf('icon'),
    };
    if (col.tag < 0 || col.colour < 0 || col.icon < 0) continue;
    const seen = new Set<string>();
    for (const row of rows.slice(1)) {
      const written = cellText(row.cells[col.tag] ?? '');
      const tag = written.replace(/^#/, '').trim();
      const colour = cellText(row.cells[col.colour] ?? '');
      const icon = cellText(row.cells[col.icon] ?? '');
      let reason = '';
      if (tag === '') reason = 'empty tag';
      else if (!/^#[0-9a-fA-F]{6}$/.test(colour))
        reason = `bad colour "${colour}"`;
      else if (iconCodePoint(icon) === undefined)
        reason = `unknown icon "${icon}"`;
      else if (seen.has(tagKey(tag))) reason = `duplicate tag "${written}"`;
      if (reason !== '') {
        warn('ROW_INVALID', `line ${row.line}: ${reason}`);
        continue;
      }
      seen.add(tagKey(tag));
      scheme.rows.push({
        tag,
        colour: colour.toLowerCase(),
        icon: icon.trim().toLowerCase(),
        line: row.line,
      });
    }
    return {scheme, warnings};
  }
  warn('TABLE_MISSING', '');
  return {scheme, warnings};
}
