// US-002 AC-1 to AC-4, AC-8, AC-9, AC-10: a skill note read into the model of
// its card. Pure: no Obsidian, Node or I/O. The one reader of a skill note:
// the front matter is removed once, here, before any rule (SCAR-034), and the
// warnings are returned, never reported (SCAR-038).
import MarkdownIt from 'markdown-it';
import {parseDocument} from 'yaml';
import {cardCode, type CardKind} from '../card/warning';
import type {SkillSettings} from './settings';

/** US-002 AC-4: a stretch of text with its formatting; flags only when set. */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/** US-002 AC-4: the description is a list of these. */
export type Block =
  | {kind: 'paragraph'; runs: Run[]}
  | {kind: 'list'; ordered: boolean; items: Block[][]}
  | {kind: 'rule'};

/** US-002 AC-8: a problem with a note; `detail` as in the story. */
export interface CardWarning {
  code: string;
  path: string;
  detail: string;
}

/** US-002 "The card": what a skill card shows. */
export interface SkillCard {
  /** US-003: the kind of card; none means a skill card. */
  kind?: CardKind;
  path: string;
  name: string;
  /** Tag labels as shown (AC-2). */
  tags: string[];
  /** The details row: present properties only, in order (AC-3). */
  details: {label: string; value: string}[];
  blocks: Block[];
}

type Token = ReturnType<InstanceType<typeof MarkdownIt>['parse']>[number];

/** US-002 AC-1: the header of a note, once: `---` lines around YAML. */
const FRONT_MATTER = new RegExp(
  '^\\uFEFF?---\\n(?:([\\s\\S]*?)\\n)?---[ \\t]*(?:\\n|$)',
);
/** An Obsidian link `[[Name]]`, `[[Name|alias]]`, or an embed `![[Name]]`. */
const WIKILINK = /(!?)\[\[([^\]|\n]+?)(?:\|([^\]\n]*))?\]\]/g;
/** A callout's first line: `[!type]`, a fold mark, then the title. */
const CALLOUT = /^\[!([^\]\s]+)\][+-]?[ \t]*/;

const markdown = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
});

/**
 * US-002 AC-2: the shown form of a tag. A leading `#` goes; a tag with `/`
 * stays as written; otherwise a space is inserted before an upper-case letter
 * that follows a lower-case letter or a digit and the first letter is
 * upper-cased (`FieldCraft` shows `Field Craft`).
 */
export function tagLabel(tag: string): string {
  const bare = tag.trim().replace(/^#/, '');
  if (bare.includes('/')) return bare;
  const spaced = bare.replace(/([\p{Ll}\p{Nd}])(\p{Lu})/gu, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The text of a link in a property value: `[[A|b]]` is `b`, `[[A]]` is `A`. */
function linkText(value: string): string {
  return value
    .replace(WIKILINK, (_m, _bang: string, name: string, alias?: string) =>
      alias !== undefined && alias !== '' ? alias : name,
    )
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

/** Collects the pieces of one note's reading; the warnings keep their order. */
class Reading {
  readonly warnings: CardWarning[] = [];
  constructor(
    readonly path: string,
    readonly kind: CardKind,
  ) {}
  /** Adds the warning `name` of this note's kind (`cardCode`, AC-11). */
  warn(name: string, detail: string): void {
    this.warnings.push({
      code: cardCode(this.kind, name),
      path: this.path,
      detail,
    });
  }
}

/** Adds a run, merging it into the previous one when the formatting is equal. */
function pushRun(
  runs: Run[],
  text: string,
  bold: boolean,
  italic: boolean,
): void {
  if (text === '') return;
  const last = runs[runs.length - 1];
  if (last !== undefined && !!last.bold === bold && !!last.italic === italic) {
    last.text += text;
    return;
  }
  const run: Run = {text};
  if (bold) run.bold = true;
  if (italic) run.italic = true;
  runs.push(run);
}

/** A source as written: URL escapes are undone when they are valid. */
function asWritten(src: string): string {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}

/**
 * US-002 AC-4: the runs of inline tokens. Images and embeds are omitted with
 * the image-omitted warning, links keep their text, inline HTML is dropped with
 * the block-unsupported warning. `allBold` makes every run bold (headings, a
 * callout's title).
 */
function inlineRuns(
  children: readonly Token[],
  reading: Reading,
  allBold: boolean,
): Run[] {
  const runs: Run[] = [];
  let bold = 0;
  let italic = 0;
  const add = (text: string): void =>
    pushRun(runs, text, allBold || bold > 0, italic > 0);
  for (const child of children) {
    switch (child.type) {
      case 'text': {
        let from = 0;
        for (const m of child.content.matchAll(WIKILINK)) {
          add(child.content.slice(from, m.index));
          if (m[1] === '!') reading.warn('IMAGE_OMITTED', m[2] ?? '');
          else add(m[3] !== undefined && m[3] !== '' ? m[3] : (m[2] ?? ''));
          from = m.index + m[0].length;
        }
        add(child.content.slice(from));
        break;
      }
      case 'code_inline':
        add(child.content);
        break;
      case 'softbreak':
      case 'hardbreak':
        add(' ');
        break;
      case 'strong_open':
        bold++;
        break;
      case 'strong_close':
        bold--;
        break;
      case 'em_open':
        italic++;
        break;
      case 'em_close':
        italic--;
        break;
      case 'image':
        reading.warn(
          'IMAGE_OMITTED',
          asWritten(String(child.attrGet('src') ?? '')),
        );
        break;
      case 'html_inline':
        reading.warn('BLOCK_UNSUPPORTED', 'html');
        break;
      default:
        break;
    }
  }
  return runs;
}

/** A paragraph block from runs, or nothing when they are only white space. */
function paragraphOf(runs: Run[]): Block[] {
  return runs.some((r) => r.text.trim() !== '')
    ? [{kind: 'paragraph', runs}]
    : [];
}

/** The plain text of an inline token (a table cell). */
function plainOf(inline: Token | undefined, reading: Reading): string {
  return inlineRuns(inline?.children ?? [], reading, false)
    .map((r) => r.text)
    .join('')
    .trim();
}

/** Walks a token list into blocks (AC-4); one instance per note. */
class BlockBuilder {
  private pos = 0;
  constructor(
    private readonly tokens: readonly Token[],
    private readonly reading: Reading,
  ) {}

  /** The blocks up to `close` (consumed), or to the end when it is null. */
  blocks(close: string | null = null): Block[] {
    const out: Block[] = [];
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]!;
      if (close !== null && token.type === close) {
        this.pos++;
        return out;
      }
      this.pos++;
      switch (token.type) {
        case 'paragraph_open': {
          const inline = this.tokens[this.pos];
          this.pos += 2;
          out.push(
            ...paragraphOf(
              inlineRuns(inline?.children ?? [], this.reading, false),
            ),
          );
          break;
        }
        case 'heading_open': {
          const inline = this.tokens[this.pos];
          this.pos += 2;
          out.push(
            ...paragraphOf(
              inlineRuns(inline?.children ?? [], this.reading, true),
            ),
          );
          break;
        }
        case 'bullet_list_open':
        case 'ordered_list_open':
          out.push(this.list(token.type === 'ordered_list_open'));
          break;
        case 'blockquote_open':
          out.push(...this.quote());
          break;
        case 'hr':
          out.push({kind: 'rule'});
          break;
        case 'fence':
        case 'code_block': {
          const language = (token.info ?? '').trim().split(/\s+/)[0] ?? '';
          if (language === 'dataview' || language === 'dataviewjs') break;
          this.reading.warn('BLOCK_UNSUPPORTED', 'code');
          out.push(...this.lines(token.content));
          break;
        }
        case 'html_block':
          this.reading.warn('BLOCK_UNSUPPORTED', 'html');
          out.push(...this.lines(token.content.replace(/<[^>]*>/g, '')));
          break;
        case 'table_open':
          out.push(...this.table());
          break;
        default:
          break;
      }
    }
    return out;
  }

  /** A list whose open token is consumed; items are block lists. */
  private list(ordered: boolean): Block {
    const items: Block[][] = [];
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]!;
      this.pos++;
      if (token.type === 'list_item_open')
        items.push(this.blocks('list_item_close'));
      else if (
        token.type === 'bullet_list_close' ||
        token.type === 'ordered_list_close'
      )
        break;
    }
    return {kind: 'list', ordered, items};
  }

  /** A quote; a callout becomes a paragraph that starts with its bold title. */
  private quote(): Block[] {
    const first = this.tokens[this.pos];
    const inline = this.tokens[this.pos + 1];
    let title: Block[] = [];
    if (first?.type === 'paragraph_open' && inline !== undefined) {
      const children = inline.children ?? [];
      const firstText = children[0];
      const marker =
        firstText?.type === 'text' ? CALLOUT.exec(firstText.content) : null;
      if (firstText !== undefined && marker !== null) {
        const cut = children.findIndex((c) => c.type === 'softbreak');
        const head = cut < 0 ? children : children.slice(0, cut);
        const rest = cut < 0 ? [] : children.slice(cut + 1);
        const stripped = Object.assign(
          Object.create(Object.getPrototypeOf(firstText)) as Token,
          firstText,
          {
            content: firstText.content.slice(marker[0].length),
          },
        );
        const titleRuns = inlineRuns(
          [stripped, ...head.slice(1)],
          this.reading,
          true,
        );
        if (titleRuns.length === 0) {
          const word = marker[1] ?? '';
          pushRun(
            titleRuns,
            word.charAt(0).toUpperCase() + word.slice(1),
            true,
            false,
          );
        }
        const restRuns = inlineRuns(rest, this.reading, false);
        if (restRuns.length > 0) pushRun(titleRuns, ' ', false, false);
        title = paragraphOf([...titleRuns, ...restRuns]);
        this.pos += 3;
      }
    }
    return [...title, ...this.blocks('blockquote_close')];
  }

  /** A table as plain rows (cells joined by ` | `), with the warning. */
  private table(): Block[] {
    this.reading.warn('BLOCK_UNSUPPORTED', 'table');
    const rows: Block[] = [];
    let cells: string[] = [];
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]!;
      this.pos++;
      if (token.type === 'table_close') break;
      if (token.type === 'inline') cells.push(plainOf(token, this.reading));
      if (token.type === 'tr_close') {
        rows.push(...paragraphOf([{text: cells.join(' | ')}]));
        cells = [];
      }
    }
    return rows;
  }

  /** The non-empty lines of a text as paragraphs. */
  private lines(text: string): Block[] {
    return text
      .split('\n')
      .filter((line) => line.trim() !== '')
      .flatMap((line) => paragraphOf([{text: line.trim()}]));
  }
}

/** The value of a property as text, null when absent or empty; `list` marks a list or map. */
function propertyText(value: unknown): {text: string | null; list: boolean} {
  if (value === null || value === undefined) return {text: null, list: false};
  if (typeof value === 'object') return {text: null, list: true};
  const text = linkText(String(value)).trim();
  return {text: text === '' ? null : text, list: false};
}

/** US-003 D4: what differs between the kinds when a note is read. */
export interface ReadConfig {
  /** The property that holds the tags. */
  tagsProperty: string;
  /** The details row: property name and label, in the order shown (none: no row). */
  rows: readonly (readonly [string, string])[];
}

/**
 * US-002 AC-1 to AC-4, AC-8, AC-9, AC-10, US-003 AC-1 to AC-4: reads a note of
 * `kind` into its card; the one reader of a skill or spell note.
 *
 * The title is the file name without `.md`. The header is removed once (a
 * header without its closing line is content, a BOM and CRLF are read), the
 * properties are read with the names of `config` (case ignored), and the
 * description is read as the blocks of the story. Warnings carry the code of
 * the kind (`cardCode`) and are returned in the order of the note's text:
 * properties first, then the description.
 */
export function readText(
  kind: CardKind,
  path: string,
  text: string,
  config: ReadConfig,
): {card: SkillCard; warnings: CardWarning[]} {
  const reading = new Reading(path, kind);
  const name = path.replace(/^.*[\\/]/, '').replace(/\.md$/i, '');
  const source = text.replace(/\r\n?/g, '\n');
  const header = FRONT_MATTER.exec(source);
  const afterHeader = header === null ? source : source.slice(header[0].length);
  // A byte-order mark in front of a note without a header is not text.
  const body =
    afterHeader.charCodeAt(0) === 0xfeff ? afterHeader.slice(1) : afterHeader;

  let entries: [string, unknown][] = [];
  if (header !== null) {
    const doc = parseDocument(header[1] ?? '');
    const data: unknown = doc.errors.length === 0 ? doc.toJS() : undefined;
    // `undefined` (a YAML error) is not an object either, so it is invalid too.
    if (data !== null && (typeof data !== 'object' || Array.isArray(data))) {
      reading.warn('PROPERTIES_INVALID', 'yaml');
    } else if (data !== null) {
      entries = Object.entries(data as Record<string, unknown>);
    }
  }
  const find = (property: string): [string, unknown] | undefined =>
    entries.find(
      ([key]) => key.trim().toLowerCase() === property.trim().toLowerCase(),
    );

  const tagsValue = find(config.tagsProperty)?.[1];
  const rawTags = Array.isArray(tagsValue)
    ? tagsValue
    : tagsValue === undefined
      ? []
      : [tagsValue];
  const tags = rawTags
    .filter((t): t is string | number | boolean =>
      ['string', 'number', 'boolean'].includes(typeof t),
    )
    .map((t) => String(t).trim())
    .filter((t) => t !== '' && t !== '#')
    .map(tagLabel);

  const rows = config.rows;
  const shown = new Map<string, string>();
  const notText: string[] = [];
  for (const [property] of rows) {
    const found = find(property);
    if (found === undefined) continue;
    const {text: value, list} = propertyText(found[1]);
    if (list) notText.push(found[0]);
    else if (value !== null) shown.set(property, value);
  }
  // Warnings in the order the properties are written.
  for (const [key] of entries) {
    if (notText.includes(key)) reading.warn('VALUE_NOT_TEXT', key);
  }
  const details = rows.flatMap(([property, label]) => {
    const value = shown.get(property);
    return value === undefined ? [] : [{label, value}];
  });

  const blocks = new BlockBuilder(markdown.parse(body, {}), reading).blocks();
  if (tags.length === 0 && details.length === 0 && blocks.length === 0) {
    reading.warn('EMPTY', '');
  }
  return {
    card: {kind, path, name, tags, details, blocks},
    warnings: reading.warnings,
  };
}

/**
 * US-002 AC-1 to AC-4, AC-8, AC-9, AC-10: reads a skill note into its card
 * (`readText` with the skill's properties: tags, then timing, kind and
 * requires as the details row).
 */
export function readSkill(
  path: string,
  text: string,
  settings: SkillSettings,
): {card: SkillCard; warnings: CardWarning[]} {
  return readText('skill', path, text, {
    tagsProperty: settings.tagsProperty,
    rows: [
      [settings.timingProperty, settings.timingLabel],
      [settings.kindProperty, settings.kindLabel],
      [settings.requiresProperty, settings.requiresLabel],
    ],
  });
}
