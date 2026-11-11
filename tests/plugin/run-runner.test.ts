// US-005 AC-4, AC-5, AC-7, AC-8, AC-9: the runner that the commands call, with
// fake dependencies that log their calls. Expected values from the story.
// Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {createCardCommands} from '../../src/plugin/commands';
import {createCardsRunner} from '../../src/plugin/runner';

const SETTINGS: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [{folder: 'skills', kind: 'skill'}],
  outputFolder: '/out',
};
const NOTES: Record<string, string> = {
  'Opening Deck.md': '- [[Reed Sweep]]\n- [[Plain]]\n',
  'skills/Reed Sweep.md': '---\ntags: []\n---\nSweep text.\n',
  'skills/Plain.md': '---\ntags: []\n---\nPlain text.\n',
};

/** Fake dependencies with logs; `files` is what exists in the output folder. */
function setup(
  over: {
    settings?: CardsSettings;
    files?: string[];
    confirm?: boolean;
    pdf?: Uint8Array | null;
    isFile?: boolean;
    compile?: () => Promise<{pdf: Uint8Array | null; facts: unknown[]}>;
  } = {},
) {
  const log = {
    settings: 0,
    reads: [] as string[],
    compiles: 0,
    writes: [] as [string, string][],
    ensured: 0,
    confirms: [] as string[][],
    notices: [] as string[],
  };
  const state = {
    settings: over.settings ?? SETTINGS,
    release: null as null | (() => void),
  };
  const files = new Set(over.files ?? []);
  const deps = {
    settings: async () => {
      log.settings++;
      return state.settings;
    },
    vaultRoot: () => '/v',
    readNote: async (p: string) => {
      log.reads.push(p);
      if (state.release !== null)
        await new Promise<void>((r) => (state.release = r));
      const t = NOTES[p];
      if (t === undefined) throw new Error('no such note');
      return t;
    },
    resolve: (t: string) => {
      const p = [`skills/${t}.md`, `${t}.md`].find(
        (c) => NOTES[c] !== undefined,
      );
      return p === undefined ? null : {path: p, isNote: true};
    },
    notesNamed: (n: string) =>
      Object.keys(NOTES).filter((k) => k.endsWith(`/${n}.md`)),
    notesBelow: (folder: string) =>
      Object.keys(NOTES).filter((k) => k.startsWith(`${folder}/`)),
    compile: async () => {
      log.compiles++;
      if (over.compile) return over.compile();
      return {
        pdf: over.pdf === undefined ? new Uint8Array([1, 2]) : over.pdf,
        facts: [
          {i: 0, size: 7, fits: true},
          {i: 1, size: 7, fits: true},
        ],
      };
    },
    isFile: async () => over.isFile ?? false,
    writerFor: (folder: string) => ({
      exists: async (p: string) => files.has(p),
      writeBytes: async (p: string) => void log.writes.push([p, 'bytes']),
      writeText: async (p: string, t: string) => void log.writes.push([p, t]),
      ensureFolder: async () => void log.ensured++,
      isFile: async () => false,
      root: folder,
    }),
    confirmReplace: async (names: string[]) => {
      log.confirms.push(names);
      return over.confirm ?? true;
    },
    notice: (t: string) => void log.notices.push(t),
  };
  return {runner: createCardsRunner(deps as never), log, state, files, deps};
}

describe('US-005 AC-4, AC-8, AC-9: a run from a deck note', () => {
  it('writes the PDF and the warnings file below the folder and says what it made', async () => {
    const {runner, log} = setup();
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.reads).toEqual([
      'Opening Deck.md',
      'skills/Reed Sweep.md',
      'skills/Plain.md',
    ]);
    expect(log.compiles).toBe(1);
    expect(log.ensured).toBe(1);
    expect(log.writes).toEqual([
      ['/out/Opening Deck cards.pdf', 'bytes'],
      [
        '/out/Opening Deck cards warnings.md',
        '# Opening Deck cards: warnings\n\nNo warnings.\n',
      ],
    ]);
    expect(log.notices).toEqual([
      '2 cards on 1 page, 0 warnings. Written to /out',
    ]);
  });
  it('singular counts: 1 card on 1 page, 1 warning', async () => {
    const {runner, log, deps} = setup();
    deps.compile = async () => ({
      pdf: new Uint8Array([1]),
      facts: [{i: 0, size: 7, fits: true}],
    });
    NOTES['Single Deck.md'] = '- [[Reed Sweep]]\n- [[Gone]]\n';
    await runner.runDeck({path: 'Single Deck.md', name: 'Single Deck'});
    expect(log.notices).toEqual([
      '1 card on 1 page, 1 warning. Written to /out',
    ]);
  });
  it('the warnings of the deck and the cards are in the file, in order', async () => {
    const {runner, log} = setup();
    NOTES['Warn Deck.md'] = '- [[Gone]]\n- [[Reed Sweep]]\n';
    await runner.runDeck({path: 'Warn Deck.md', name: 'Warn Deck'});
    const warnings = log.writes[1]![1];
    expect(warnings).toContain('- DECK_LINK_MISSING — Warn Deck.md — Gone\n');
  });
  it("the deck's warnings come before the cards' in the file", async () => {
    const {runner, log} = setup();
    NOTES['skills/Pic.md'] = '---\ntags: []\n---\n![](pics/a.png)\n\nText.\n';
    NOTES['Order Deck.md'] = '- [[Pic]]\n- [[Gone]]\n';
    await runner.runDeck({path: 'Order Deck.md', name: 'Order Deck'});
    const text = log.writes[1]![1];
    expect(text.indexOf('DECK_LINK_MISSING')).toBeGreaterThan(0);
    expect(text.indexOf('SKILL_IMAGE_OMITTED')).toBeGreaterThan(
      text.indexOf('DECK_LINK_MISSING'),
    );
    delete NOTES['skills/Pic.md']; // the shared vault map stays as it was
  });
  it('a Windows output folder gets backslash paths', async () => {
    const {runner, log} = setup({
      settings: {...SETTINGS, outputFolder: 'C:\\out\\'},
    });
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.writes.map((w) => w[0])).toEqual([
      'C:\\out\\Opening Deck cards.pdf',
      'C:\\out\\Opening Deck cards warnings.md',
    ]);
  });
  it('a run with no PDF writes nothing and shows the message', async () => {
    const {runner, log} = setup({pdf: null});
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.writes).toEqual([]);
    expect(log.ensured).toBe(0);
    expect(log.notices).toHaveLength(1);
  });
  it('a deck with nothing to print writes nothing and says so', async () => {
    const {runner, log} = setup();
    NOTES['Empty Deck.md'] = 'No links here.\n';
    await runner.runDeck({path: 'Empty Deck.md', name: 'Empty Deck'});
    expect(log.writes).toEqual([]);
    expect(log.notices).toEqual(['There are no cards to print']);
  });
});

describe('US-005 AC-9: refusals come before anything else (SCAR-014, SCAR-033)', () => {
  it('no output folder and no kind rule: a notice naming the settings, nothing read, asked or written', async () => {
    const {runner, log} = setup({settings: DEFAULT_CARDS});
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.reads).toEqual([]);
    expect(log.confirms).toEqual([]);
    expect(log.writes).toEqual([]);
    expect(log.notices).toHaveLength(1);
    expect(log.notices[0]).toMatch(/output folder/i);
    expect(log.notices[0]).toMatch(/kind rules/i);
  });
  it('a refused output folder: a notice with the value, nothing read', async () => {
    const {runner, log} = setup({
      settings: {...SETTINGS, outputFolder: '~/out'},
    });
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.reads).toEqual([]);
    expect(log.notices[0]).toContain('~/out');
  });
  it('an output folder that is a file: refused before anything is read', async () => {
    const {runner, log} = setup({isFile: true});
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.reads).toEqual([]);
    expect(log.notices[0]).toMatch(/file/i);
  });
});

describe('US-005 AC-7: an existing file', () => {
  it('asks once, naming both files, before anything is read; Replace goes on', async () => {
    const {runner, log} = setup({
      files: ['/out/Opening Deck cards warnings.md'],
      confirm: true,
    });
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.confirms).toEqual([
      ['/out/Opening Deck cards.pdf', '/out/Opening Deck cards warnings.md'],
    ]);
    expect(log.reads[0]).toBe('Opening Deck.md');
    expect(log.writes).toHaveLength(2);
  });
  it('Cancel: nothing is read or written', async () => {
    const {runner, log} = setup({
      files: ['/out/Opening Deck cards.pdf'],
      confirm: false,
    });
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.confirms).toHaveLength(1);
    expect(log.reads).toEqual([]);
    expect(log.compiles).toBe(0);
    expect(log.writes).toEqual([]);
    expect(log.ensured).toBe(0);
  });
  it('no existing file: no question', async () => {
    const {runner, log} = setup();
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.confirms).toEqual([]);
  });
});

describe('US-005 AC-2, AC-6: a run from the file explorer', () => {
  it('a chosen folder: its notes in order, named after the folder', async () => {
    const {runner, log} = setup();
    await runner.runSelection([{path: 'skills', isFolder: true}]);
    expect(log.reads).toEqual(['skills/Plain.md', 'skills/Reed Sweep.md']);
    expect(log.writes.map((w) => w[0])).toEqual([
      '/out/skills cards.pdf',
      '/out/skills cards warnings.md',
    ]);
  });
  it('several choices are named Cards', async () => {
    const {runner, log} = setup();
    await runner.runSelection([
      {path: 'skills/Plain.md', isFolder: false},
      {path: 'skills/Reed Sweep.md', isFolder: false},
    ]);
    expect(log.writes.map((w) => w[0])).toEqual([
      '/out/Cards cards.pdf',
      '/out/Cards cards warnings.md',
    ]);
  });
});

describe('US-005 AC-9: one run at a time, settings read at run time', () => {
  it('a second run while one is running is refused with a notice; afterwards runs work again', async () => {
    const {runner, log, state} = setup();
    state.release = () => undefined; // the first read of a note waits
    const first = runner.runDeck({
      path: 'Opening Deck.md',
      name: 'Opening Deck',
    });
    await new Promise((r) => setTimeout(r, 10));
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.notices).toHaveLength(1);
    expect(log.notices[0]).toMatch(/already/i);
    expect(runner.isRunning()).toBe(true);
    state.release?.();
    state.release = null;
    await first;
    expect(runner.isRunning()).toBe(false);
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(log.writes.length).toBeGreaterThanOrEqual(2);
  });
  it('a failing run frees the guard and says so', async () => {
    const {runner, log} = setup({
      compile: async () => {
        throw new Error('boom');
      },
    });
    await runner.runDeck({path: 'Opening Deck.md', name: 'Opening Deck'});
    expect(runner.isRunning()).toBe(false);
    expect(log.notices.join(' ')).toContain('boom');
  });
  it('the settings are read when the run starts, not when the menu was built (SCAR-016)', async () => {
    const {runner, log, state} = setup();
    const commands = createCardCommands(runner);
    const entries = commands.menuEntries([{path: 'skills', isFolder: true}]);
    state.settings = {...SETTINGS, outputFolder: '/other'};
    await entries[0]!.run();
    expect(log.writes[0]![0]).toBe('/other/skills cards.pdf');
  });
});

describe('US-005 AC-9: the commands (SCAR-022, SCAR-031)', () => {
  it('building a menu entry reads nothing', () => {
    const {runner, log} = setup();
    const entries = createCardCommands(runner).menuEntries([
      {path: 'skills', isFolder: true},
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.title).toBe('Create cards');
    expect(log).toMatchObject({
      settings: 0,
      reads: [],
      compiles: 0,
      writes: [],
    });
  });
  it('no entry for no choice', () => {
    const {runner} = setup();
    expect(createCardCommands(runner).menuEntries([])).toEqual([]);
  });
  it('the deck command is offered only for a Markdown note, and building it reads nothing', async () => {
    const {runner, log} = setup();
    const c = createCardCommands(runner).deckCommand;
    expect(c.id).toBe('create-cards-from-deck-note');
    expect(c.name).toBe('Create cards from this deck note');
    expect(
      c.check({path: 'Opening Deck.md', name: 'Opening Deck', extension: 'md'}),
    ).toBe(true);
    expect(c.check({path: 'pic.png', name: 'pic', extension: 'png'})).toBe(
      false,
    );
    expect(c.check(null)).toBe(false);
    expect(c.check({path: 'Deck.MD', name: 'Deck', extension: 'MD'})).toBe(
      true,
    );
    expect(log).toMatchObject({settings: 0, reads: []});
    await c.run({
      path: 'Opening Deck.md',
      name: 'Opening Deck',
      extension: 'md',
    });
    expect(log.reads[0]).toBe('Opening Deck.md');
  });
});
