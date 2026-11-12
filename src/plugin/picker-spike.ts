// US-007 G1 (the spike, M03): which way of opening the system's folder dialog works
// in the author's Obsidian. Test builds only: each candidate reports what it got and
// changes nothing; the whole file is removed before a release (ticket #16). The
// environment is a parameter, so the candidates run in Node against fakes too.

/** The part of the page's environment the candidates use. */
export interface PickerEnv {
  /** `window.require` of the desktop app (Node's `require` for the renderer). */
  require?: (id: string) => unknown;
  /** Makes an `<input>` (for `type=file` with `webkitdirectory`). */
  createInput(): FileInputLike;
  /** `window.showDirectoryPicker`, when the engine has it. */
  showDirectoryPicker?: () => Promise<{name: string}>;
  /** `process.versions` and the user agent, for the record. */
  versions: Record<string, string | undefined>;
  userAgent: string;
}

/** The part of an `<input type=file>` the candidate uses. */
export interface FileInputLike {
  type: string;
  webkitdirectory: boolean;
  files: ArrayLike<{
    path?: string;
    webkitRelativePath: string;
    name: string;
  }> | null;
  addEventListener(type: 'change' | 'cancel', listener: () => void): void;
  click(): void;
}

/** One candidate: `run` answers one line of text for the log, never throws. */
export interface PickerSpike {
  id: string;
  name: string;
  run(env: PickerEnv): Promise<string>;
}

interface Dialog {
  showOpenDialog(options: {
    properties: string[];
  }): Promise<{canceled: boolean; filePaths: string[]}>;
}

const failed = (label: string, error: unknown): string =>
  `${label}: threw ${error instanceof Error ? error.message : String(error)}`;

/** Candidate A or B: an Electron `dialog` found by `find`. */
const dialogSpike = (
  id: string,
  name: string,
  find: (env: PickerEnv) => Dialog | undefined,
): PickerSpike => ({
  id,
  name,
  async run(env) {
    try {
      const dialog = find(env);
      if (dialog === undefined) return `${id}: no dialog object here`;
      const answer = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });
      return `${id}: canceled=${answer.canceled} paths=${JSON.stringify(answer.filePaths)}`;
    } catch (error) {
      return failed(id, error);
    }
  },
});

/** `require(id)` when there is a `require`, else undefined; a throw is undefined. */
function tryRequire(env: PickerEnv, id: string): unknown {
  try {
    return env.require?.(id);
  } catch {
    return undefined;
  }
}

/** The four candidates, in the order the author runs them. */
export const PICKER_SPIKES: readonly PickerSpike[] = [
  dialogSpike(
    'A',
    'electron.remote.dialog',
    (env) =>
      (tryRequire(env, 'electron') as {remote?: {dialog?: Dialog}} | undefined)
        ?.remote?.dialog,
  ),
  dialogSpike(
    'B',
    '@electron/remote dialog',
    (env) =>
      (tryRequire(env, '@electron/remote') as {dialog?: Dialog} | undefined)
        ?.dialog,
  ),
  {
    id: 'C',
    name: 'input type=file with webkitdirectory',
    run: (env) =>
      new Promise<string>((resolve) => {
        try {
          const input = env.createInput();
          input.type = 'file';
          input.webkitdirectory = true;
          input.addEventListener('cancel', () => resolve('C: cancelled'));
          input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (file === undefined) return resolve('C: no file in the answer');
            const utils = (
              tryRequire(env, 'electron') as
                | {
                    webUtils?: {getPathForFile(f: unknown): string};
                  }
                | undefined
            )?.webUtils;
            let viaUtils = 'no webUtils';
            try {
              if (utils !== undefined) viaUtils = utils.getPathForFile(file);
            } catch (error) {
              viaUtils = failed('webUtils', error);
            }
            resolve(
              `C: files=${input.files?.length} first.path=${JSON.stringify(file.path)} ` +
                `webkitRelativePath=${JSON.stringify(file.webkitRelativePath)} ` +
                `webUtils.getPathForFile=${JSON.stringify(viaUtils)}`,
            );
          });
          input.click();
        } catch (error) {
          resolve(failed('C', error));
        }
      }),
  },
  {
    id: 'D',
    name: 'window.showDirectoryPicker',
    async run(env) {
      try {
        if (env.showDirectoryPicker === undefined) {
          return 'D: showDirectoryPicker is not available';
        }
        const handle = await env.showDirectoryPicker();
        return `D: handle name=${JSON.stringify(handle.name)} (a name, no path)`;
      } catch (error) {
        return failed('D', error);
      }
    },
  },
];

/** One line with the versions the answer depends on. */
export function environmentLine(env: PickerEnv): string {
  const v = env.versions;
  return `electron ${v.electron ?? '?'}, chrome ${v.chrome ?? '?'}, node ${v.node ?? '?'}; ${env.userAgent}`;
}

/** The real environment of the page (not tested in Node: only the page has these). */
export function pageEnv(): PickerEnv {
  const w = window as unknown as {
    require?: (id: string) => unknown;
    showDirectoryPicker?: () => Promise<{name: string}>;
  };
  return {
    require: w.require,
    createInput: () =>
      document.createElement('input') as unknown as FileInputLike,
    showDirectoryPicker: w.showDirectoryPicker?.bind(window),
    versions: process.versions,
    userAgent: navigator.userAgent,
  };
}
