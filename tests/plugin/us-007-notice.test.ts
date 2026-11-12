// US-007 AC-12, D11: a refused run (a setting is missing or wrong) names the
// setting, the place to change it in Obsidian's settings, and the file's path;
// the run's other notices and the runner without the file's path are as before.
// Red until the tickets.
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS} from '../../src/core/run/settings';
import {createCardsRunner} from '../../src/plugin/runner';

const NOTE_DEPS = {
  vaultRoot: () => '/v',
  readNote: async () => '',
  resolve: () => null,
  notesNamed: () => [],
  notesBelow: () => [],
  compile: async () => ({pdf: null, facts: []}),
  isFile: async () => false,
  writerFor: () => ({
    exists: async () => false,
    writeBytes: async () => undefined,
    writeText: async () => undefined,
    ensureFolder: async () => undefined,
    isFile: async () => false,
  }),
  confirmReplace: async () => true,
};
const FILE = '/v/.obsidian/plugins/game-card-creator/data.json';

describe('US-007 AC-12: the refusal notice', () => {
  it('names the setting, "Settings → Game Card Creator" and the file', async () => {
    const notices: string[] = [];
    const runner = createCardsRunner({
      ...NOTE_DEPS,
      settings: async () => DEFAULT_CARDS,
      settingsFile: () => FILE,
      notice: (t: string) => void notices.push(t),
    } as never);
    await runner.runDeck({path: 'Deck.md', name: 'Deck'});
    expect(notices).toEqual([
      `Cannot make cards: Output folder is empty; Kind rules: add at least one rule (a folder and a kind)\nSee Settings → Game Card Creator (file: ${FILE})`,
    ]);
  });
  it('the refusal of an output folder that is a file names them too', async () => {
    const notices: string[] = [];
    const runner = createCardsRunner({
      ...NOTE_DEPS,
      isFile: async () => true,
      settings: async () => ({
        ...DEFAULT_CARDS,
        outputFolder: '/out',
        kindRules: [{folder: 'Skills', kind: 'skill' as const}],
      }),
      settingsFile: () => FILE,
      notice: (t: string) => void notices.push(t),
    } as never);
    await runner.runDeck({path: 'Deck.md', name: 'Deck'});
    expect(notices).toEqual([
      `Cannot make cards: output folder "/out" is a file\nSee Settings → Game Card Creator (file: ${FILE})`,
    ]);
  });
  it('without the file path the notice is as before; a run with no PDF has no suffix', async () => {
    const notices: string[] = [];
    const bare = createCardsRunner({
      ...NOTE_DEPS,
      settings: async () => DEFAULT_CARDS,
      notice: (t: string) => void notices.push(t),
    } as never);
    await bare.runDeck({path: 'Deck.md', name: 'Deck'});
    expect(notices[0]).not.toContain('Settings →');
    const other: string[] = [];
    const runner = createCardsRunner({
      ...NOTE_DEPS,
      settings: async () => ({
        ...DEFAULT_CARDS,
        outputFolder: '/out',
        kindRules: [{folder: 'Skills', kind: 'skill' as const}],
      }),
      settingsFile: () => FILE,
      readNote: async () => '- [[Gone]]',
      notice: (t: string) => void other.push(t),
    } as never);
    await runner.runDeck({path: 'Deck.md', name: 'Deck'});
    expect(other).toEqual(['There are no cards to print']);
  });
});
