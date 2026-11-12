// US-008 AC-12 (the spike, M02 follow-up): the trace helpers of test builds
// change nothing but the console: results and errors pass through, every step
// is logged with start and end on the injected clock, an unsupported entry
// type is reported and never thrown.
import {describe, expect, it} from 'vitest';
import type {CompilerDeps} from '../../src/plugin/compiler/index';
import {
  observeLongTasks,
  traceDeps,
  type ObserverApi,
} from '../../src/plugin/trace';

const worker = {
  postMessage: () => undefined,
  terminate: () => undefined,
  onmessage: null,
  onerror: null,
};
function deps(over: Partial<CompilerDeps> = {}): CompilerDeps {
  return {
    startWorker: () => worker,
    compilerText: () => 'AB',
    fontTexts: () => ['C'],
    ...over,
  };
}
const clock = () => {
  let t = 0;
  return () => (t += 10);
};

describe('traceDeps', () => {
  it('passes the results on and logs start and end of each step in order', async () => {
    const lines: string[] = [];
    const traced = traceDeps(deps(), (l) => lines.push(l), clock());
    expect(traced.compilerText()).toBe('AB');
    expect(traced.fontTexts()).toEqual(['C']);
    expect(await traced.startWorker()).toBe(worker);
    expect(lines).toEqual([
      'GCC trace compilerText start 10.0',
      'GCC trace compilerText end 20.0',
      'GCC trace fontTexts start 30.0',
      'GCC trace fontTexts end 40.0',
      'GCC trace startWorker start 50.0',
      'GCC trace startWorker end 60.0',
    ]);
  });
  it('a step that returns a rejected promise is logged as failed and still rejects with the same error', async () => {
    const lines: string[] = [];
    const boom = new Error('no worker');
    const traced = traceDeps(
      deps({startWorker: () => Promise.reject(boom)}),
      (l) => lines.push(l),
      clock(),
    );
    await expect(traced.startWorker()).rejects.toBe(boom);
    expect(lines).toEqual([
      'GCC trace startWorker start 10.0',
      'GCC trace startWorker failed 20.0',
    ]);
  });
  it('a throwing text step is logged as failed and throws the same error', () => {
    const lines: string[] = [];
    const boom = new Error('decode failed');
    const traced = traceDeps(
      deps({
        compilerText: () => {
          throw boom;
        },
      }),
      (l) => lines.push(l),
      clock(),
    );
    expect(() => traced.compilerText()).toThrow(boom);
    expect(lines.at(-1)).toBe('GCC trace compilerText failed 20.0');
  });
  it('a synchronous throw is logged as failed and thrown unchanged', () => {
    const lines: string[] = [];
    const boom = new Error('no worker');
    const traced = traceDeps(
      deps({
        startWorker: () => {
          throw boom;
        },
      }),
      (l) => lines.push(l),
      clock(),
    );
    expect(() => traced.startWorker()).toThrow(boom);
    expect(lines).toEqual([
      'GCC trace startWorker start 10.0',
      'GCC trace startWorker failed 20.0',
    ]);
  });
});

describe('observeLongTasks', () => {
  /** A fake observer that records what is observed and lets the test deliver entries. */
  function fakeApi(supported: string[], failOn?: string) {
    const observed: {type: string; buffered: boolean}[] = [];
    const callbacks: ((l: {getEntries(): {toJSON(): unknown}[]}) => void)[] =
      [];
    const api = class {
      static supportedEntryTypes = supported;
      constructor(cb: (l: {getEntries(): {toJSON(): unknown}[]}) => void) {
        callbacks.push(cb);
      }
      observe(o: {type: string; buffered: boolean}): void {
        if (o.type === failOn) throw new Error('refused');
        observed.push(o);
      }
    } as unknown as ObserverApi;
    return {api, observed, callbacks};
  }
  it('observes both types with buffered entries and logs each entry as JSON', () => {
    const lines: string[] = [];
    const {api, observed, callbacks} = fakeApi([
      'longtask',
      'long-animation-frame',
    ]);
    observeLongTasks((l) => lines.push(l), api);
    expect(observed).toEqual([
      {type: 'longtask', buffered: true},
      {type: 'long-animation-frame', buffered: true},
    ]);
    callbacks[1]!({
      getEntries: () => [
        {
          toJSON: () => ({
            duration: 152,
            scripts: [{invoker: 'TimerHandler:setTimeout'}],
          }),
        },
      ],
    });
    expect(lines).toEqual([
      'GCC trace long-animation-frame {"duration":152,"scripts":[{"invoker":"TimerHandler:setTimeout"}]}',
    ]);
  });
  it('an unsupported type is reported, the supported one still observed', () => {
    const lines: string[] = [];
    const {api, observed} = fakeApi(['longtask']);
    observeLongTasks((l) => lines.push(l), api);
    expect(observed).toEqual([{type: 'longtask', buffered: true}]);
    expect(lines).toEqual([
      'GCC trace long entries: long-animation-frame is not supported here',
    ]);
  });
  it('an observer that refuses is reported and does not throw; no API is reported', () => {
    const lines: string[] = [];
    const {api} = fakeApi(['longtask', 'long-animation-frame'], 'longtask');
    expect(() => observeLongTasks((l) => lines.push(l), api)).not.toThrow();
    expect(lines).toEqual([
      'GCC trace longtask could not be observed: Error: refused',
    ]);
    const none: string[] = [];
    observeLongTasks((l) => none.push(l), undefined);
    expect(none).toEqual([
      'GCC trace long entries: PerformanceObserver is not available',
    ]);
  });
});
