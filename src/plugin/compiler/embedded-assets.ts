// US-008 AC-2: the embedded compiler and fonts as the lazy sources the compile
// service reads; nothing is decoded until the first compile. Not tested in
// Node (the embedded modules exist only in the bundle): the spike (M02)
// measures it.
import compilerWasmText from 'embedded:compiler-wasm';
import fontTexts from 'embedded:fonts';
import {createCompiler, type Compiler} from './index';
import {startWorker} from './start-worker';
import {lazyWasm} from './wasm-codec';

/**
 * US-008 | AC-2, AC-7: The compile service over the embedded compiler, the
 * embedded fonts and the embedded worker. Creating it starts and decodes
 * nothing.
 */
export function createEmbeddedCompiler(): Compiler {
  const wasm = lazyWasm(compilerWasmText);
  const fonts = fontTexts.map((text) => lazyWasm(text));
  return createCompiler({
    startWorker,
    compilerWasm: wasm,
    fonts: () => Promise.all(fonts.map((font) => font())),
  });
}
