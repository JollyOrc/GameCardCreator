// US-003 #6: `cardSheetTypst`, the sheet of text cards of any kind. The sizes
// are shared by all kinds (AC-6); the skill entry only adds its own settings
// check and must not change what is written (SCAR-017, SCAR-023).
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {skillSheetTypst} from '../../src/core/skill/sheet';
import type {SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SIZES, DEFAULT_SKILL} from '../../src/core/skill/settings';

const card = (kind: 'skill' | 'spell', name: string): SkillCard => ({
  kind,
  path: `${kind}s/${name}.md`,
  name,
  tags: ['Wizardry'],
  details: [],
  blocks: [{kind: 'paragraph', runs: [{text: 'Text.'}]}],
});
const cards = [card('skill', 'One'), card('spell', 'Two')];

describe('US-003 #6: cardSheetTypst', () => {
  it('writes the shared sizes: the defaults, and custom ones for both kinds', () => {
    const d = cardSheetTypst(cards, DEFAULT_SHEET, DEFAULT_SIZES);
    if (!d.ok) throw new Error(d.message);
    expect(d.source).toContain('(7, 6.75, 6.5, 6.25, 6, 5.75, 5.5,)');
    expect(d.source.match(/gcc-fit\(/g)).toHaveLength(2 + 1); // 2 calls + the definition
    const c = cardSheetTypst(cards, DEFAULT_SHEET, {
      maxSize: 6,
      minSize: 5,
      sizeStep: 0.5,
    });
    if (!c.ok) throw new Error(c.message);
    expect(c.source).toContain('(6, 5.5, 5,)');
    expect(c.source).not.toContain('6.75');
  });
  it('writes every card of every kind, in order, with its index', () => {
    const r = cardSheetTypst(cards, DEFAULT_SHEET, DEFAULT_SIZES);
    if (!r.ok) throw new Error(r.message);
    expect(r.source.indexOf('"One"')).toBeGreaterThan(0);
    expect(r.source.indexOf('"Two"')).toBeGreaterThan(
      r.source.indexOf('"One"'),
    );
    expect(r.source).toContain('gcc-fit(0, ');
    expect(r.source).toContain('gcc-fit(1, ');
  });
  it('refuses invalid sizes, naming the setting, and writes no source', () => {
    const r = cardSheetTypst(cards, DEFAULT_SHEET, {
      maxSize: 6,
      minSize: 7,
      sizeStep: 0.5,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/largest/i);
    const s = cardSheetTypst(cards, DEFAULT_SHEET, {
      maxSize: 7,
      minSize: 5.5,
      sizeStep: 2,
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.message).toMatch(/step/i);
  });
  it('refuses no cards and invalid sheet settings', () => {
    expect(cardSheetTypst([], DEFAULT_SHEET, DEFAULT_SIZES)).toEqual({
      ok: false,
      message: 'There are no cards to print',
    });
    expect(
      cardSheetTypst(cards, {...DEFAULT_SHEET, margin: 51}, DEFAULT_SIZES).ok,
    ).toBe(false);
  });
});

describe('US-003 #6: skillSheetTypst is the same sheet with the skill check added', () => {
  it('writes exactly what cardSheetTypst writes for the same cards and sizes', () => {
    const skill = skillSheetTypst(cards, DEFAULT_SHEET, DEFAULT_SKILL);
    const generic = cardSheetTypst(cards, DEFAULT_SHEET, DEFAULT_SKILL);
    expect(skill).toEqual(generic);
    expect(skill.ok).toBe(true);
  });
  it('uses the sizes of the skill settings', () => {
    const r = skillSheetTypst(cards, DEFAULT_SHEET, {
      ...DEFAULT_SKILL,
      maxSize: 6,
      minSize: 5,
      sizeStep: 0.5,
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.source).toContain('(6, 5.5, 5,)');
  });
  it('still refuses what only the skill settings know: a property clash', () => {
    const r = skillSheetTypst(cards, DEFAULT_SHEET, {
      ...DEFAULT_SKILL,
      kindProperty: 'timing',
    });
    expect(r.ok).toBe(false);
    // the generic sheet knows nothing of properties: it makes the sheet
    const clash = {...DEFAULT_SKILL, kindProperty: 'timing'};
    expect(cardSheetTypst(cards, DEFAULT_SHEET, clash).ok).toBe(true);
  });
});
