// US-013 AC-1, AC-6, AC-7, AC-12 (SCAR-017, SCAR-031): the entry points and the tab, by
// text checks over the sources (the Obsidian side is measured by the manual check), and
// the command data. Red until the code tickets (G2, 2026-11-17).
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {createCardCommands, RIBBON} from '../../src/plugin/commands';

const ROOT = join(__dirname, '..', '..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf8');
const sourcesOf = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) return sourcesOf(rel);
    return rel.endsWith('.ts') ? [rel] : [];
  });

const runner = {
  runDeck: async () => undefined,
  runSelection: async () => undefined,
  isRunning: () => false,
};

describe('US-013 AC-1: the entry points', () => {
  it('the ribbon icon and its title', () => {
    expect(RIBBON).toEqual({icon: 'layout-grid', title: 'Create cards…'});
  });
  it('two new commands beside the deck command, which stays', () => {
    const c = createCardCommands(runner);
    expect([c.dialogCommand.id, c.dialogCommand.name]).toEqual([
      'create-cards-dialog',
      'Create cards…',
    ]);
    expect([c.savedSelectionCommand.id, c.savedSelectionCommand.name]).toEqual([
      'create-cards-from-saved-selection',
      'Create cards from the saved selection',
    ]);
    expect([c.deckCommand.id, c.deckCommand.name]).toEqual([
      'create-cards-from-deck-note',
      'Create cards from this deck note',
    ]);
  });
  it('main.ts registers the ribbon icon from RIBBON and both new commands by their ids', () => {
    const main = read('src/plugin/main.ts');
    expect(main).toMatch(/addRibbonIcon\(\s*RIBBON\.icon,\s*RIBBON\.title/);
    expect(main).toContain('commands.dialogCommand.id');
    expect(main).toContain('commands.savedSelectionCommand.id');
  });
  it('the file explorer menus stay as they are (O1)', () => {
    const main = read('src/plugin/main.ts');
    expect(main).toContain("on('file-menu', onFileMenu(commands))");
    expect(main).toContain("on('files-menu', onFilesMenu(commands))");
  });
});

describe('US-013 AC-6: the saved selection follows the vault', () => {
  it('main.ts listens to rename and delete; its handlers hand them to followRename / followDelete', () => {
    const main = read('src/plugin/main.ts');
    expect(main).toMatch(/vault\.on\(\s*'rename'/);
    expect(main).toMatch(/vault\.on\(\s*'delete'/);
    // Amended at #56 (G4): main.ts must stay short (US-008 AC-5), so it registers the
    // handlers of `selectionFollowers`; they hand the events to followRename / followDelete.
    expect(main).toContain('selectionFollowers');
    const deps = read('src/plugin/run-dialog/deps.ts');
    expect(deps).toMatch(/followRename\(saved, oldPath, file\.path\)/);
    expect(deps).toMatch(/followDelete\(saved, file\.path\)/);
  });
});

describe('US-013 AC-7: the tab in sections, styles in styles.css', () => {
  it('no Back control and no sub pages; sections as <details>', () => {
    const tab = read('src/plugin/settings/tab.ts');
    expect(tab).not.toMatch(/['"]Back['"]/);
    expect(tab).toMatch(/createEl\(\s*'details'/);
    expect(tab).toContain('SECTIONS');
    expect(tab).toContain('initiallyOpen');
    expect(tab).toContain('resetSection');
    expect(tab).not.toContain('resetPage');
  });
  it('no inline style in src/plugin (standard rule 0.6)', () => {
    const offenders = sourcesOf('src/plugin').filter((f) =>
      /\.style\.|setAttribute\(\s*'style'/.test(read(f)),
    );
    expect(offenders).toEqual([]);
  });
  it('styles.css holds the gcc- classes of the sections and the run dialog', () => {
    const css = read('styles.css');
    for (const cls of [
      '.gcc-section',
      '.gcc-divider',
      '.gcc-run-dialog',
      '.gcc-selection-panel',
      '.gcc-error',
    ]) {
      expect(css).toContain(cls);
    }
  });
});

describe('US-013 AC-12: one string table', () => {
  it('no string literal is passed to setName, setDesc, setButtonText, setTooltip, setText or Notice outside strings.ts', () => {
    const literal =
      /(?:setName|setDesc|setButtonText|setTooltip|setText|new Notice)\(\s*['"`]/;
    const offenders = sourcesOf('src/plugin')
      .filter((f) => !f.endsWith('/strings.ts'))
      .filter((f) => literal.test(read(f)));
    expect(offenders).toEqual([]);
  });
  it('the check looks at the tab, the dialog and main.ts (at least 20 files)', () => {
    const files = sourcesOf('src/plugin');
    expect(files.length).toBeGreaterThanOrEqual(20);
    expect(files).toContain('src/plugin/settings/tab.ts');
    expect(files).toContain('src/plugin/run-dialog/dialog.ts');
    expect(files).toContain('src/plugin/main.ts');
  });
});
