// US-007 AC-1, AC-3, AC-4, AC-5, AC-6, AC-9 (SCAR-016, SCAR-017, SCAR-031): the settings tab
// `Game Card Creator`. It only builds Obsidian objects and hands over: every decision lives
// in a tested function (`commitSetting`, `commitRule`, `resetPage`, `fieldKey`, `statusLine`,
// `gridLine`, `chooseFolder`, `dialogStart`, `suggestFolders`). The one place that imports
// Obsidian besides `main.ts`. Pages are drawn in the same tab; every draw reads the file now,
// every handler reads when it runs. Measured only by the manual check M04.
import {
  AbstractInputSuggest,
  Notice,
  PluginSettingTab,
  Setting,
  type App,
  type Plugin,
  type TextComponent,
} from 'obsidian';
import type {ReplaceDialog} from '../../core/run/confirm';
import type {NoteKind} from '../../core/run/kinds';
import type {CardsSettings} from '../../core/run/settings';
import {readSettingsFile} from '../settings-file';
import {commitSetting, type CommitResult, type SettingsStore} from './commit';
import {
  fieldKey,
  fieldsOf,
  groupsOf,
  valueOf,
  type FieldDef,
  type PageId,
} from './fields';
import {
  dialogStart,
  folderDialogAvailable,
  pickOutputFolder,
  type DialogEnv,
} from './folder-dialog';
import {PAGE_TITLES, resetDialog, resetPage, type ResetPage} from './reset';
import {commitRule, suggestFolders} from './rules';
import {gridLine, statusLine} from './status';

/** What `main.ts` hands to the tab. */
export interface TabDeps {
  store: SettingsStore;
  vaultRoot(): string;
  /** The vault's folders now (for the suggestions). */
  folders(): string[];
  folderExists(folder: string): boolean;
  /** Asks the question; `false` is Cancel. */
  confirm(dialog: ReplaceDialog): Promise<boolean>;
  /** Whether a folder of the disk exists (the dialog's start folder). */
  exists(path: string): Promise<boolean>;
}

/** The suggestions of the vault's folders under a rule's folder field. */
class FolderSuggest extends AbstractInputSuggest<string> {
  constructor(
    app: App,
    private readonly input: HTMLInputElement,
    private readonly folders: () => string[],
    private readonly picked: (folder: string) => void,
  ) {
    super(app, input);
  }
  protected override getSuggestions(query: string): string[] {
    return suggestFolders(query, this.folders());
  }
  override renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }
  override selectSuggestion(value: string): void {
    this.setValue(value);
    this.close();
    this.picked(value);
  }
}

/** A rule row that is not saved yet (its folder is still empty). */
interface PendingRule {
  kind: NoteKind;
}

const KIND_OPTIONS: Record<NoteKind, string> = {
  skill: 'skill',
  spell: 'spell',
  creature: 'creature',
};

export class GameCardCreatorSettingTab extends PluginSettingTab {
  private page: PageId = 'main';
  private pending: PendingRule | null = null;
  private statusEl: HTMLElement | null = null;
  private gridEl: HTMLElement | null = null;
  private drawn = 0;

  constructor(
    app: App,
    plugin: Plugin,
    private readonly deps: TabDeps,
  ) {
    super(app, plugin);
  }

  /** US-007 | AC-1: opening the tab shows the main page, drawn from the file as it is now. */
  override display(): void {
    this.page = 'main';
    this.pending = null;
    void this.draw();
  }

  private env(): DialogEnv {
    return {
      require: (window as unknown as {require?: (id: string) => unknown})
        .require,
    };
  }

  /** The settings as the file holds them now (the defaults when it cannot be read). */
  private async current(): Promise<CardsSettings> {
    try {
      return readSettingsFile(await this.deps.store.read()).settings;
    } catch {
      return readSettingsFile(null).settings;
    }
  }

  /** US-007 | AC-11: draws the current page from the file now; a later draw wins. */
  private async draw(): Promise<void> {
    const token = ++this.drawn;
    const settings = await this.current();
    if (token !== this.drawn) return;
    const el = this.containerEl;
    el.empty();
    this.statusEl = null;
    this.gridEl = null;
    if (this.page === 'main') this.drawMain(el, settings);
    else this.drawSub(el, settings, this.page);
    await this.refresh();
  }

  /** US-007 | AC-2, AC-8: the status line and the grid line follow the file after every change. */
  private async refresh(): Promise<void> {
    const settings = await this.current();
    this.statusEl?.setText(statusLine(settings, this.deps.vaultRoot()));
    this.gridEl?.setText(gridLine(settings.sheet));
  }

  private drawMain(el: HTMLElement, settings: CardsSettings): void {
    new Setting(el).setName('Game Card Creator').setHeading();
    this.statusEl = el.createDiv({cls: 'gcc-status'});
    this.drawFields(el, settings, 'main');
    new Setting(el).setName('Which note is which card').setHeading();
    settings.kindRules.forEach((rule, index) =>
      this.ruleRow(el, index, rule.folder, rule.kind, false),
    );
    if (this.pending !== null) {
      this.ruleRow(el, settings.kindRules.length, '', this.pending.kind, true);
    }
    new Setting(el).addButton((button) =>
      button.setButtonText('Add rule').onClick(() => {
        this.pending ??= {kind: 'skill'};
        void this.draw();
      }),
    );
    this.pageLink(el, 'properties');
    this.pageLink(el, 'layout');
  }

  private pageLink(el: HTMLElement, page: ResetPage): void {
    new Setting(el).setName(PAGE_TITLES[page]).addButton((button) =>
      button.setButtonText('Open').onClick(() => {
        this.page = page;
        void this.draw();
      }),
    );
  }

  private drawSub(
    el: HTMLElement,
    settings: CardsSettings,
    page: ResetPage,
  ): void {
    new Setting(el).addButton((button) =>
      button.setButtonText('← Back').onClick(() => {
        this.page = 'main';
        void this.draw();
      }),
    );
    new Setting(el).setName(PAGE_TITLES[page]).setHeading();
    for (const {group, fields} of groupsOf(page)) {
      new Setting(el).setName(group).setHeading();
      this.drawFields(el, settings, page, fields);
      if (group === 'Sheet') this.gridEl = el.createDiv({cls: 'gcc-grid'});
    }
    new Setting(el).setName('Reset this page to defaults').addButton((button) =>
      button
        .setButtonText('Reset…')
        .setWarning()
        .onClick(() => void this.reset(page)),
    );
  }

  /** One row per field of the page, from the table: the one way a field is drawn. */
  private drawFields(
    el: HTMLElement,
    settings: CardsSettings,
    page: PageId,
    fields: FieldDef[] = fieldsOf(page),
  ): void {
    for (const def of fields) {
      const row = new Setting(el).setName(def.label);
      const error = row.descEl.createDiv({cls: 'gcc-error'});
      const value = valueOf(settings, def.id);
      if (def.kind === 'toggle') {
        row.addToggle((toggle) =>
          toggle
            .setValue(value === true)
            .onChange((on) => void this.commit(def.id, on, error)),
        );
        continue;
      }
      row.addText((text) => {
        text.setValue(String(value));
        this.bindText(text, def.id, error);
        if (def.id === 'outputFolder') this.addChooser(row, text, error);
      });
    }
  }

  /** US-007 | AC-3: a text or number field commits what was typed through `commit`. */
  private bindText(text: TextComponent, id: string, error: HTMLElement): void {
    this.bindInput(text.inputEl, text.getValue(), (typed) => {
      void this.commit(id, typed, error);
    });
  }

  /**
   * US-007 | AC-3 (SCAR-013, SCAR-017): the one place an input commits: on Enter (decided by
   * `fieldKey`: not during a composition) and when it loses the focus, once per typed change.
   */
  private bindInput(
    input: HTMLInputElement,
    last: string,
    commit: (typed: string) => void,
  ): void {
    let committed = last;
    const fire = (): void => {
      if (input.value === committed) return;
      committed = input.value;
      commit(input.value);
    };
    input.addEventListener('keydown', (event) => {
      if (fieldKey(event) === 'commit') fire();
    });
    input.addEventListener('blur', fire);
  }

  /** US-007 | AC-4: the one place a field is committed. */
  private async commit(
    id: string,
    raw: string | boolean,
    error: HTMLElement,
  ): Promise<CommitResult> {
    const result = await commitSetting(
      {store: this.deps.store, vaultRoot: () => this.deps.vaultRoot()},
      id,
      raw,
    );
    error.setText(result.ok ? '' : result.message);
    await this.refresh();
    return result;
  }

  /** US-007 | AC-5: `Choose folder…`, only when a system dialog could open. */
  private addChooser(
    row: Setting,
    text: TextComponent,
    error: HTMLElement,
  ): void {
    if (!folderDialogAvailable(this.env())) return;
    row.addButton((button) =>
      button.setButtonText('Choose folder…').onClick(async () => {
        const outcome = await pickOutputFolder({
          env: this.env(),
          startAt: async () =>
            dialogStart(
              String(valueOf(await this.current(), 'outputFolder')),
              this.homeFolder(),
              (path) => this.deps.exists(path),
            ),
          commit: (path) => this.commit('outputFolder', path, error),
        });
        if (outcome === null) return;
        if (outcome.path !== '') text.setValue(outcome.path);
        error.setText(outcome.message);
        if (outcome.saved) await this.draw();
      }),
    );
  }

  private homeFolder(): string {
    try {
      const os = this.env().require?.('os') as {homedir(): string} | undefined;
      return os?.homedir() ?? '';
    } catch {
      return '';
    }
  }

  /** US-007 | AC-6: one kind rule row; a pending one is saved when its folder is typed. */
  private ruleRow(
    el: HTMLElement,
    index: number,
    folder: string,
    kind: NoteKind,
    isPending: boolean,
  ): void {
    const row = new Setting(el).setName(`Rule ${index + 1}`);
    const note = row.descEl.createDiv({cls: 'gcc-error'});
    if (!isPending && folder.trim() !== '' && !this.deps.folderExists(folder)) {
      note.setText(`The folder "${folder.trim()}" is not in the vault`);
      note.addClass('gcc-warning');
    }
    let chosen: NoteKind = kind;
    let typed = folder;
    const save = (text: string): void => {
      typed = text;
      void this.setRule(index, text, chosen, note);
    };
    row.addText((text) => {
      text.setValue(folder).setPlaceholder('Folder');
      new FolderSuggest(
        this.app,
        text.inputEl,
        () => this.deps.folders(),
        (value) => save(value),
      );
      this.bindInput(text.inputEl, folder, save);
    });
    row.addDropdown((dropdown) =>
      dropdown
        .addOptions(KIND_OPTIONS)
        .setValue(kind)
        .onChange((value) => {
          chosen = value as NoteKind;
          if (isPending) {
            if (this.pending !== null) this.pending.kind = chosen;
          } else {
            void this.setRule(index, typed, chosen, note);
          }
        }),
    );
    row.addExtraButton((button) =>
      button
        .setIcon('trash')
        .setTooltip('Delete rule')
        .onClick(() => void this.deleteRule(index, isPending, note)),
    );
  }

  private async setRule(
    index: number,
    folder: string,
    kind: NoteKind,
    note: HTMLElement,
  ): Promise<void> {
    const result = await commitRule(this.ruleDeps(), {
      op: 'set',
      index,
      rule: {folder, kind},
    });
    if (!result.ok) {
      note.removeClass('gcc-warning');
      note.setText(result.message);
      return;
    }
    this.pending = null;
    await this.draw();
  }

  private async deleteRule(
    index: number,
    isPending: boolean,
    note: HTMLElement,
  ): Promise<void> {
    if (isPending) {
      this.pending = null;
      await this.draw();
      return;
    }
    const result = await commitRule(this.ruleDeps(), {op: 'delete', index});
    if (!result.ok) {
      note.setText(result.message);
      return;
    }
    await this.draw();
  }

  private ruleDeps() {
    return {
      store: this.deps.store,
      vaultRoot: () => this.deps.vaultRoot(),
      folderExists: (folder: string) => this.deps.folderExists(folder),
    };
  }

  /** US-007 | AC-9 (SCAR-014): asks first, the focus on Cancel; then only this page's keys. */
  private async reset(page: ResetPage): Promise<void> {
    if (!(await this.deps.confirm(resetDialog(page)))) return;
    try {
      await resetPage({store: this.deps.store}, page);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
    await this.draw();
  }
}
