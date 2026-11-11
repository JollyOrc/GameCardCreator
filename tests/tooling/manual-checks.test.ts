// SCAR-029: the index of the manual checks against their files. One row per
// file, one file per row, in id order, each file starting with its own heading.
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const dir = join(process.cwd(), 'docs', 'technical', 'manual-checks');
const index = readFileSync(
  join(process.cwd(), 'docs', 'technical', 'manual-checks.md'),
  'utf8',
);
const files = readdirSync(dir)
  .filter((f) => /^M\d+\.md$/.test(f))
  .sort();
const rows = [
  ...index.matchAll(/^\| \[(M\d+)\]\(manual-checks\/(M\d+\.md)\)/gm),
];

describe('SCAR-029: the manual checks index', () => {
  it('looks at the files (at least one) and the rows', () => {
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
  it('has one row per file and one file per row, in id order', () => {
    expect(rows.map((r) => r[2])).toEqual(files);
    expect(rows.map((r) => r[1]!)).toEqual(
      files.map((f) => f.replace('.md', '')),
    );
  });
  it('every row names its own file by id and every file starts with its own heading', () => {
    for (const r of rows) expect(r[1]).toBe(r[2]!.replace('.md', ''));
    for (const f of files) {
      const first = readFileSync(join(dir, f), 'utf8').split('\n')[0]!;
      expect(first.startsWith(`# ${f.replace('.md', '')} — `), f).toBe(true);
    }
  });
});
