// US-007 AC-5, D1, D13: the folder dialog function: A (electron.remote.dialog)
// first, then B (@electron/remote), then "unavailable"; the dialog asks for a
// directory and starts at `startAt`; a cancel is not an error; the start folder is
// the stored output folder when it exists, otherwise Documents. Measured in M03
// (Electron 43.8.4, Obsidian 1.15.0); `defaultPath` is not measured there.
// Red until the tickets.
import {describe, expect, it} from 'vitest';
import {commitSetting} from '../../src/plugin/settings/commit';
import {
  chooseFolder,
  dialogStart,
  folderDialogAvailable,
  pickOutputFolder,
} from '../../src/plugin/settings/folder-dialog';
import {memoryStore} from '../support/memory-store';

interface Call {
  via: string;
  options: unknown;
}
/** An environment whose `require` knows the modules in `modules`; every dialog logs its call. */
function env(modules: Record<string, unknown>): {
  require: (id: string) => unknown;
} {
  return {
    require: (id: string) => {
      if (!(id in modules)) throw new Error(`Cannot find module '${id}'`);
      return modules[id];
    },
  };
}
const dialog = (
  via: string,
  calls: Call[],
  answer: () => Promise<{canceled: boolean; filePaths: string[]}>,
) => ({
  showOpenDialog: async (options: unknown) => {
    calls.push({via, options});
    return answer();
  },
});

describe('US-007 AC-5: chooseFolder', () => {
  it('A answers a path: chosen, A asked for a directory at the start folder, B not asked', async () => {
    const calls: Call[] = [];
    const answer = await chooseFolder(
      env({
        electron: {
          remote: {
            dialog: dialog('A', calls, async () => ({
              canceled: false,
              filePaths: ['/Users/x/cards'],
            })),
          },
        },
        '@electron/remote': {
          dialog: dialog('B', calls, async () => ({
            canceled: true,
            filePaths: [],
          })),
        },
      }),
      '/Users/x/Documents',
    );
    expect(answer).toEqual({kind: 'chosen', path: '/Users/x/cards'});
    expect(calls).toEqual([
      {
        via: 'A',
        options: {
          properties: ['openDirectory'],
          defaultPath: '/Users/x/Documents',
        },
      },
    ]);
  });
  it('A cancelled: cancelled, B is not asked (the author said no)', async () => {
    const calls: Call[] = [];
    const answer = await chooseFolder(
      env({
        electron: {
          remote: {
            dialog: dialog('A', calls, async () => ({
              canceled: true,
              filePaths: [],
            })),
          },
        },
        '@electron/remote': {
          dialog: dialog('B', calls, async () => ({
            canceled: false,
            filePaths: ['/b'],
          })),
        },
      }),
      '/s',
    );
    expect(answer).toEqual({kind: 'cancelled'});
    expect(calls.map((c) => c.via)).toEqual(['A']);
  });
  it('A answers "not cancelled" with no path: cancelled (nothing to use)', async () => {
    const answer = await chooseFolder(
      env({
        electron: {
          remote: {
            dialog: dialog('A', [], async () => ({
              canceled: false,
              filePaths: [],
            })),
          },
        },
      }),
      '/s',
    );
    expect(answer).toEqual({kind: 'cancelled'});
  });
  it('no A (no remote, no dialog, no electron): B is used', async () => {
    for (const first of [{electron: {}}, {electron: {remote: {}}}, {}]) {
      const calls: Call[] = [];
      const answer = await chooseFolder(
        env({
          ...first,
          '@electron/remote': {
            dialog: dialog('B', calls, async () => ({
              canceled: false,
              filePaths: ['/from/b'],
            })),
          },
        }),
        '/s',
      );
      expect(answer, JSON.stringify(first)).toEqual({
        kind: 'chosen',
        path: '/from/b',
      });
      expect(calls.map((c) => c.via)).toEqual(['B']);
    }
  });
  it('A throws: B is tried; both throw or are missing: unavailable (the caller hides the button)', async () => {
    const calls: Call[] = [];
    const throwing = {
      showOpenDialog: async () => {
        throw new Error('boom');
      },
    };
    const viaB = await chooseFolder(
      env({
        electron: {remote: {dialog: throwing}},
        '@electron/remote': {
          dialog: dialog('B', calls, async () => ({
            canceled: false,
            filePaths: ['/b'],
          })),
        },
      }),
      '/s',
    );
    expect(viaB).toEqual({kind: 'chosen', path: '/b'});
    expect(
      await chooseFolder(
        env({
          electron: {remote: {dialog: throwing}},
          '@electron/remote': {dialog: throwing},
        }),
        '/s',
      ),
    ).toEqual({kind: 'unavailable'});
    expect(await chooseFolder(env({}), '/s')).toEqual({kind: 'unavailable'});
    expect(await chooseFolder({}, '/s')).toEqual({kind: 'unavailable'});
  });
});

describe('US-007 AC-5: where the dialog starts', () => {
  const exists = (known: string[]) => async (p: string) => known.includes(p);
  it('the stored output folder when it exists', async () => {
    expect(
      await dialogStart('/out/cards', '/Users/x', exists(['/out/cards'])),
    ).toBe('/out/cards');
  });
  it('Documents when nothing is stored, only spaces are, or the stored folder does not exist', async () => {
    expect(await dialogStart('', '/Users/x', exists([]))).toBe(
      '/Users/x/Documents',
    );
    expect(await dialogStart('   ', '/Users/x', exists(['   ']))).toBe(
      '/Users/x/Documents',
    );
    expect(await dialogStart('/gone', '/Users/x', exists([]))).toBe(
      '/Users/x/Documents',
    );
  });
  it('the separator of the home folder is kept; a trailing separator is not doubled', async () => {
    expect(await dialogStart('', '/Users/x/', exists([]))).toBe(
      '/Users/x/Documents',
    );
    expect(await dialogStart('', 'C:\\Users\\x', exists([]))).toBe(
      'C:\\Users\\x\\Documents',
    );
  });
  it('an existence check that throws counts as "does not exist"', async () => {
    expect(
      await dialogStart('/out', '/Users/x', async () => {
        throw new Error('no access');
      }),
    ).toBe('/Users/x/Documents');
  });
});

describe('US-007 AC-5: the button is shown only when a dialog could open', () => {
  const some = {showOpenDialog: async () => ({canceled: true, filePaths: []})};
  it('true when A or B has a dialog object; nothing is opened by asking', () => {
    expect(
      folderDialogAvailable(env({electron: {remote: {dialog: some}}})),
    ).toBe(true);
    expect(
      folderDialogAvailable(env({'@electron/remote': {dialog: some}})),
    ).toBe(true);
    expect(
      folderDialogAvailable(
        env({
          electron: {remote: {dialog: some}},
          '@electron/remote': {dialog: some},
        }),
      ),
    ).toBe(true);
  });
  it('false when neither has one, there is no require, or a module throws', () => {
    expect(folderDialogAvailable(env({}))).toBe(false);
    expect(folderDialogAvailable(env({electron: {}}))).toBe(false);
    expect(folderDialogAvailable(env({electron: {remote: {}}}))).toBe(false);
    expect(folderDialogAvailable({})).toBe(false);
  });
  it('asking does not call the dialog', () => {
    let opened = 0;
    const counting = {
      showOpenDialog: async () => (opened++, {canceled: true, filePaths: []}),
    };
    folderDialogAvailable(env({electron: {remote: {dialog: counting}}}));
    expect(opened).toBe(0);
  });
});

describe("US-007 AC-5 (found by M04): what the screen does with the dialog's answer", () => {
  const answering = (paths: string[], canceled = false) =>
    env({
      electron: {
        remote: {
          dialog: {
            showOpenDialog: async () => ({canceled, filePaths: paths}),
          },
        },
      },
    });
  it('a refused path comes back with its message and saved: false (the page must not be redrawn over it)', async () => {
    const asked: string[] = [];
    const outcome = await pickOutputFolder({
      env: answering(['/v']),
      startAt: async () => '/s',
      commit: async (path) => (
        asked.push(path),
        {ok: false, message: 'Output folder "/v" is the vault\'s own folder'}
      ),
    });
    expect(asked).toEqual(['/v']);
    expect(outcome).toEqual({
      path: '/v',
      message: 'Output folder "/v" is the vault\'s own folder',
      saved: false,
    });
  });
  it('an accepted path: no message, saved: true, the path as the dialog gave it', async () => {
    const outcome = await pickOutputFolder({
      env: answering(['/out/cards']),
      startAt: async () => '/s',
      commit: async () => ({ok: true, warnings: []}),
    });
    expect(outcome).toEqual({path: '/out/cards', message: '', saved: true});
  });
  it('a cancel is null and nothing is committed', async () => {
    let commits = 0;
    const outcome = await pickOutputFolder({
      env: answering([], true),
      startAt: async () => '/s',
      commit: async () => (commits++, {ok: true, warnings: []}),
    });
    expect(outcome).toBeNull();
    expect(commits).toBe(0);
  });
  it('no dialog: a message that says to type the path, nothing committed', async () => {
    let commits = 0;
    const outcome = await pickOutputFolder({
      env: env({}),
      startAt: async () => '/s',
      commit: async () => (commits++, {ok: true, warnings: []}),
    });
    expect(outcome).toEqual({
      path: '',
      message: 'No folder dialog is available here: type the path',
      saved: false,
    });
    expect(commits).toBe(0);
  });
  it('the start folder is asked when the dialog opens, not before (SCAR-016)', async () => {
    const order: string[] = [];
    await pickOutputFolder({
      env: env({
        electron: {
          remote: {
            dialog: {
              showOpenDialog: async (o: {defaultPath: string}) => (
                order.push(`dialog at ${o.defaultPath}`),
                {canceled: true, filePaths: []}
              ),
            },
          },
        },
      }),
      startAt: async () => (order.push('start asked'), '/stored'),
      commit: async () => ({ok: true, warnings: []}),
    });
    expect(order).toEqual(['start asked', 'dialog at /stored']);
  });
  it("composed with the real commit: the vault itself is refused with the check's message, the old setting is kept, the message reaches the caller", async () => {
    const store = memoryStore({outputFolder: '/keep'});
    const outcome = await pickOutputFolder({
      env: answering(['/v']),
      startAt: async () => '/s',
      commit: (path) =>
        commitSetting({store, vaultRoot: () => '/v'}, 'outputFolder', path),
    });
    expect(outcome).toEqual({
      path: '/v',
      message: 'Output folder "/v" is the vault\'s own folder',
      saved: false,
    });
    expect(store.writes).toEqual([]);
    expect(store.file()).toEqual({outputFolder: '/keep'});
  });
});
