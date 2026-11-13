// US-004 AC-3, AC-11, AC-12a: the reader's side of the contract with
// Obsidian2Typst's `api.statblockTypst` (the writer's story is its US-039 and
// US-040, SCAR-040). Pure functions on values: the API object itself is fetched
// by the run (`main.ts`), at each run, never kept (SCAR-016). Nothing here
// throws for a bad answer (rule 8).
import {cardCode} from '../card/warning';
import type {CardWarning} from '../skill/read';
import type {StatblockAnswer, StatblockOk} from './answer';

export type {StatblockAnswer, StatblockOk} from './answer';

/** US-004 AC-3: the least version of Obsidian2Typst that has the contract. */
export const LEAST_VERSION = '0.15.1';

/** US-004 AC-3: the part of the API this plugin calls. */
export interface StatblockApi {
  version: 1;
  statblockTypst(
    data: Record<string, unknown>,
    options?: {heading?: string},
  ): Promise<unknown>;
  compileFonts(): Promise<Uint8Array[]>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * US-004 AC-3 (Call): `value` is the API object read from the plugin, or
 * anything else. Accepted when `version === 1` and both functions exist;
 * otherwise a message naming the plugin and the least version. The caller
 * refuses every creature card of the run once, never the other kinds.
 */
export function checkStatblockApi(
  value: unknown,
): {ok: true; api: StatblockApi} | {ok: false; message: string} {
  if (
    isObject(value) &&
    value.version === 1 &&
    typeof value.statblockTypst === 'function' &&
    typeof value.compileFonts === 'function'
  ) {
    return {ok: true, api: value as unknown as StatblockApi};
  }
  return {
    ok: false,
    message: `Creature cards need Obsidian2Typst ${LEAST_VERSION} or newer, installed and enabled`,
  };
}

const MALFORMED = 'The answer of Obsidian2Typst was not understood (malformed)';

const isFile = (v: unknown): v is {path: string; bytes: Uint8Array} =>
  isObject(v) && typeof v.path === 'string' && v.bytes instanceof Uint8Array;
const isWarning = (v: unknown): v is {code: string; message: string} =>
  isObject(v) && typeof v.code === 'string' && typeof v.message === 'string';

/**
 * US-004 AC-3: reads the raw answer of `statblockTypst`. A well-formed answer
 * (`ok: true` with the prelude, the data, the files, the credit and the
 * warnings, or `ok: false` with a known reason and a message) is returned as a
 * copy of its fields; anything else is a refusal that says the answer was not
 * understood, never a throw.
 */
export function parseAnswer(raw: unknown): StatblockAnswer {
  const refused = (message: string): StatblockAnswer => ({
    ok: false,
    reason: 'no-statblock',
    message,
  });
  if (!isObject(raw)) return refused(MALFORMED);
  if (raw.ok === true) {
    const {prelude, data, files, credit, warnings} = raw;
    if (
      typeof prelude !== 'string' ||
      typeof data !== 'string' ||
      !Array.isArray(files) ||
      !files.every(isFile) ||
      !(credit === null || typeof credit === 'string') ||
      !Array.isArray(warnings) ||
      !warnings.every(isWarning)
    ) {
      return refused(MALFORMED);
    }
    return {
      ok: true,
      prelude,
      data,
      files: files.map((f) => ({path: f.path, bytes: f.bytes})),
      credit,
      warnings: warnings.map((w) => ({code: w.code, message: w.message})),
    };
  }
  if (
    raw.ok === false &&
    (raw.reason === 'no-settings' || raw.reason === 'no-statblock') &&
    typeof raw.message === 'string'
  ) {
    return {ok: false, reason: raw.reason, message: raw.message};
  }
  return refused(MALFORMED);
}

/**
 * US-004 AC-11 (D1): the answer's warnings as warnings of the run, with their
 * own code and message (as `detail`) and the note's path, in the answer's order.
 */
export function forwardWarnings(
  answer: StatblockOk,
  path: string,
): CardWarning[] {
  return answer.warnings.map((w) => ({
    code: w.code,
    path,
    detail: w.message,
  }));
}

/** US-004 AC-11 (D2): the warning for a refused statblock; the card is made without it. */
export function refusedWarning(path: string, message: string): CardWarning {
  return {
    code: cardCode('creature', 'STATBLOCK_REFUSED'),
    path,
    detail: message,
  };
}

/** US-004 AC-3: the one warning of a run for a missing or too old plugin (empty path). */
export function unavailableWarning(message: string): CardWarning {
  return {
    code: cardCode('creature', 'API_UNAVAILABLE'),
    path: '',
    detail: message,
  };
}

/**
 * US-004 AC-12a (D6): puts the files of one answer into `merged` (path to
 * bytes). A path already there with the same bytes is the same file; a path
 * with different bytes is a conflict: nothing of this answer is added, and the
 * warning for the first conflicting path is returned (`detail`: the file path).
 * Otherwise null. A wrong icon is never drawn.
 */
export function mergeFiles(
  merged: Map<string, Uint8Array>,
  answer: StatblockOk,
  path: string,
): CardWarning | null {
  const same = (a: Uint8Array, b: Uint8Array): boolean =>
    a.length === b.length && a.every((byte, i) => byte === b[i]);
  for (const file of answer.files) {
    const known = merged.get(file.path);
    if (known !== undefined && !same(known, file.bytes)) {
      return {
        code: cardCode('creature', 'ICON_CONFLICT'),
        path,
        detail: file.path,
      };
    }
  }
  for (const file of answer.files) merged.set(file.path, file.bytes);
  return null;
}
