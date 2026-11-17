// US-008 AC-4, AC-5, AC-6, AC-11 (SCAR-031): the entry point. It only builds
// the dependencies of US-005's runner from Obsidian and registers the command
// and the menus and the settings tab; every decision lives in a tested function.
import {apiVersion, Modal, Notice, Plugin} from 'obsidian';
import {createCardCommands, RIBBON} from './commands';
import {gatherDebugFacts} from './debug-info';
import {embeddedCompilerDeps} from './compiler/embedded-assets';
import {createCompiler} from './compiler/index';
import {createDiskWriter} from './disk-writer';
import {enabledPlugins, pluginApi, vaultAccess} from './obsidian-deps';
import {runDialogDeps, selectionFollowers} from './run-dialog/deps';
import {openRunDialog, runSavedSelection} from './run-dialog/dialog';
import {createCardsRunner} from './runner';
import {readSettingsFile} from './settings-file';
import {createSettingsStore} from './settings/store';
import {GameCardCreatorSettingTab} from './settings/tab';
import {
  confirmDialogWith,
  confirmReplaceWith,
  onFileMenu,
  onFilesMenu,
  toCheckCallback,
} from './ui';

export default class GameCardCreatorPlugin extends Plugin {
  private readonly compiler = createCompiler(embeddedCompilerDeps());

  /** US-008 | AC-4 to AC-6: builds the runner's dependencies and registers. */
  override onload(): void {
    // US-007 AC-10: the settings screen is the only writer of data.json, through the store.
    const store = createSettingsStore({
      pluginDir: this.manifest.dir ?? '',
      loadData: () => this.loadData(),
      saveData: (data) => this.saveData(data),
      adapter: this.app.vault.adapter,
    });
    const access = vaultAccess(this.app);
    this.addSettingTab(
      new GameCardCreatorSettingTab(this.app, this, {
        store,
        vaultRoot: () => access.vaultRoot(),
        folders: () => this.app.vault.getAllFolders().map((f) => f.path),
        folderExists: (folder) =>
          this.app.vault.getFolderByPath(folder) !== null,
        // US-009 AC-11: the vault's answer only; the tab decides what it means.
        noteExists: (path) => this.app.vault.getFileByPath(path) !== null,
        confirm: (dialog) => confirmDialogWith(Modal)(this.app, dialog),
        exists: (path) => createDiskWriter(path).exists(path),
        // US-013 AC-8: gathered at the click; nothing is sent.
        debugFacts: () =>
          gatherDebugFacts({
            read: () => store.read(),
            pluginVersion: this.manifest.version,
            obsidianVersion: apiVersion,
            plugins: () => enabledPlugins(this.app),
          }),
        toClipboard: (text) => navigator.clipboard.writeText(text),
      }),
    );
    const runner = createCardsRunner({
      ...access,
      // Read when a run starts (never at load), through the store.
      settings: async () => {
        const {settings, notice} = readSettingsFile(await store.read());
        if (notice !== null) new Notice(notice);
        return settings;
      },
      settingsFile: () =>
        `${vaultAccess(this.app).vaultRoot()}/${this.manifest.dir}/data.json`,
      // US-004 AC-3: the plugin's API object as it is now (SCAR-016); the run decides.
      statblockApi: () => pluginApi(this.app, 'obsidian2typst'),
      compile: (source, extra) => this.compiler.compile(source, extra),
      coverage: (fonts) => this.compiler.coverage(fonts),
      isFile: (path) => createDiskWriter(path).isFile(path),
      writerFor: createDiskWriter,
      confirmReplace: (files) => confirmReplaceWith(Modal)(this.app, files),
      notice: (text) => void new Notice(text),
    });
    const commands = createCardCommands(runner);
    // US-013 AC-1 to AC-6: the run dialog, its two entry points and the saved selection.
    const dialogDeps = runDialogDeps({
      app: this.app,
      store,
      vaultRoot: () => access.vaultRoot(),
      pluginId: this.manifest.id,
      run: (items) => runner.runSelection(items),
      notice: (text) => void new Notice(text),
    });
    const openDialog = (): void =>
      void openRunDialog(Modal, this.app, dialogDeps);
    this.addRibbonIcon(RIBBON.icon, RIBBON.title, openDialog);
    this.addCommand({
      id: commands.dialogCommand.id,
      name: commands.dialogCommand.name,
      callback: openDialog,
    });
    this.addCommand({
      id: commands.savedSelectionCommand.id,
      name: commands.savedSelectionCommand.name,
      callback: () => void runSavedSelection(dialogDeps),
    });
    // US-013 AC-6: the saved selection follows renames and deletes (by path segments).
    const follow = selectionFollowers({store});
    this.registerEvent(this.app.vault.on('rename', follow.onRename));
    this.registerEvent(this.app.vault.on('delete', follow.onDelete));
    this.addCommand({
      id: commands.deckCommand.id,
      name: commands.deckCommand.name,
      checkCallback: toCheckCallback(commands.deckCommand, () =>
        this.app.workspace.getActiveFile(),
      ),
    });
    this.registerEvent(
      this.app.workspace.on('file-menu', onFileMenu(commands)),
    );
    this.registerEvent(
      this.app.workspace.on('files-menu', onFilesMenu(commands)),
    );
  }

  /** US-008 | AC-3, AC-7: ends the compile worker when the plugin unloads. */
  override onunload(): void {
    this.compiler.dispose();
  }
}
