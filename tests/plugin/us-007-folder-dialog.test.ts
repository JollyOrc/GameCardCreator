// US-007 AC-5, D1, D13: the folder dialog function: A (electron.remote.dialog)
// first, then B (@electron/remote), then "unavailable"; the dialog asks for a
// directory and starts at `startAt`; a cancel is not an error; the start folder is
// the stored output folder when it exists, otherwise Documents. Measured in M03
// (Electron 43.8.4, Obsidian 1.15.0); `defaultPath` is not measured there.
// Red until the tickets.
import {describe, expect, it} from 'vitest';
import {
  chooseFolder,
  dialogStart,
  folderDialogAvailable,
} from '../../src/plugin/settings/folder-dialog';

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
