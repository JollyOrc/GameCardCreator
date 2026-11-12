// US-008 AC-4, AC-5, AC-6, AC-11 (SCAR-031): the entry point. It only builds
// the dependencies of US-005's runner from Obsidian and registers the command
// and the menus; every decision lives in a tested function. Keeps the developer
// command of the spike (ticket #13) until the settings screen exists.
import {Modal, Notice, Plugin} from 'obsidian';
import {createCardCommands} from './commands';
import {embeddedCompilerDeps} from './compiler/embedded-assets';
import {createCompiler} from './compiler/index';
import {createDiskWriter} from './disk-writer';
import {vaultAccess} from './obsidian-deps';
import {createCardsRunner} from './runner';
import {environmentLine, pageEnv, PICKER_SPIKES} from './picker-spike';
import {readSettingsFile} from './settings-file';
import {runSpike} from './spike-sheet';
import {observeLongTasks, traceDeps} from './trace';
import {
  confirmReplaceWith,
  onFileMenu,
  onFilesMenu,
  toCheckCallback,
} from './ui';

export default class GameCardCreatorPlugin extends Plugin {
  private readonly compiler = createCompiler(
    // Test builds only (M02 follow-up): steps logged with time stamps.
    traceDeps(embeddedCompilerDeps(), (line) => console.log(line)),
  );

  /** US-008 | AC-4 to AC-6: builds the runner's dependencies and registers. */
  override onload(): void {
    console.log(`GCC trace onload ${performance.now().toFixed(1)}`);
    observeLongTasks((line) => console.log(line), PerformanceObserver);
    const runner = createCardsRunner({
      ...vaultAccess(this.app),
      // Read when a run starts (never at load); `saveData` is never called.
      settings: async () => {
        const {settings, notice} = readSettingsFile(await this.loadData());
        if (notice !== null) new Notice(notice);
        return settings;
      },
      settingsFile: () =>
        `${vaultAccess(this.app).vaultRoot()}/${this.manifest.dir}/data.json`,
      compile: (source) => this.compiler.compile(source),
      isFile: (path) => createDiskWriter(path).isFile(path),
      writerFor: createDiskWriter,
      confirmReplace: (files) => confirmReplaceWith(Modal)(this.app, files),
      notice: (text) => void new Notice(text),
    });
    const commands = createCardCommands(runner);
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
    // Test builds only (US-007 G1, M03): which folder dialog works here.
    for (const spike of PICKER_SPIKES) {
      this.addCommand({
        id: `spike-folder-${spike.id}`,
        name: `Spike: pick a folder, ${spike.id} (${spike.name})`,
        callback: () =>
          void spike.run(pageEnv()).then((line) => {
            console.log(`GCC spike ${line}; ${environmentLine(pageEnv())}`);
            new Notice(`Spike ${line}`);
          }),
      });
    }
    this.addCommand({
      id: 'spike-compile',
      name: 'Spike: compile a fixed sheet (developer)',
      callback: () =>
        void runSpike(this.compiler).then(({notice, log}) => {
          console.log(log);
          new Notice(notice);
        }),
    });
  }

  /** US-008 | AC-3, AC-7: ends the compile worker when the plugin unloads. */
  override onunload(): void {
    this.compiler.dispose();
  }
}
