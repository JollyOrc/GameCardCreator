// US-004 AC-13 with ticket #21 (SCAR-017, SCAR-023): until the creature card is
// made (ticket #26), a note under a rule of the kind creature must never become
// a spell card. Removed with its guard in `run.ts` when #26 lands (the cards of
// `run-creature` replace it).
import {describe, expect, it} from 'vitest';
import {runCards} from '../../src/core/run/run';
import {DEFAULT_CARDS} from '../../src/core/run/settings';
import {EXAMPLE_NOTE} from '../support/skill-fixtures';

describe('US-004 #21: a creature rule gives no card yet', () => {
  it('a creature note gives one warning and no card; the skill note beside it is made', async () => {
    const compiled: string[] = [];
    const r = await runCards(
      ['Creatures/Fen Hare.md', 'skills/Reed Sweep.md'],
      {
        ...DEFAULT_CARDS,
        kindRules: [
          {folder: 'Creatures', kind: 'creature'},
          {folder: 'skills', kind: 'skill'},
        ],
        outputFolder: '/tmp/out',
      },
      {
        read: async (p) => (p.startsWith('skills') ? EXAMPLE_NOTE : 'Fen.'),
        compile: async (source: string) => {
          compiled.push(source);
          return {
            pdf: new Uint8Array([37, 80, 68, 70]),
            facts: [{i: 0, size: 7, fits: true}],
          };
        },
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(
      r.warnings.filter((w) => w.path === 'Creatures/Fen Hare.md'),
    ).toEqual([
      {
        code: 'CARD_KIND_UNKNOWN',
        path: 'Creatures/Fen Hare.md',
        detail: 'creature cards are not made yet',
      },
    ]);
    expect(compiled).toHaveLength(1);
    expect(compiled[0]).not.toContain('Fen');
  });
});
