// US-007 AC-2, AC-8, D16: the status line of the main page and the line under
// the sheet fields. Expected texts: the story and the decisions; the problems
// are the messages of the existing checks. Red until the tickets.
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {gridLine, statusLine} from '../../src/plugin/settings/status';

const ok: CardsSettings = {
  ...DEFAULT_CARDS,
  outputFolder: '/out/cards',
  kindRules: [
    {folder: 'Skills', kind: 'skill'},
    {folder: 'Spells', kind: 'spell'},
  ],
};

describe('US-007 AC-2, D16: the status line', () => {
  it('ready: the number of rules and the folder', () => {
    expect(statusLine(ok, '/v')).toBe(
      'Ready: 2 kind rules, output folder /out/cards',
    );
  });
  it('one rule is "1 kind rule"', () => {
    expect(
      statusLine({...ok, kindRules: [{folder: 'Skills', kind: 'skill'}]}, '/v'),
    ).toBe('Ready: 1 kind rule, output folder /out/cards');
  });
  it('the folder is shown in its normal form', () => {
    expect(statusLine({...ok, outputFolder: '/out//cards/'}, '/v')).toBe(
      'Ready: 2 kind rules, output folder /out/cards',
    );
  });
  it("not ready: every problem on its own line, in the order of the checks, with the checks' messages", () => {
    expect(statusLine(DEFAULT_CARDS, '/v')).toBe(
      'Not ready:\n- Output folder is empty\n- Kind rules: add at least one rule (a folder and a kind)',
    );
  });
  it('problems of the pages show too, after the folder and the rules', () => {
    const s = {
      ...ok,
      kindRules: [],
      sheet: {...ok.sheet, gap: 99},
      skill: {...ok.skill, tagsProperty: ''},
    };
    expect(statusLine(s, '/v')).toBe(
      [
        'Not ready:',
        '- Kind rules: add at least one rule (a folder and a kind)',
        '- gap 99 is outside 0 to 10 mm',
        '- The tags property name is empty',
      ].join('\n'),
    );
  });
  it('a sheet on which no card fits is a problem (a run would refuse it), once', () => {
    const s = {...ok, sheet: {...ok.sheet, cardWidth: 200}};
    expect(statusLine(s, '/v')).toBe(
      'Not ready:\n- No card of 200 x 88 mm fits on the sheet with margin 10 mm',
    );
  });
  it('a sheet setting out of range gives the range message only, not a second grid message', () => {
    const s = {...ok, sheet: {...ok.sheet, margin: 60}};
    expect(statusLine(s, '/v')).toBe(
      'Not ready:\n- margin 60 is outside 0 to 50 mm',
    );
  });
  it('the vault itself as the output folder is a problem', () => {
    expect(statusLine({...ok, outputFolder: '/v'}, '/v')).toBe(
      'Not ready:\n- Output folder "/v" is the vault\'s own folder',
    );
  });
});

describe('US-007 AC-8: the line under the sheet fields', () => {
  it.each([
    [{}, '9 cards per A4 page (3 × 3)'],
    [{margin: 15}, '6 cards per A4 page (2 × 3)'],
    [
      {cardWidth: 100, cardHeight: 140, margin: 5},
      '4 cards per A4 page (2 × 2)',
    ],
    [
      {cardWidth: 200, cardHeight: 200, margin: 5},
      '1 card per A4 page (1 × 1)',
    ],
    [{gap: 10}, '4 cards per A4 page (2 × 2)'],
    [
      {cardWidth: 200},
      'No card of 200 x 88 mm fits on the sheet with margin 10 mm',
    ],
    [{margin: 60}, 'margin 60 is outside 0 to 50 mm'],
  ])('%j gives %s', (over, expected) => {
    expect(gridLine({...DEFAULT_CARDS.sheet, ...over})).toBe(expected);
  });
});
