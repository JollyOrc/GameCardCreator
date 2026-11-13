// US-007 AC-1, AC-3, AC-4, AC-8: the table of the fields on the settings pages (the tab
// builds its rows from it), the value each field shows, and the key rule of a text or
// number field. Pure: no Obsidian import.
import type {CardsSettings} from '../../core/run/settings';

/** US-007 AC-1: the three pages of the tab. */
export type PageId = 'main' | 'properties' | 'layout';

/** US-007 AC-1: one field of a page. `id` is the path of its setting (`sheet.margin`). */
export interface FieldDef {
  id: string;
  page: PageId;
  /** The heading it sits under on its page. */
  group: string;
  label: string;
  kind: 'text' | 'number' | 'toggle';
}

const field = (
  id: string,
  page: PageId,
  group: string,
  label: string,
  kind: FieldDef['kind'] = 'text',
): FieldDef => ({id, page, group, label, kind});

/**
 * US-007 AC-1, AC-4: every field of the screen, in the order of its page. The kind rules
 * are not fields (a list of rows, `rules.ts`). Twenty fields (US-004 AC-13 added three).
 */
export const FIELDS: readonly FieldDef[] = [
  field('outputFolder', 'main', 'Output', 'Output folder'),
  field('skill.tagsProperty', 'properties', 'Skill notes', 'Tags property'),
  field('skill.timingProperty', 'properties', 'Skill notes', 'Timing property'),
  field('skill.timingLabel', 'properties', 'Skill notes', 'Timing label'),
  field('skill.kindProperty', 'properties', 'Skill notes', 'Kind property'),
  field('skill.kindLabel', 'properties', 'Skill notes', 'Kind label'),
  field(
    'skill.requiresProperty',
    'properties',
    'Skill notes',
    'Requires property',
  ),
  field('skill.requiresLabel', 'properties', 'Skill notes', 'Requires label'),
  field('spell.tagsProperty', 'properties', 'Spell notes', 'Tags property'),
  field(
    'creature.instinctsHeading',
    'properties',
    'Creature notes',
    'Instincts heading',
  ),
  field(
    'creature.actionsHeading',
    'properties',
    'Creature notes',
    'Actions heading',
  ),
  field(
    'creature.signsHeading',
    'properties',
    'Creature notes',
    'Signs heading',
  ),
  field('sheet.cardWidth', 'layout', 'Sheet', 'Card width', 'number'),
  field('sheet.cardHeight', 'layout', 'Sheet', 'Card height', 'number'),
  field('sheet.margin', 'layout', 'Sheet', 'Margin', 'number'),
  field('sheet.gap', 'layout', 'Sheet', 'Gap', 'number'),
  field('sheet.cutMarks', 'layout', 'Sheet', 'Cut marks', 'toggle'),
  field('skill.maxSize', 'layout', 'Text size', 'Largest size', 'number'),
  field('skill.minSize', 'layout', 'Text size', 'Smallest size', 'number'),
  field('skill.sizeStep', 'layout', 'Text size', 'Size step', 'number'),
];

/** US-007 AC-1: the fields of one page, in order. */
export const fieldsOf = (page: PageId): FieldDef[] =>
  FIELDS.filter((f) => f.page === page);

/**
 * US-007 AC-1: the fields of one page grouped under their headings, in the order of their
 * first appearance (`Sheet` before `Text size` on the layout page).
 */
export function groupsOf(page: PageId): {group: string; fields: FieldDef[]}[] {
  const groups: {group: string; fields: FieldDef[]}[] = [];
  for (const field of fieldsOf(page)) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.group === field.group)
      last.fields.push(field);
    else groups.push({group: field.group, fields: [field]});
  }
  return groups;
}

/**
 * US-007 AC-8: the value of the setting `id` in `settings`, as the field shows it.
 *
 * Throws `Unknown setting <id>` for an id that is not in `FIELDS` (a bug of the caller,
 * never a user input).
 */
export function valueOf(
  settings: CardsSettings,
  id: string,
): string | number | boolean {
  if (!FIELDS.some((f) => f.id === id)) {
    throw new Error(`Unknown setting ${id}`);
  }
  let value: unknown = settings;
  for (const part of id.split('.')) {
    value = (value as Record<string, unknown>)[part];
  }
  return value as string | number | boolean;
}

/**
 * US-007 AC-3 (SCAR-013): what a key does in a text or number field. Enter commits, except
 * during an input-method composition (`isComposing`, or key code 229); no other key does
 * anything here. One small function without UI imports, so a test reaches it.
 */
export function fieldKey(event: {
  key: string;
  isComposing?: boolean;
  keyCode?: number;
}): 'commit' | 'none' {
  if (event.isComposing === true || event.keyCode === 229) return 'none';
  return event.key === 'Enter' ? 'commit' : 'none';
}
