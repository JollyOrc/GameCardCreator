// US-008 AC-12 (the spike, M02 follow-up): evidence for the 152 ms main-thread
// violation seen on the first compile. Test builds only: it logs to the
// developer console, changes no behaviour, and is removed before a release.
import type {CompilerDeps} from './compiler/index';

/** Writes one line to the console (a parameter, so a test can collect). */
export type Log = (line: string) => void;

/** `performance.now()` as text with one decimal. */
const at = (now: () => number): string => now().toFixed(1);

/**
 * US-008 | AC-12: `deps` with each step logged as `<name> start <ms>` and
 * `<name> end <ms>` (and `failed`), on the page's clock (`performance.now`),
 * the same clock as the long-task entries. Results and errors pass unchanged.
 */
export function traceDeps(
  deps: CompilerDeps,
  log: Log,
  now: () => number = () => performance.now(),
): CompilerDeps {
  const step =
    <A extends unknown[], R>(name: string, run: (...args: A) => R) =>
    (...args: A): R => {
      log(`GCC trace ${name} start ${at(now)}`);
      try {
        const result = run(...args);
        if (result instanceof Promise) {
          return result.then(
            (value: unknown) => {
              log(`GCC trace ${name} end ${at(now)}`);
              return value;
            },
            (error: unknown) => {
              log(`GCC trace ${name} failed ${at(now)}`);
              throw error;
            },
          ) as R;
        }
        log(`GCC trace ${name} end ${at(now)}`);
        return result;
      } catch (error) {
        log(`GCC trace ${name} failed ${at(now)}`);
        throw error;
      }
    };
  return {
    startWorker: step('startWorker', deps.startWorker),
    compilerText: step('compilerText', deps.compilerText),
    fontTexts: step('fontTexts', deps.fontTexts),
  };
}

/** The part of Chromium's `PerformanceObserver` the trace uses. */
export interface ObserverApi {
  new (callback: (list: {getEntries(): {toJSON(): unknown}[]}) => void): {
    observe(options: {type: string; buffered: boolean}): void;
  };
  supportedEntryTypes?: readonly string[];
}

/**
 * US-008 | AC-12: logs every `longtask` and `long-animation-frame` entry (the
 * second names the scripts that ran, with their invoker such as a `setTimeout`
 * handler and their source), including those from before the call
 * (`buffered`). A type the engine does not know is reported once; nothing
 * throws.
 */
export function observeLongTasks(log: Log, api: ObserverApi | undefined): void {
  if (api === undefined) {
    log('GCC trace long entries: PerformanceObserver is not available');
    return;
  }
  for (const type of ['longtask', 'long-animation-frame']) {
    if (!(api.supportedEntryTypes ?? []).includes(type)) {
      log(`GCC trace long entries: ${type} is not supported here`);
      continue;
    }
    try {
      const observer = new api((list) => {
        for (const entry of list.getEntries()) {
          log(`GCC trace ${type} ${JSON.stringify(entry.toJSON())}`);
        }
      });
      observer.observe({type, buffered: true});
    } catch (error) {
      log(`GCC trace ${type} could not be observed: ${String(error)}`);
    }
  }
}
