// US-007 AC-1, AC-3 to AC-6; US-013 AC-7 to AC-10 (SCAR-014, SCAR-016, SCAR-017, SCAR-031):
// the settings tab `Game Card Creator`, in collapsible sections. It only builds Obsidian
// objects and hands over: every decision lives in a tested function (`commitSetting`,
// `commitRule`, `resetSection`, `resetSectionDialog`, `initiallyOpen`, `sectionOf`,
// `fieldKey`, `statusLine`, `gridLine`, `pickOutputFolder`, `dialogStart`,
// `suggestFolders`, `debugInfo`). The one place that imports Obsidian besides `main.ts`.
// Every draw reads the file now, every handler reads when it runs. Measured by the manual
// checks (M04, and US-013's).
import {
  AbstractInputSuggest,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  setIcon,
  type App,
  type Plugin,
  type TextComponent,
} from 'obsidian';
import type {ReplaceDialog} from '../../core/run/confirm';
import type {NoteKind} from '../../core/run/kinds';
import type {CardsSettings} from '../../core/run/settings';
import {debugInfo, type DebugFacts} from '../debug-info';
import {readSettingsFile} from '../settings-file';
import {TAB} from '../strings';
import {commitSetting, type CommitResult, type SettingsStore} from './commit';
import {
  fieldKey,
  FIELDS,
  groupsOf,
  isShown,
  redraws,
  valueOf,
  type FieldDef,
} from './fields';
import {
  dialogStart,
  folderDialogAvailable,
  homeFolder,
  pickOutputFolder,
  windowEnv,
  type DialogEnv,
} from './folder-dialog';
import {commitRule, suggestFolders} from './rules';
import {
  FEATURE_ROWS,
  initiallyOpen,
  RESETTABLE,
  resetSection,
  resetSectionDialog,
  sectionOf,
  SECTIONS,
  type FeatureRow,
  type SectionId,
} from './sections';
import {gridLine, schemeLine, statusLine} from './status';

/** What `main.ts` hands to the tab. */
export interface TabDeps {
  store: SettingsStore;
  vaultRoot(): string;
  /** The vault's folders now (for the suggestions). */
  folders(): string[];
  folderExists(folder: string): boolean;
  /** US-009 AC-11: whether the vault has a note at this path now (read at each draw). */
  noteExists(path: string): boolean;
  /** Asks the question; `false` is Cancel. */
  confirm(dialog: ReplaceDialog): Promise<boolean>;
  /** Whether a folder of the disk exists (the dialog's start folder). */
  exists(path: string): Promise<boolean>;
  /** US-013 AC-8: the facts of the debug text, gathered at the click. */
  debugFacts(): Promise<DebugFacts>;
  /** US-013 AC-8: puts the text on the clipboard. */
  toClipboard(text: string): Promise<void>;
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

/**
 * US-013 AC-9: the gear's modal of one feature row: it draws the row's two sizes with the
 * tab's own field drawing and redraws the tab when it closes (SCAR-016).
 */
class TitleSizesModal extends Modal {
  constructor(
    app: App,
    private readonly row: FeatureRow,
    private readonly fill: (el: HTMLElement) => Promise<void>,
    private readonly closed: () => void,
  ) {
    super(app);
  }
  override onOpen(): void {
    this.titleEl.setText(this.row.title);
    void this.fill(this.contentEl);
  }
  override onClose(): void {
    this.contentEl.empty();
    this.closed();
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

/** The field definitions of `ids`, in the order given. */
const defsOf = (ids: readonly string[]): FieldDef[] =>
  ids.map((id) => FIELDS.find((f) => f.id === id)!);

export class GameCardCreatorSettingTab extends PluginSettingTab {
  private pending: PendingRule | null = null;
  private open = new Set<SectionId>();
  private statusEl: HTMLElement | null = null;
  private gridEl: HTMLElement | null = null;
  private schemeEl: HTMLElement | null = null;
  private drawn = 0;

  constructor(
    app: App,
    plugin: Plugin,
    private readonly deps: TabDeps,
  ) {
    super(app, plugin);
  }

  /**
   * US-013 | AC-7: opening the tab draws it from the file as it is now, with the first
   * section that holds a problem open (else *Output*); the user's opening and closing of
   * sections is kept while the tab stays open.
   */
  override display(): void {
    this.pending = null;
    this.open = new Set();
    void this.current().then((settings) => {
      this.open.add(initiallyOpen(settings, this.deps.vaultRoot()));
      return this.draw();
    });
  }

  private env(): DialogEnv {
    return windowEnv();
  }

  /** The settings as the file holds them now (the defaults when it cannot be read). */
  private async current(): Promise<CardsSettings> {
    try {
      return readSettingsFile(await this.deps.store.read()).settings;
    } catch {
      return readSettingsFile(null).settings;
    }
  }

  /** US-007 | AC-11: draws the tab from the file now; a later draw wins. */
  private async draw(): Promise<void> {
    const token = ++this.drawn;
    const settings = await this.current();
    if (token !== this.drawn) return;
    const el = this.containerEl;
    el.empty();
    this.statusEl = null;
    this.gridEl = null;
    this.schemeEl = null;
    this.drawHeader(el);
    this.statusEl = el.createDiv({cls: 'gcc-status'});
    SECTIONS.forEach((section, index) => {
      if (index > 0) el.createEl('hr', {cls: 'gcc-divider'});
      this.drawSection(el, settings, section);
    });
    await this.refresh();
  }

  /** US-013 | AC-8: help link on the left, `Copy debug info` on the right; no heading. */
  private drawHeader(el: HTMLElement): void {
    const row = new Setting(el).setName(TAB.debugName).setDesc(TAB.debugDesc);
    row.nameEl.empty();
    row.nameEl.createEl('a', {text: TAB.helpLink, href: TAB.helpUrl});
    row.addExtraButton((button) =>
      button
        .setIcon('bug')
        .setTooltip(TAB.debugName)
        .onClick(() => void this.copyDebugInfo()),
    );
  }

  /** US-013 | AC-8: gathers the facts now, copies the text, says so. */
  private async copyDebugInfo(): Promise<void> {
    await this.deps.toClipboard(debugInfo(await this.deps.debugFacts()));
    new Notice(TAB.debugCopied);
  }

  /** US-013 | AC-7: one section as `<details>` with a chevron and its heading. */
  private drawSection(
    el: HTMLElement,
    settings: CardsSettings,
    section: (typeof SECTIONS)[number],
  ): void {
    const details = el.createEl('details', {cls: 'gcc-section'});
    details.open = this.open.has(section.id);
    details.addEventListener('toggle', () => {
      if (details.open) this.open.add(section.id);
      else this.open.delete(section.id);
    });
    const summary = details.createEl('summary', {cls: 'gcc-section-summary'});
    setIcon(summary.createSpan({cls: 'gcc-chevron'}), 'chevron-right');
    new Setting(summary)
      .setName(section.title)
      .setDesc(section.description)
      .setHeading();
    const body = details.createDiv({cls: 'gcc-section-body'});
    if (section.id === 'kinds') this.drawRules(body, settings);
    else if (section.id === 'titles') this.drawFeatureRows(body, settings);
    else this.drawGroups(body, settings, section.id);
    if (RESETTABLE.includes(section.id)) this.drawReset(body, section.id);
  }

  /** US-013 | AC-7: the fields of a section, grouped under their group headings. */
  private drawGroups(
    el: HTMLElement,
    settings: CardsSettings,
    section: SectionId,
  ): void {
    const page =
      section === 'output'
        ? 'main'
        : section === 'properties'
          ? 'properties'
          : 'layout';
    for (const {group, fields} of groupsOf(page)) {
      const inSection = fields.filter((f) => sectionOf(f.id) === section);
      if (inSection.length === 0) continue;
      if (section !== 'output') new Setting(el).setName(group).setHeading();
      // US-011 AC-10: the fields as the settings of now show them
      this.drawFields(
        el,
        settings,
        inSection.filter((f) => isShown(f, settings)),
      );
      if (group === 'Sheet') this.gridEl = el.createDiv({cls: 'gcc-grid'});
      if (group === 'Scheme note') {
        this.schemeEl = el.createDiv({cls: 'gcc-grid'});
      }
    }
  }

  /**
   * US-013 | AC-9 (SCAR-016): one row per kind: the toggle `Equal title bars` and a gear
   * that opens the two sizes in a modal; the tab is drawn again when the modal closes.
   */
  private drawFeatureRows(el: HTMLElement, settings: CardsSettings): void {
    for (const row of FEATURE_ROWS) {
      const setting = new Setting(el)
        .setName(row.title)
        .setDesc(TAB.equalTitleBars);
      const error = setting.descEl.createDiv({cls: 'gcc-error'});
      setting.addToggle((toggle) =>
        toggle.setValue(valueOf(settings, row.toggle) === true).onChange(
          (on) =>
            // US-011 AC-10 (SCAR-016): the gear follows the switch of now
            void this.commit(row.toggle, on, error).then(() => {
              if (redraws(row.toggle)) void this.draw();
            }),
        ),
      );
      // US-011 AC-10: the sizes are offered only while the switch is on (SCAR-027)
      if (!defsOf(row.fields).every((f) => isShown(f, settings))) continue;
      setting.addExtraButton((button) =>
        button
          .setIcon('settings')
          .setTooltip(TAB.titleSizes)
          .onClick(() =>
            new TitleSizesModal(
              this.app,
              row,
              async (content) =>
                this.drawFields(
                  content,
                  await this.current(),
                  defsOf(row.fields),
                ),
              () => void this.draw(),
            ).open(),
          ),
      );
    }
  }

  /** One row per field, from the table: the one way a field is drawn. */
  private drawFields(
    el: HTMLElement,
    settings: CardsSettings,
    fields: FieldDef[],
  ): void {
    for (const def of fields) {
      const row = new Setting(el).setName(def.label);
      const error = row.descEl.createDiv({cls: 'gcc-error'});
      const value = valueOf(settings, def.id);
      if (def.kind === 'toggle') {
        row.addToggle((toggle) =>
          toggle.setValue(value === true).onChange(
            (on) =>
              // US-011 AC-10 (SCAR-016): after the commit, the tab from the file of now
              void this.commit(def.id, on, error).then(() => {
                if (redraws(def.id)) void this.draw();
              }),
          ),
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

  /** US-007 | AC-2, AC-8: the status line and the grid line follow the file after every change. */
  private async refresh(): Promise<void> {
    const settings = await this.current();
    this.statusEl?.setText(statusLine(settings, this.deps.vaultRoot()));
    this.gridEl?.setText(gridLine(settings.sheet));
    // US-009 AC-11: the vault is asked now, at every draw and every change (SCAR-016).
    const path = settings.schemeNote.trim();
    this.schemeEl?.setText(
      schemeLine(settings, path === '' ? null : this.deps.noteExists(path)) ??
        '',
    );
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
      button.setButtonText(TAB.chooseFolder).onClick(async () => {
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
    return homeFolder(this.env());
  }

  /** US-007 | AC-6: the kind rules and `Add rule`. */
  private drawRules(el: HTMLElement, settings: CardsSettings): void {
    settings.kindRules.forEach((rule, index) =>
      this.ruleRow(el, index, rule.folder, rule.kind, false),
    );
    if (this.pending !== null) {
      this.ruleRow(el, settings.kindRules.length, '', this.pending.kind, true);
    }
    new Setting(el).addButton((button) =>
      button.setButtonText(TAB.addRule).onClick(() => {
        this.pending ??= {kind: 'skill'};
        void this.draw();
      }),
    );
  }

  /** US-007 | AC-6: one kind rule row; a pending one is saved when its folder is typed. */
  private ruleRow(
    el: HTMLElement,
    index: number,
    folder: string,
    kind: NoteKind,
    isPending: boolean,
  ): void {
    const row = new Setting(el).setName(TAB.rule(index + 1));
    const note = row.descEl.createDiv({cls: 'gcc-error'});
    if (!isPending && folder.trim() !== '' && !this.deps.folderExists(folder)) {
      note.setText(TAB.folderNotInVault(folder.trim()));
      note.addClass('gcc-warning');
    }
    let chosen: NoteKind = kind;
    let typed = folder;
    const save = (text: string): void => {
      typed = text;
      void this.setRule(index, text, chosen, note);
    };
    row.addText((text) => {
      text.setValue(folder).setPlaceholder(TAB.folderPlaceholder);
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
        .setTooltip(TAB.deleteRule)
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

  /** US-013 | AC-10: `Reset this section to defaults` with its button. */
  private drawReset(el: HTMLElement, section: SectionId): void {
    new Setting(el).setName(TAB.resetSection).addButton((button) =>
      button
        .setButtonText(TAB.resetButton)
        .setWarning()
        .onClick(() => void this.reset(section)),
    );
  }

  /** US-013 | AC-10 (SCAR-014): asks first, the focus on Cancel; then only this section's keys. */
  private async reset(section: SectionId): Promise<void> {
    if (!(await this.deps.confirm(resetSectionDialog(section)))) return;
    try {
      await resetSection({store: this.deps.store}, section);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
    await this.draw();
  }
}
