// US-004 AC-13 at the card (ticket #24): the headings printed on a creature card
// are the settings' headings, trimmed; a section has its heading only when it
// has text (SCAR-019: tested at a value other than the default).
import {describe, expect, it} from 'vitest';
import {cardSheetTypst} from '../../src/core/card/sheet';
import type {CreatureCard} from '../../src/core/creature/read';
import {DEFAULT_SHEET} from '../../src/core/sheet/layout';
import {DEFAULT_SIZES} from '../../src/core/skill/settings';
import {compileWithFacts} from '../support/typst-node';
import {FIT_LABEL} from '../../src/core/skill/fit';
import {openPdf} from '../support/pdf/reader';
import {pageRuns} from '../support/pdf/text';
import {runText} from '../support/card-pdf';

const para = (text: string) => ({
  kind: 'paragraph' as const,
  runs: [{text}],
});
const card = (over: Partial<CreatureCard>): CreatureCard => ({
  kind: 'creature',
  path: 'c/Plain.md',
  name: 'Plain',
  properties: {},
  instincts: [para('Run.')],
  actions: [para('Bite.')],
  signs: [para('Rings.')],
  statblock: null,
  ...over,
});
const textOf = async (c: CreatureCard, headings: object): Promise<string> => {
  const r = cardSheetTypst([c], DEFAULT_SHEET, DEFAULT_SIZES, {
    instinctsHeading: 'Instinct',
    actionsHeading: ' Moves ',
    signsHeading: 'Tracks',
    ...headings,
  });
  if (!r.ok) throw new Error(r.message);
  const {pdf, diagnostics} = await compileWithFacts(
    r.source,
    FIT_LABEL,
    r.files,
  );
  expect(diagnostics).toEqual([]);
  return (pageRuns(openPdf(pdf))[0] ?? []).map(runText).join(' ');
};

describe('US-004 AC-13: the headings on the card are the settings', () => {
  it('other words are printed, trimmed; the defaults are not', async () => {
    const text = await textOf(card({}), {});
    for (const w of ['Instinct', 'Moves', 'Tracks'])
      expect(text, w).toContain(w);
    for (const w of ['Behaviour', 'Actions', 'Signs'])
      expect(text, w).not.toContain(w);
  });
  it('a section without blocks has no heading', async () => {
    const text = await textOf(card({signs: [], instincts: []}), {});
    expect(text).toContain('Moves');
    expect(text).not.toContain('Instinct');
    expect(text).not.toContain('Tracks');
  });
});
