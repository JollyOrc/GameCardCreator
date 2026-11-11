// US-005 AC-5 and AC-10 (rule 2): text checks over the sources. Each check
// matches the whole statement it guards and asserts how many files it looked
// at (SCAR-023). Red until the code ticket.
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const root = join(process.cwd(), 'src');
const files: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.ts')) files.push(path);
  }
};
walk(root);
const rel = (f: string) => f.slice(root.length + 1);
const text = (f: string) => readFileSync(f, 'utf8');
const code = (f: string) =>
  text(f)
    .split('\n')
    .filter(
      (l) =>
        !l.trim().startsWith('//') &&
        !l.trim().startsWith('*') &&
        !l.trim().startsWith('/*'),
    )
    .join('\n');

describe('US-005 AC-10: no change to the vault', () => {
  it('looks at every source file (at least 20; 22 with the run files) and the run files exist', () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const f of [
      'plugin/runner.ts',
      'plugin/commands.ts',
      'plugin/disk-writer.ts',
      'core/run/run.ts',
    ]) {
      expect(files.map(rel)).toContain(f);
    }
  });
  it('no file calls a write, delete or rename on the vault or its adapter', () => {
    const forbidden =
      /\b(vault|adapter)\.(modify|create|createBinary|createFolder|delete|rename|trash|append|appendBinary|process|copy|write|writeBinary|remove|rmdir|mkdir)\s*\(/;
    expect(files.filter((f) => forbidden.test(code(f))).map(rel)).toEqual([]);
  });
  it('the run dependencies offer reading and no vault writing', () => {
    const runner = code(join(root, 'plugin', 'runner.ts'));
    expect(runner).toMatch(/readNote\s*\(/);
    expect(runner).not.toMatch(
      /\b(writeNote|modifyNote|createNote|deleteNote)\b/,
    );
  });
});

describe('US-005 AC-5: one writer, no delete', () => {
  it('only plugin/disk-writer.ts calls a file write of Node', () => {
    const write =
      /\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|copyFile|rename|mkdir|mkdirSync)\s*\(/;
    expect(files.filter((f) => write.test(code(f))).map(rel)).toEqual([
      'plugin/disk-writer.ts',
    ]);
  });
  it('no file deletes anything on disk', () => {
    const del = /\b(unlink|unlinkSync|rm|rmSync|rmdir|rmdirSync)\s*\(/;
    expect(files.filter((f) => del.test(code(f))).map(rel)).toEqual([]);
  });
  it('core imports no Obsidian, Node or I/O module', () => {
    const core = files.filter((f) => rel(f).startsWith('core/'));
    expect(core.length).toBeGreaterThanOrEqual(15);
    for (const f of core) {
      expect(text(f), rel(f)).not.toMatch(
        /from '(obsidian|electron|node:[a-z/]+|fs|path)'/,
      );
    }
  });
});
