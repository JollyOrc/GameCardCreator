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

/** US-005 AC-9: the commands for a runner. */
export function createCardCommands(runner: CardsRunner) {
  return {
    /** `Create cards from this deck note`: offered only for a Markdown note. */
    deckCommand: {
      id: 'create-cards-from-deck-note',
      name: 'Create cards from this deck note',
      check: (file: DeckFile | null): boolean =>
        file !== null && file.extension.toLowerCase() === 'md',
      run: (file: DeckFile): Promise<void> =>
        runner.runDeck({path: file.path, name: file.name}),
    },
    /** `Create cards` for the files and folders chosen in the file explorer. */
    menuEntries: (items: readonly SelectedItem[]): MenuEntry[] =>
      items.length === 0
        ? []
        : [{title: 'Create cards', run: () => runner.runSelection(items)}],
  };
}
