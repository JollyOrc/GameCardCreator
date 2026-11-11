// US-002 #3: text checks over the reader's sources (SCAR-017, SCAR-038). Each
// check matches the whole statement it guards and asserts how many places it
// looked at (SCAR-023).
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const dir = join(process.cwd(), 'src', 'core', 'skill');
const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
const source = (f: string) => readFileSync(join(dir, f), 'utf8');

describe('US-002 #3: the skill sources', () => {
  it('looks at the three modules of this ticket', () => {
    for (const f of ['settings.ts', 'read.ts', 'fit.ts']) {
      expect(files).toContain(f);
    }
  });
  it('one place reads the front matter: a single FRONT_MATTER definition', () => {
    const defs = files
      .map((f) => [f, source(f).match(/const FRONT_MATTER\b/g)?.length ?? 0])
      .filter(([, n]) => n !== 0);
    expect(defs).toEqual([['read.ts', 1]]);
  });
  it('no copy of the front matter delimiter pattern outside that definition', () => {
    const hits = files.flatMap((f) =>
      source(f)
        .split('\n')
        .filter((l) => /\^\\{1,2}uFEFF\?---/.test(l) || /\^---\\{1,2}n/.test(l))
        .map(() => f),
    );
    expect(hits).toEqual(['read.ts']);
  });
  it('the reader and the fit module report nothing themselves (SCAR-038)', () => {
    for (const f of ['read.ts', 'fit.ts']) {
      expect(source(f), f).not.toMatch(/console\.|new Notice|process\.std/);
    }
  });
  it('the core imports no Obsidian, Node or I/O module', () => {
    for (const f of files) {
      expect(source(f), f).not.toMatch(
        /from '(obsidian|electron|node:[a-z/]+|fs|path)'/,
      );
    }
  });
});
