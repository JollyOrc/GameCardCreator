// Test support (US-007): a settings store in memory that behaves like the plugin's
// `data.json` through `loadData` and `saveData`: `read` answers a copy of what is
// there (null when there is no file), `write` replaces it with a copy. The tests
// change the "file" from outside with `set` (a hand edit while the tab is open)
// and read what the screen wrote with `file()` and `writes`.
import type {SettingsStore} from '../../src/plugin/settings/commit';

export interface MemoryStore extends SettingsStore {
  /** The current "file" (a copy), `null` when there is none. */
  file(): unknown;
  /** Replaces the "file" from outside, as a hand edit would. */
  set(value: unknown): void;
  /** Every object the screen wrote, in order (copies). */
  writes: unknown[];
  /** How many times the "file" was read. */
  reads: number;
}

const copy = (value: unknown): unknown =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

/** A store holding `initial` (`null` = no file). `delay` makes every read slow (ms). */
export function memoryStore(initial: unknown = null, delay = 0): MemoryStore {
  let current: unknown = copy(initial);
  const store: MemoryStore = {
    writes: [],
    reads: 0,
    file: () => copy(current),
    set: (value) => void (current = copy(value)),
    async read() {
      store.reads++;
      const snapshot = copy(current);
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      return snapshot;
    },
    async write(data) {
      store.writes.push(copy(data));
      current = copy(data);
    },
  };
  return store;
}
