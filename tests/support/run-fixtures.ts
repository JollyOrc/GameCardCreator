// Test support for US-005's PDF-level tests: the vault of the composed example
// (AC-12) as a map, the runner's dependencies with the real Typst compile, and
// a writer that records. Invented notes only (SCAR-035).
import {FIT_LABEL} from '../../src/core/skill/fit';
import {DEFAULT_CARDS, type CardsSettings} from '../../src/core/run/settings';
import {EXAMPLE_NOTE, inventedParagraphs} from './skill-fixtures';
import {EXAMPLE_SPELL_NOTE} from './spell-fixtures';
import {compileWithFacts} from './typst-node';

export const MIXED_SETTINGS: CardsSettings = {
  ...DEFAULT_CARDS,
  kindRules: [
    {folder: 'skills', kind: 'skill'},
    {folder: 'spells', kind: 'spell'},
  ],
  outputFolder: '/out',
};

/** The vault of AC-12: notes by path. */
export const MIXED_NOTES: Record<string, string> = {
  'Mixed Deck.md':
    '- [[Gone]]\n- [[Loose]]\n- [[Reed Sweep]]\n- [[Reed Whisper]]\n- [[Long Drill]]\n',
  'skills/Reed Sweep.md': EXAMPLE_NOTE,
  'spells/Reed Whisper.md': EXAMPLE_SPELL_NOTE,
  'skills/Long Drill.md': `---\ntags:\n  - FieldCraft\n---\n${inventedParagraphs(400).join('\n\n')}\n`,
  'misc/Loose.md': 'Loose text.\n',
};

export interface Recorded {
  writes: {path: string; bytes?: Uint8Array; text?: string}[];
  notices: string[];
}

/** The runner's dependencies over `MIXED_NOTES`, the real compile, and a recording writer. */
export function mixedDeps(
  rec: Recorded,
  settings: CardsSettings = MIXED_SETTINGS,
) {
  const base = (p: string) => p.replace(/^.*\//, '').replace(/\.md$/, '');
  return {
    settings: async () => settings,
    vaultRoot: () => '/v',
    readNote: async (p: string) => {
      const t = MIXED_NOTES[p];
      if (t === undefined) throw new Error(`no such note ${p}`);
      return t;
    },
    resolve: (target: string) => {
      const found = Object.keys(MIXED_NOTES)
        .filter((k) => k === `${target}.md` || base(k) === target)
        .sort();
      return found.length === 0 ? null : {path: found[0]!, isNote: true};
    },
    notesNamed: (n: string) =>
      Object.keys(MIXED_NOTES)
        .filter((k) => base(k) === n)
        .sort(),
    notesBelow: (folder: string) =>
      Object.keys(MIXED_NOTES).filter((k) => k.startsWith(`${folder}/`)),
    compile: async (source: string) => {
      const {pdf, facts} = await compileWithFacts(source, FIT_LABEL);
      return {pdf, facts};
    },
    isFile: async () => false,
    writerFor: () => ({
      exists: async () => false,
      writeBytes: async (path: string, bytes: Uint8Array) =>
        void rec.writes.push({path, bytes}),
      writeText: async (path: string, text: string) =>
        void rec.writes.push({path, text}),
      ensureFolder: async () => undefined,
      isFile: async () => false,
    }),
    confirmReplace: async () => true,
    notice: (t: string) => void rec.notices.push(t),
  };
}
