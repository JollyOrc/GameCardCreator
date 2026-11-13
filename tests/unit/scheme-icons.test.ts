// US-009 AC-5, AC-7, AC-12: the table from an icon name to its code point in the
// bundled font (RPG Awesome, 496 names). The expected numbers were read from the
// font's own CSS (rpg-awesome.css, 2026-11-13, SCAR-024: its output is the first
// measurement); no name is written into Typst without passing this table.
// Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {ICON_NAMES, iconCodePoint} from '../../src/core/scheme/icons';

describe('US-009: the icon table', () => {
  it('has the 496 names of the font, each once', () => {
    expect(ICON_NAMES).toHaveLength(496);
    expect(new Set(ICON_NAMES).size).toBe(496);
  });
  it('gives the code points the font CSS gives (spot checks across the set)', () => {
    expect(iconCodePoint('sword')).toBe(0xe946);
    expect(iconCodePoint('skull')).toBe(0xeaa1);
    expect(iconCodePoint('fire')).toBe(0xe9c3);
    expect(iconCodePoint('anvil')).toBe(0xe909);
    expect(iconCodePoint('crystal-ball')).toBe(0xe982);
    expect(iconCodePoint('acid')).toBe(0xe900);
  });
  it('sword and broadsword are the same glyph (the font says so)', () => {
    expect(iconCodePoint('broadsword')).toBe(iconCodePoint('sword'));
  });
  it('every code point is in the private-use range of the font', () => {
    for (const name of ICON_NAMES) {
      const cp = iconCodePoint(name)!;
      expect(cp, name).toBeGreaterThanOrEqual(0xe900);
      expect(cp, name).toBeLessThanOrEqual(0xebff);
    }
  });
  it('an unknown name, an empty name and an inherited object key give nothing', () => {
    for (const name of ['nonesuch', '', 'constructor', '__proto__', 'toString'])
      expect(iconCodePoint(name), name).toBeUndefined();
  });
  it('names compare without case', () => {
    expect(iconCodePoint('Sword')).toBe(iconCodePoint('sword'));
    expect(iconCodePoint('CRYSTAL-BALL')).toBe(iconCodePoint('crystal-ball'));
  });
});
