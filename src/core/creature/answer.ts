// US-004 AC-3: the shape of what Obsidian2Typst's `api.statblockTypst` answers.
// Types only: the reader of the answer is `statblock.ts`, the card model
// (`read.ts`) holds an accepted answer.

/** US-004 AC-3: the answer for a note that has a statblock. */
export interface StatblockOk {
  ok: true;
  prelude: string;
  data: string;
  files: {path: string; bytes: Uint8Array}[];
  credit: string | null;
  warnings: {code: string; message: string}[];
}

/** US-004 AC-3: the answer for a note that has none (`no-settings`, `no-statblock`). */
export interface StatblockRefused {
  ok: false;
  reason: 'no-settings' | 'no-statblock';
  message: string;
}

/** US-004 AC-3: either answer. */
export type StatblockAnswer = StatblockOk | StatblockRefused;
