// US-005 AC-9 (SCAR-022, SCAR-031): the commands and the file explorer's menu
// entry as plain objects over the runner. They only hand over what they were
// given; every read follows the click. `main.ts` (US-008) registers them.
import type {SelectedItem} from '../core/run/select';
import type {CardsRunner} from './runner';

/** The part of a file the deck command needs. */
export interface DeckFile {
  path: string;
  name: string;
  extension: string;
}

/** US-005 AC-9: one entry of the file explorer's menu. */
export interface MenuEntry {
  title: string;
  run(): Promise<void>;
}

/** US-005 AC-9: the name of the deck command, also the title of its menu entry (D7). */
const DECK_COMMAND_NAME = 'Create cards from this deck note';

/** US-005 AC-9: the commands for a runner. */
export function createCardCommands(runner: CardsRunner) {
  return {
    /** `Create cards from this deck note`: offered only for a Markdown note. */
    deckCommand: {
      id: 'create-cards-from-deck-note',
      name: DECK_COMMAND_NAME,
      check: (file: DeckFile | null): boolean =>
        file !== null && file.extension.toLowerCase() === 'md',
      run: (file: DeckFile): Promise<void> =>
        runner.runDeck({path: file.path, name: file.name}),
    },
    /**
     * US-005 | AC-9 (D7): the entries of the context menu for the files and folders chosen.
     *
     * `Create cards` for any choice; for exactly one Markdown note also `Create cards from this
     * deck note` (after it), which runs the deck of that note: its name is the file name without
     * `.md`. A folder (even one named `x.md`), a file that is not a note and several items get
     * only `Create cards`. Building the entries reads and runs nothing: the click does.
     */
    menuEntries: (items: readonly SelectedItem[]): MenuEntry[] => {
      if (items.length === 0) return [];
      const entries: MenuEntry[] = [
        {title: 'Create cards', run: () => runner.runSelection(items)},
      ];
      const only = items.length === 1 ? items[0] : undefined;
      if (only !== undefined && !only.isFolder && /\.md$/i.test(only.path)) {
        const name = only.path.replace(/^.*\//, '').replace(/\.md$/i, '');
        entries.push({
          title: DECK_COMMAND_NAME,
          run: () => runner.runDeck({path: only.path, name}),
        });
      }
      return entries;
    },
  };
}
