// US-013 AC-11 (D8): the run's notices with ✅ and ❌; a refusal names the first section with
// a problem. The done notice's other wording is pinned in run-runner.test.ts (amended).
// Red until the code ticket (G2, 2026-11-17).
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {createCardsRunner} from '../../src/plugin/runner';

const FILE = '/v/.obsidian/plugins/game-card-creator/data.json';
const READY: CardsSettings = {
  ...DEFAULT_CARDS,
  outputFolder: '/out',
  kindRules: [{folder: 'skills', kind: 'skill'}],
};

function runnerWith(over: {
  settings?: CardsSettings;
  exists?: boolean;
  confirm?: boolean;
  compile?: () => Promise<unknown>;
}) {
  const notices: string[] = [];
  const runner = createCardsRunner({
    settings: async () => over.settings ?? READY,
    settingsFile: () => FILE,
    vaultRoot: () => '/v',
    readNote: async () => '---\ntags: []\n---\nText.\n',
    resolve: () => ({path: 'skills/A.md', isNote: true}),
    notesNamed: () => [],
    notesBelow: () => ['skills/A.md'],
    compile:
      over.compile ??
      (async () => ({
        pdf: new Uint8Array([1]),
        facts: [{i: 0, size: 7, fits: true}],
      })),
    isFile: async () => false,
    writerFor: () => ({
      exists: async () => over.exists ?? false,
      writeBytes: async () => undefined,
      writeText: async () => undefined,
      ensureFolder: async () => undefined,
      isFile: async () => false,
    }),
    confirmReplace: async () => over.confirm ?? true,
    notice: (t: string) => void notices.push(t),
  } as never);
  return {runner, notices};
}

describe('US-013 AC-11: notices', () => {
  it('a finished run starts with ✅ Created', async () => {
    const {runner, notices} = runnerWith({});
    await runner.runSelection([{path: 'skills', isFolder: true}]);
    expect(notices).toEqual([
      '✅ Created 1 card on 1 page, 0 warnings. Written to /out',
    ]);
  });
  it('Cancel at the replace question: ❌ Card run cancelled.', async () => {
    const {runner, notices} = runnerWith({exists: true, confirm: false});
    await runner.runSelection([{path: 'skills', isFolder: true}]);
    expect(notices).toEqual(['❌ Card run cancelled.']);
  });
  it('an exception: ❌ Card run failed: <message>', async () => {
    const {runner, notices} = runnerWith({
      compile: async () => {
        throw new Error('worker gone');
      },
    });
    await runner.runSelection([{path: 'skills', isFolder: true}]);
    expect(notices).toEqual(['❌ Card run failed: worker gone']);
  });
  it('a run that gives no PDF: ❌ Card run failed: and the run’s message', async () => {
    const {runner, notices} = runnerWith({
      compile: async () => ({pdf: null, facts: []}),
    });
    await runner.runSelection([{path: 'skills', isFolder: true}]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatch(/^❌ Card run failed: \S/);
  });
  it('a refusal for missing kind rules names the section "Which note is which card"', async () => {
    const {runner, notices} = runnerWith({settings: {...READY, kindRules: []}});
    await runner.runSelection([{path: 'skills', isFolder: true}]);
    expect(notices).toEqual([
      `Cannot make cards: Kind rules: add at least one rule (a folder and a kind)\nSee Settings → Which note is which card (file: ${FILE})`,
    ]);
  });
  it('a refusal for a card width of 10 mm names "Page and text size"', async () => {
    const {runner, notices} = runnerWith({
      settings: {...READY, sheet: {...READY.sheet, cardWidth: 10}},
    });
    await runner.runSelection([{path: 'skills', isFolder: true}]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatch(
      /^Cannot make cards: .*\nSee Settings → Page and text size \(file: /s,
    );
  });
});
