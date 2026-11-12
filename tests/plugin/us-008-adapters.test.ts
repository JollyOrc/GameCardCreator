// US-008 AC-4 to AC-6: the Obsidian side of the runner over structural fakes of
// the parts of Obsidian's API the story names (read from its type definitions
// at G0): the vault access, the check callback, the menus, the refusal that
// names the settings file, and the confirmation modal. Red until the tickets.
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS} from '../../src/core/run/settings';
import {createCardCommands} from '../../src/plugin/commands';
import {createCardsRunner} from '../../src/plugin/runner';
import {FakeEl} from '../support/fake-dom';

const OBSIDIAN_DEPS = '../../src/plugin/obsidian-deps';
const UI = '../../src/plugin/ui';
const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)) as T;

interface FakeFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
}
interface FakeFolder {
  path: string;
  name: string;
  children: (FakeFile | FakeFolder)[];
}
const file = (path: string): FakeFile => {
  const name = path.replace(/^.*\//, '');
  const dot = name.lastIndexOf('.');
  return {
    path,
    name,
    basename: dot < 0 ? name : name.slice(0, dot),
    extension: dot < 0 ? '' : name.slice(dot + 1),
  };
};
const folder = (
  path: string,
  children: (FakeFile | FakeFolder)[],
): FakeFolder => ({path, name: path.replace(/^.*\//, ''), children});

const TREE = folder('', [
  folder('Skills', [
    file('Skills/Reed Sweep.md'),
    file('Skills/pic.png'),
    folder('Skills/Sub', [file('Skills/Sub/Deep.md')]),
  ]),
  folder('Spells', [file('Spells/Reed Whisper.md'), file('Spells/dup.md')]),
  file('Decks/Deck.md'),
  file('Skills/dup.md'),
]);
const flat = (f: FakeFolder | FakeFile): FakeFile[] =>
  'children' in f ? f.children.flatMap(flat) : [f];
const find = (path: string): FakeFile | FakeFolder | null => {
  const walk = (f: FakeFile | FakeFolder): FakeFile | FakeFolder | null =>
    f.path === path
      ? f
      : 'children' in f
        ? (f.children.map(walk).find((x) => x !== null) ?? null)
        : null;
  return walk(TREE);
};

/** A fake app with logs; `cachedRead` is deliberately missing (the note's text is `read`). */
function fakeApp(over: {base?: string | null} = {}) {
  const log = {read: [] as string[], lookups: [] as [string, string][]};
  const app = {
    vault: {
      read: async (f: FakeFile) => {
        log.read.push(f.path);
        return `text of ${f.path}`;
      },
      getMarkdownFiles: () => flat(TREE).filter((f) => f.extension === 'md'),
      getAbstractFileByPath: (p: string) => find(p),
      adapter: over.base === null ? {} : {getBasePath: () => over.base ?? '/v'},
    },
    metadataCache: {
      getFirstLinkpathDest: (target: string, from: string) => {
        log.lookups.push([target, from]);
        return (
          flat(TREE).find(
            (f) =>
              f.basename === target ||
              f.name === target || // Obsidian resolves a link by file name too (corrected at #14)
              f.path === target ||
              f.path === `${target}.md`,
          ) ?? null
        );
      },
    },
  };
  return {app, log};
}

describe('US-008 AC-5: vaultAccess', () => {
  it("readNote reads the note's own text with vault.read, not the cache", async () => {
    const {vaultAccess} = await load<{
      vaultAccess(a: unknown): {readNote(p: string): Promise<string>};
    }>(OBSIDIAN_DEPS);
    const {app, log} = fakeApp();
    expect(await vaultAccess(app).readNote('Skills/Reed Sweep.md')).toBe(
      'text of Skills/Reed Sweep.md',
    );
    expect(log.read).toEqual(['Skills/Reed Sweep.md']);
  });
  it('readNote rejects for a path that is no file or does not exist, naming it', async () => {
    const {vaultAccess} = await load<{
      vaultAccess(a: unknown): {readNote(p: string): Promise<string>};
    }>(OBSIDIAN_DEPS);
    const {app, log} = fakeApp();
    await expect(vaultAccess(app).readNote('Nope.md')).rejects.toThrow(
      'Nope.md',
    );
    await expect(vaultAccess(app).readNote('Skills')).rejects.toThrow('Skills');
    expect(log.read).toEqual([]);
  });
  it('resolve asks getFirstLinkpathDest with the deck note as the place; a note, a non-note file and nothing', async () => {
    const {vaultAccess} = await load<{
      vaultAccess(a: unknown): {
        resolve(
          t: string,
          from: string,
        ): {path: string; isNote: boolean} | null;
      };
    }>(OBSIDIAN_DEPS);
    const {app, log} = fakeApp();
    const v = vaultAccess(app);
    expect(v.resolve('Reed Whisper', 'Decks/Deck.md')).toEqual({
      path: 'Spells/Reed Whisper.md',
      isNote: true,
    });
    expect(v.resolve('pic.png', 'Decks/Deck.md')).toEqual({
      path: 'Skills/pic.png',
      isNote: false,
    });
    expect(v.resolve('Gone', 'Decks/Deck.md')).toBeNull();
    expect(v.resolve('Skills', 'Decks/Deck.md')).toBeNull(); // a folder never resolves
    expect(log.lookups).toEqual([
      ['Reed Whisper', 'Decks/Deck.md'],
      ['pic.png', 'Decks/Deck.md'],
      ['Gone', 'Decks/Deck.md'],
      ['Skills', 'Decks/Deck.md'],
    ]);
  });
  it('notesNamed lists the Markdown files with that base name, sorted', async () => {
    const {vaultAccess} = await load<{
      vaultAccess(a: unknown): {notesNamed(n: string): string[]};
    }>(OBSIDIAN_DEPS);
    const {app} = fakeApp();
    expect(vaultAccess(app).notesNamed('dup')).toEqual([
      'Skills/dup.md',
      'Spells/dup.md',
    ]);
    expect(vaultAccess(app).notesNamed('pic')).toEqual([]); // not a Markdown file
    expect(vaultAccess(app).notesNamed('nothing')).toEqual([]);
  });
  it('notesBelow lists the files below a folder, at any depth; a file or nothing gives none', async () => {
    const {vaultAccess} = await load<{
      vaultAccess(a: unknown): {notesBelow(f: string): string[]};
    }>(OBSIDIAN_DEPS);
    const {app} = fakeApp();
    expect(vaultAccess(app).notesBelow('Skills').sort()).toEqual([
      'Skills/Reed Sweep.md',
      'Skills/Sub/Deep.md',
      'Skills/pic.png',
    ]);
    expect(vaultAccess(app).notesBelow('Skills/Reed Sweep.md')).toEqual([]);
    expect(vaultAccess(app).notesBelow('Nope')).toEqual([]);
  });
  it("vaultRoot is the adapter's base path; without one (not a desktop vault) it throws", async () => {
    const {vaultAccess} = await load<{
      vaultAccess(a: unknown): {vaultRoot(): string};
    }>(OBSIDIAN_DEPS);
    expect(vaultAccess(fakeApp({base: '/Users/x/Vault'}).app).vaultRoot()).toBe(
      '/Users/x/Vault',
    );
    expect(() => vaultAccess(fakeApp({base: null}).app).vaultRoot()).toThrow(
      /desktop/i,
    );
  });
});

/** A runner over a recording stand-in; every call that reads or writes is logged. */
function runner() {
  const log = {
    settings: 0,
    reads: 0,
    notices: [] as string[],
    selections: [] as unknown[],
  };
  const stub = {
    runDeck: async (d: unknown) => void log.selections.push(['deck', d]),
    runSelection: async (items: unknown) =>
      void log.selections.push(['selection', items]),
    isRunning: () => false,
  };
  return {log, commands: createCardCommands(stub)};
}

describe('US-008 AC-5: the command and the menus', () => {
  it('toCheckCallback: checking answers whether the active file is a Markdown note and runs nothing; not checking runs it', async () => {
    const {toCheckCallback} = await load<{
      toCheckCallback(
        c: unknown,
        active: () => FakeFile | null,
      ): (checking: boolean) => boolean;
    }>(UI);
    const {log, commands} = runner();
    let active: FakeFile | null = file('Decks/Deck.md');
    const cb = toCheckCallback(commands.deckCommand, () => active);
    expect(cb(true)).toBe(true);
    expect(log.selections).toEqual([]);
    expect(cb(false)).toBe(true);
    expect(log.selections).toEqual([
      ['deck', {path: 'Decks/Deck.md', name: 'Deck'}],
    ]);
    active = file('pics/a.png');
    expect(cb(true)).toBe(false);
    expect(cb(false)).toBe(false);
    expect(log.selections).toHaveLength(1);
    active = null;
    expect(cb(true)).toBe(false);
  });
  it('selectionOf: a file is a file, a folder (has children) is a folder', async () => {
    const {selectionOf} = await load<{
      selectionOf(f: unknown[]): {path: string; isFolder: boolean}[];
    }>(UI);
    expect(selectionOf([file('A.md'), folder('Skills', [])])).toEqual([
      {path: 'A.md', isFolder: false},
      {path: 'Skills', isFolder: true},
    ]);
  });
  it('the menus add one item with the title and a click that runs the selection; building reads nothing', async () => {
    const {onFileMenu, onFilesMenu} = await load<{
      onFileMenu(c: unknown): (menu: unknown, f: unknown) => void;
      onFilesMenu(c: unknown): (menu: unknown, f: unknown[]) => void;
    }>(UI);
    const {log, commands} = runner();
    const items: {title: string; click: (() => void) | null}[] = [];
    const menu = {
      addItem: (cb: (item: unknown) => void) => {
        const rec = {title: '', click: null as (() => void) | null};
        const item = {
          setTitle: (t: string) => ((rec.title = t), item),
          setIcon: () => item,
          onClick: (f: () => void) => ((rec.click = f), item),
        };
        cb(item);
        items.push(rec);
      },
    };
    onFileMenu(commands)(menu, folder('Skills', []));
    onFilesMenu(commands)(menu, [file('A.md'), file('B.md')]);
    expect(items.map((i) => i.title)).toEqual(['Create cards', 'Create cards']);
    expect(log.selections).toEqual([]); // nothing ran while building
    items[0]!.click!();
    items[1]!.click!();
    await Promise.resolve();
    expect(log.selections).toEqual([
      ['selection', [{path: 'Skills', isFolder: true}]],
      [
        'selection',
        [
          {path: 'A.md', isFolder: false},
          {path: 'B.md', isFolder: false},
        ],
      ],
    ]);
  });
});

describe('US-008 AC-4: a refusal names the settings file', () => {
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
  it("the notice has the setting and the file's path", async () => {
    const notices: string[] = [];
    const r = createCardsRunner({
      ...NOTE_DEPS,
      settings: async () => DEFAULT_CARDS,
      settingsFile: () => '/v/.obsidian/plugins/game-card-creator/data.json',
      notice: (t: string) => void notices.push(t),
    } as never);
    await r.runDeck({path: 'Deck.md', name: 'Deck'});
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatch(/output folder/i);
    expect(notices[0]).toContain(
      '/v/.obsidian/plugins/game-card-creator/data.json',
    );
  });
  it('without the dependency the notice is as before (no path)', async () => {
    const notices: string[] = [];
    const r = createCardsRunner({
      ...NOTE_DEPS,
      settings: async () => DEFAULT_CARDS,
      notice: (t: string) => void notices.push(t),
    } as never);
    await r.runDeck({path: 'Deck.md', name: 'Deck'});
    expect(notices[0]).not.toMatch(/Settings file:/);
  });
  it('only a refusal for a setting gets the path: a run with no PDF does not', async () => {
    const notices: string[] = [];
    const r = createCardsRunner({
      ...NOTE_DEPS,
      settings: async () => ({
        ...DEFAULT_CARDS,
        outputFolder: '/out',
        kindRules: [{folder: 'Skills', kind: 'skill' as const}],
      }),
      settingsFile: () => '/path/data.json',
      readNote: async () => '- [[Gone]]',
      notice: (t: string) => void notices.push(t),
    } as never);
    await r.runDeck({path: 'Deck.md', name: 'Deck'});
    expect(notices).toEqual(['There are no cards to print']);
  });
});

describe('US-008 AC-6: the confirmation modal', () => {
  const FILES = ['/out/Deck cards.pdf', '/out/Deck cards warnings.md'];
  /** A fake Modal base that records open and close; `open()` calls `onOpen`. */
  class FakeModal {
    contentEl = new FakeEl();
    modalEl = new FakeEl();
    closed = 0;
    static made: FakeModal[] = [];
    constructor(public app: unknown) {
      FakeModal.made.push(this);
    }
    open(): void {
      (this as unknown as {onOpen(): void}).onOpen();
    }
    close(): void {
      this.closed++;
      (this as unknown as {onClose(): void}).onClose();
    }
  }
  async function open() {
    const {confirmReplaceWith} = await load<{
      confirmReplaceWith(
        base: unknown,
      ): (app: unknown, files: string[]) => Promise<boolean>;
    }>(UI);
    const answer = confirmReplaceWith(FakeModal)({}, FILES);
    const modal = FakeModal.made[FakeModal.made.length - 1]!;
    const buttons = () =>
      modal.contentEl.all().filter((e) => e.tag === 'button');
    let settled: boolean | null = null;
    void answer.then((v) => (settled = v));
    return {modal, answer, buttons, settled: () => settled};
  }
  it('draws both files, Replace and Cancel by their own names, and puts the focus on Cancel', async () => {
    const {modal, buttons} = await open();
    const text = modal.contentEl
      .all()
      .map((e) => e.text)
      .join('\n');
    for (const f of FILES) expect(text).toContain(f);
    expect(buttons().map((b) => b.text)).toEqual(['Replace', 'Cancel']);
    expect(buttons()[1]!.focused).toBe(true);
    expect(buttons()[0]!.focused).toBe(false);
  });
  it.each([
    ['Escape', {key: 'Escape'}, false],
    ['Enter on the default focus (Cancel)', {key: 'Enter'}, false],
  ])('%s answers %s', async (_n, event, expected) => {
    const {modal, answer} = await open();
    modal.contentEl.fire('keydown', event);
    expect(await answer).toBe(expected);
    expect(modal.closed).toBeGreaterThan(0);
  });
  it('Enter after the focus moved to Replace answers true', async () => {
    const {modal, buttons, answer} = await open();
    buttons()[0]!.focus();
    modal.contentEl.fire('keydown', {key: 'Enter'});
    expect(await answer).toBe(true);
  });
  it('a click on Replace answers true, a click on Cancel false', async () => {
    const a = await open();
    a.buttons()[0]!.click();
    expect(await a.answer).toBe(true);
    const b = await open();
    b.buttons()[1]!.click();
    expect(await b.answer).toBe(false);
  });
  it('Enter during an input-method composition does nothing; the dialog stays open', async () => {
    const {modal, buttons} = await open();
    buttons()[0]!.focus();
    modal.contentEl.fire('keydown', {key: 'Enter', isComposing: true});
    await Promise.resolve();
    expect(modal.closed).toBe(0);
  });
  it('closing in any other way (the close button, a click outside) is Cancel', async () => {
    const {modal, answer} = await open();
    modal.close();
    expect(await answer).toBe(false);
  });
  it('the first answer counts: a click and then a close do not change it', async () => {
    const {modal, buttons, answer} = await open();
    buttons()[0]!.click();
    modal.close();
    expect(await answer).toBe(true);
  });
});
