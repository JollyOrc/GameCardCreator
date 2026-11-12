// US-007 G1 (the spike, M03): the four candidates for the system's folder dialog
// report what they got, one line each, never throw, and change nothing. Run
// against fakes of the page's environment; the real behaviour is M03's.
import {describe, expect, it} from 'vitest';
import {
  environmentLine,
  PICKER_SPIKES,
  type FileInputLike,
  type PickerEnv,
} from '../../src/plugin/picker-spike';

const spike = (id: string) => PICKER_SPIKES.find((s) => s.id === id)!;

/** An input that records its settings and lets the test fire its events. */
function fakeInput(files: FileInputLike['files'] = null) {
  const listeners: Record<string, (() => void)[]> = {};
  const input: FileInputLike & {fire(type: string): void; clicks: number} = {
    type: '',
    webkitdirectory: false,
    files,
    clicks: 0,
    addEventListener: (type, fn) => void (listeners[type] ??= []).push(fn),
    click() {
      this.clicks++;
    },
    fire: (type) => listeners[type]?.forEach((fn) => fn()),
  };
  return input;
}
const env = (over: Partial<PickerEnv> = {}): PickerEnv => ({
  createInput: () => fakeInput(),
  versions: {electron: '99.1', chrome: '200.0', node: '30.0'},
  userAgent: 'FakeAgent/1.0',
  ...over,
});

describe('the candidates are the four of the story, in order', () => {
  it('ids A to D', () => {
    expect(PICKER_SPIKES.map((s) => s.id)).toEqual(['A', 'B', 'C', 'D']);
  });
  it('environmentLine names electron, chrome, node and the agent; unknown versions show ?', () => {
    expect(environmentLine(env())).toBe(
      'electron 99.1, chrome 200.0, node 30.0; FakeAgent/1.0',
    );
    expect(environmentLine(env({versions: {}}))).toContain('electron ?');
  });
});

describe.each([
  ['A', (d: unknown) => ({electron: {remote: {dialog: d}}})],
  ['B', (d: unknown) => ({'@electron/remote': {dialog: d}})],
] as const)('candidate %s: an Electron dialog', (id, modules) => {
  const withDialog = (dialog: unknown): PickerEnv =>
    env({require: (m) => (modules(dialog) as Record<string, unknown>)[m]});
  it('reports the paths of an answer, asking for a directory', async () => {
    const asked: unknown[] = [];
    const line = await spike(id).run(
      withDialog({
        showOpenDialog: async (o: unknown) => (
          asked.push(o),
          {canceled: false, filePaths: ['/a/b']}
        ),
      }),
    );
    expect(line).toBe(`${id}: canceled=false paths=["/a/b"]`);
    expect(asked).toEqual([{properties: ['openDirectory']}]);
  });
  it('reports a cancel with no paths', async () => {
    const line = await spike(id).run(
      withDialog({
        showOpenDialog: async () => ({canceled: true, filePaths: []}),
      }),
    );
    expect(line).toBe(`${id}: canceled=true paths=[]`);
  });
  it('says so when there is no dialog object, no require, or the module throws', async () => {
    expect(await spike(id).run(env())).toBe(`${id}: no dialog object here`);
    expect(await spike(id).run(env({require: () => ({})}))).toBe(
      `${id}: no dialog object here`,
    );
    expect(
      await spike(id).run(
        env({
          require: () => {
            throw new Error('Cannot find module');
          },
        }),
      ),
    ).toBe(`${id}: no dialog object here`);
  });
  it('reports a dialog that throws, and does not throw itself', async () => {
    const line = await spike(id).run(
      withDialog({
        showOpenDialog: async () => {
          throw new Error('boom');
        },
      }),
    );
    expect(line).toBe(`${id}: threw boom`);
  });
});

describe('candidate C: input with webkitdirectory', () => {
  const file = {
    path: '/Users/x/cards/a.txt',
    webkitRelativePath: 'cards/a.txt',
    name: 'a.txt',
  };
  it('sets type file and webkitdirectory, clicks once, and reports path, relative path and webUtils', async () => {
    const input = fakeInput([file]);
    const done = spike('C').run(
      env({
        createInput: () => input,
        require: () => ({
          webUtils: {getPathForFile: () => '/Users/x/cards/a.txt'},
        }),
      }),
    );
    expect(input.type).toBe('file');
    expect(input.webkitdirectory).toBe(true);
    expect(input.clicks).toBe(1);
    input.fire('change');
    expect(await done).toBe(
      'C: files=1 first.path="/Users/x/cards/a.txt" webkitRelativePath="cards/a.txt" webUtils.getPathForFile="/Users/x/cards/a.txt"',
    );
  });
  it('reports a missing legacy path and a missing webUtils as such', async () => {
    const input = fakeInput([
      {webkitRelativePath: 'cards/a.txt', name: 'a.txt'},
    ]);
    const done = spike('C').run(env({createInput: () => input}));
    input.fire('change');
    expect(await done).toBe(
      'C: files=1 first.path=undefined webkitRelativePath="cards/a.txt" webUtils.getPathForFile="no webUtils"',
    );
  });
  it('a webUtils that throws is reported, not thrown', async () => {
    const input = fakeInput([file]);
    const done = spike('C').run(
      env({
        createInput: () => input,
        require: () => ({
          webUtils: {
            getPathForFile: () => {
              throw new Error('bad file');
            },
          },
        }),
      }),
    );
    input.fire('change');
    expect(await done).toContain(
      'webUtils.getPathForFile="webUtils: threw bad file"',
    );
  });
  it('a cancel, an empty answer and a failing environment are reported', async () => {
    const a = fakeInput();
    const cancelled = spike('C').run(env({createInput: () => a}));
    a.fire('cancel');
    expect(await cancelled).toBe('C: cancelled');
    const b = fakeInput([]);
    const empty = spike('C').run(env({createInput: () => b}));
    b.fire('change');
    expect(await empty).toBe('C: no file in the answer');
    expect(
      await spike('C').run(
        env({
          createInput: () => {
            throw new Error('no document');
          },
        }),
      ),
    ).toBe('C: threw no document');
  });
});

describe('candidate D: showDirectoryPicker', () => {
  it('reports the handle name and that it is no path; unavailable and throwing are reported', async () => {
    expect(
      await spike('D').run(
        env({showDirectoryPicker: async () => ({name: 'cards'})}),
      ),
    ).toBe('D: handle name="cards" (a name, no path)');
    expect(await spike('D').run(env())).toBe(
      'D: showDirectoryPicker is not available',
    );
    expect(
      await spike('D').run(
        env({
          showDirectoryPicker: async () => {
            throw new Error('AbortError');
          },
        }),
      ),
    ).toBe('D: threw AbortError');
  });
});
