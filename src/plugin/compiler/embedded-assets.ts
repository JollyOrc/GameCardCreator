// US-008 AC-2: the embedded compiler and fonts as the lazy sources the compile
// service reads; nothing is decoded until the first compile. Not tested in
// Node (the embedded modules exist only in the bundle): the spike (M02)
// measures it.
import compilerWasmText from 'embedded:compiler-wasm';
import fontTexts from 'embedded:fonts';
import type {CompilerDeps} from './index';
import {startWorker} from './start-worker';

/**
 * US-008 | AC-2, AC-7, AC-13: The dependencies of the compile service: the
 * embedded compiler and fonts as the texts the build holds, and the embedded
 * worker. The main thread decodes nothing: the worker does.
 */
export function embeddedCompilerDeps(): CompilerDeps {
  return {
    startWorker,
    compilerText: () => compilerWasmText,
    fontTexts: () => fontTexts,
  };
}
