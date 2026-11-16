// US-009 AC-7, AC-3: what the emitter writes for a banded card, at the source level
// (no compile): a colour or an icon that is not in the checked form is never written
// into the Typst source (the reader makes only valid ones; this is the second guard).
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import type {SkillCard} from '../../src/core/skill/read';
import {DEFAULT_SIZES} from '../../src/core/skill/settings';

const card = (colour: string, icon: string): SkillCard => ({
  kind: 'skill',
  path: 'skills/Parry.md',
  name: 'Parry',
  tags: ['Combat Skill'],
  rawTags: ['Swordplay'],
  details: [],
  blocks: [{kind: 'paragraph', runs: [{text: 'You turn a blow aside.'}]}],
  branches: [{tag: 'Swordplay', colour, icon, line: 1}],
});
const source = (c: SkillCard): string => {
  const r = cardSheetTypst([c], DEFAULT_SHEET, DEFAULT_SIZES);
  if (!r.ok) throw new Error(r.message);
  return r.source;
};

describe('US-009 AC-7: nothing unchecked reaches the Typst source', () => {
  it('a valid branch is written as a band with its colour and the glyph of its icon', () => {
    const src = source(card('#f4d6b0', 'sword'));
    expect(src).toContain('gcc-fit-b(');
    expect(src).toContain('rgb("#f4d6b0")');
    expect(src).toContain('"\\u{e946}"');
  });
  it.each([
    ['a colour that is not #rrggbb', 'red', 'sword'],
    ['a colour with Typst code in it', '#f4d6b0") + evil("', 'sword'],
    ['an upper-case colour (the reader writes lower case)', '#F4D6B0', 'sword'],
    ['an icon that is not in the table', '#f4d6b0', 'no-such-icon'],
    ['an icon name with Typst code', '#f4d6b0', 'sword") + evil("'],
    ['a word that is an object key', '#f4d6b0', 'constructor'],
  ])('%s: no band, the card is drawn as a plain card', (_n, colour, icon) => {
    const src = source(card(colour, icon));
    expect(src).not.toContain('gcc-fit-b');
    expect(src).not.toContain('evil');
    expect(src).not.toContain('rpg-awesome');
    expect(src).toContain('gcc-fit(');
  });
  it('a card whose branches are all refused is the same source as a card with none', () => {
    const none: SkillCard = {...card('#f4d6b0', 'sword'), branches: []};
    expect(source(card('red', 'sword'))).toBe(source(none));
  });
});
