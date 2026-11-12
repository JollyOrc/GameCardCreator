// US-005 AC-9 (amended 2026-11-12, D7), US-008 AC-5: the deck note in the context menu. For exactly
// one Markdown note the menu has `Create cards` and then `Create cards from this deck note`; a
// folder, a file that is not a note and several chosen items have only `Create cards`. The
// entries only hand over what they were given; building them reads nothing. Red until ticket #20.
import {describe, expect, it} from 'vitest';
import {createCardCommands} from '../../src/plugin/commands';
import {onFileMenu, onFilesMenu} from '../../src/plugin/ui';

/** A runner that records what it was asked to do (nothing is read or written). */
function stub() {
  const log: unknown[] = [];
  const runner = {
    runDeck: async (d: unknown) => void log.push(['deck', d]),
    runSelection: async (items: unknown) => void log.push(['selection', items]),
    isRunning: () => false,
  };
  return {log, commands: createCardCommands(runner)};
}
const note = (path: string) => ({path, isFolder: false});
const titles = (entries: {title: string}[]) => entries.map((e) => e.title);

describe('US-005 AC-9 (D7): the entries for one Markdown note', () => {
  it('Create cards first, Create cards from this deck note second', () => {
    const {commands} = stub();
    expect(
      titles(commands.menuEntries([note('Decks/Opening Deck.md')])),
    ).toEqual(['Create cards', 'Create cards from this deck note']);
  });
  it('the deck entry has the same name as the command palette entry', () => {
    const {commands} = stub();
    expect(commands.menuEntries([note('A.md')])[1]!.title).toBe(
      commands.deckCommand.name,
    );
  });
  it('the first entry runs the selection, the second runs the deck of that note', async () => {
    const {commands, log} = stub();
    const entries = commands.menuEntries([note('Decks/Opening Deck.md')]);
    expect(log).toEqual([]); // building reads and runs nothing
    await entries[0]!.run();
    await entries[1]!.run();
    expect(log).toEqual([
      ['selection', [note('Decks/Opening Deck.md')]],
      ['deck', {path: 'Decks/Opening Deck.md', name: 'Opening Deck'}],
    ]);
  });
  it.each([
    ['Note.md', 'Note'],
    ['a.b.md', 'a.b'],
    ['Decks/Sub/X.MD', 'X'],
    ['Deep/Er/Path/My Deck.md', 'My Deck'],
  ])('%s is the deck %s', async (path, name) => {
    const {commands, log} = stub();
    await commands.menuEntries([note(path)])[1]!.run();
    expect(log).toEqual([['deck', {path, name}]]);
  });
});

describe('US-005 AC-9 (D7): the entries that stay as they were', () => {
  it.each([
    ['a folder', [{path: 'Decks', isFolder: true}]],
    ['a folder named like a note', [{path: 'x.md', isFolder: true}]],
    ['a file that is not a note', [note('pics/a.png')]],
    ['a file without an extension', [note('README')]],
    ['two notes', [note('A.md'), note('B.md')]],
    ['a note and a folder', [note('A.md'), {path: 'Decks', isFolder: true}]],
  ])('%s: only Create cards', (_name, items) => {
    const {commands} = stub();
    expect(titles(commands.menuEntries(items))).toEqual(['Create cards']);
  });
  it('no choice: no entry', () => {
    const {commands} = stub();
    expect(commands.menuEntries([])).toEqual([]);
  });
});

describe('US-008 AC-5 (D7): the menus add one item per entry', () => {
  /** A menu that records the items added and lets the test click them. */
  function menu() {
    const items: {title: string; click: (() => void) | null}[] = [];
    return {
      items,
      menu: {
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
      },
    };
  }
  it('file-menu on a Markdown note: two items in order; the clicks run the selection and the deck', async () => {
    const {commands, log} = stub();
    const {menu: m, items} = menu();
    onFileMenu(commands)(m as never, {path: 'Decks/Opening Deck.md'});
    expect(items.map((i) => i.title)).toEqual([
      'Create cards',
      'Create cards from this deck note',
    ]);
    expect(log).toEqual([]);
    items[0]!.click!();
    items[1]!.click!();
    await Promise.resolve();
    expect(log).toEqual([
      ['selection', [note('Decks/Opening Deck.md')]],
      ['deck', {path: 'Decks/Opening Deck.md', name: 'Opening Deck'}],
    ]);
  });
  it('file-menu on a folder: one item; files-menu on two notes: one item', () => {
    const {commands} = stub();
    const a = menu();
    onFileMenu(commands)(
      a.menu as never,
      {path: 'Decks', children: []} as never,
    );
    expect(a.items.map((i) => i.title)).toEqual(['Create cards']);
    const b = menu();
    onFilesMenu(commands)(b.menu as never, [{path: 'A.md'}, {path: 'B.md'}]);
    expect(b.items.map((i) => i.title)).toEqual(['Create cards']);
  });
});
