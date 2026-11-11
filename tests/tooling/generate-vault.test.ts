// US-005 AC-13 (SCAR-018, SCAR-035): the generator of the scratch vault for the
// manual check M01. Invented notes only; the same files every run; it writes
// into a folder that does not exist yet and refuses one that does.
import {spawnSync} from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {deckLinks} from '../../src/core/run/deck';
import {kindOf} from '../../src/core/run/kinds';
import {vaultBinaries, vaultFiles} from '../fixtures/generate-vault';

const RULES = [
  {folder: 'Skills', kind: 'skill'},
  {folder: 'Spells', kind: 'spell'},
] as const;

describe('US-005 AC-13: the generated scratch vault', () => {
  const files = vaultFiles();
  it('is the same on every call', () => {
    expect(vaultFiles()).toEqual(files);
  });
  it('holds the notes the check M01 names, by path', () => {
    for (const p of [
      'Decks/Opening Deck.md',
      'Skills/Combat/Reed Sweep.md',
      'Skills/Combat/Guard Stance.md',
      'Skills/General/Basket Knots.md',
      'Skills/General/Cord Work.md',
      'Skills/Combat/dup.md',
      'Skills/General/dup.md',
      'Spells/Reed Whisper.md',
      'Spells/Stone Skin.md',
      'Misc/Loose.md',
    ]) {
      expect(Object.keys(files), p).toContain(p);
    }
    expect(Object.keys(vaultBinaries())).toEqual(['pics/reed.png']);
  });
  it("the deck note's links are the ones the check describes, in order", () => {
    expect(deckLinks(files['Decks/Opening Deck.md'] as string)).toEqual([
      'Reed Sweep',
      'Reed Whisper',
      'Guard Stance',
      'Gone Note',
      'Skills',
      'dup',
      'Loose',
      '../Spells/Stone Skin',
      'Reed Sweep',
    ]);
  });
  it('the kind rules give the folders their kinds, and Misc none', () => {
    expect(kindOf('Skills/Combat/Reed Sweep.md', [...RULES])).toBe('skill');
    expect(kindOf('Spells/Reed Whisper.md', [...RULES])).toBe('spell');
    expect(kindOf('Misc/Loose.md', [...RULES])).toBeNull();
  });
  it('a note name that two notes have exists (for the ambiguity measurement)', () => {
    const dups = Object.keys(files).filter((p) => p.endsWith('/dup.md'));
    expect(dups).toHaveLength(2);
  });
});

describe('US-005 AC-13 (SCAR-018): the command line', () => {
  const run = (dir: string) =>
    spawnSync(
      'node',
      ['--experimental-strip-types', 'tests/fixtures/generate-vault.ts', dir],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
  it('writes the vault into a new folder, and the same files twice', () => {
    const base = mkdtempSync(join(tmpdir(), 'gcc-vault-'));
    try {
      const a = join(base, 'a');
      const b = join(base, 'b');
      expect(run(a).status).toBe(0);
      expect(run(b).status).toBe(0);
      for (const [p, text] of Object.entries(vaultFiles())) {
        expect(readFileSync(join(a, p), 'utf8')).toBe(text);
        expect(readFileSync(join(b, p), 'utf8')).toBe(text);
      }
      const png = vaultBinaries()['pics/reed.png']!;
      expect(Array.from(readFileSync(join(a, 'pics/reed.png')))).toEqual(
        Array.from(png),
      );
      expect(Array.from(png.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    } finally {
      rmSync(base, {recursive: true, force: true});
    }
  });
  it('refuses a folder that exists, and writes nothing into it', () => {
    const base = mkdtempSync(join(tmpdir(), 'gcc-vault-'));
    try {
      mkdirSync(join(base, 'taken'));
      const r = run(join(base, 'taken'));
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/exists/i);
      expect(existsSync(join(base, 'taken', 'Decks'))).toBe(false);
    } finally {
      rmSync(base, {recursive: true, force: true});
    }
  });
  it('refuses a missing argument', () => {
    const r = spawnSync(
      'node',
      ['--experimental-strip-types', 'tests/fixtures/generate-vault.ts'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    expect(r.status).not.toBe(0);
  });
});
