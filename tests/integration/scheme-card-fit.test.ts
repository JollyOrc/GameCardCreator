// US-009 AC-8: the fit follows the band. For a body of growing length, whenever the
// card says its text fits at the chosen size, every line of it lies inside the text
// area under the band (the band's height comes out of the room, per size). Compiled
// with the pinned Typst and read back; invented text (SCAR-035). Scope: this layout,
// this typeface, the default sizes, a skill card with a details row and one branch.
import {describe, expect, it} from 'vitest';
import type {Block, SkillCard} from '../../src/core/skill/read';
import {runBox, runText} from '../support/card-pdf';
import {makeSheet} from '../support/card-sheet';
import {words14} from '../support/creature-fixtures';
import {pagePaints} from '../support/pdf/graphics';
import {openPdf} from '../support/pdf/reader';

const para = (text: string): Block => ({kind: 'paragraph', runs: [{text}]});
const card = (blocks: Block[]): SkillCard => ({
  kind: 'skill',
  path: 'skills/Parry.md',
  name: 'Parry',
  tags: ['Combat Skill'],
  rawTags: ['Swordplay'],
  details: [{label: 'Time', value: 'reaction'}],
  blocks,
  branches: [{tag: 'Swordplay', colour: '#f4d6b0', icon: 'sword', line: 1}],
});

describe('US-009 AC-8: a text that fits lies inside the text area under the band', () => {
  it.each([50, 60, 70, 75, 80, 90, 120])(
    'a body of %i words: when the fact says it fits, no line is below the bottom padding or inside the band',
    async (n) => {
      const m = await makeSheet([card(words14(n).map(para))]);
      const fact = (m.facts as {size: number; fits: boolean}[])[0]!;
      const c = m.placed[0]!;
      const band = pagePaints(openPdf(m.pdf))[c.page]!.fills[0]!;
      const body = m
        .runsOf(0)
        .filter(
          (r) =>
            Math.abs(r.size - fact.size) < 0.3 &&
            runText(r).trim() !== '' &&
            runBox(r).y > band.y1,
        );
      expect(body.length).toBeGreaterThan(0);
      if (fact.fits) {
        const last = Math.max(...body.map((r) => runBox(r).y));
        expect(last).toBeLessThanOrEqual(c.y + 88 - 4 + 0.1);
      }
    },
    120_000,
  );
});
