// US-008 AC-2: build-time helper that puts binary assets into main.js as text.
// Adapted from Obsidian2Typst's build/embed.mjs (same author, MIT licence).
import {gzipSync} from 'node:zlib';

/**
 * US-008 | AC-2: gzip (level 9) of `bytes`, as base64 without line breaks.
 *
 * The text is decoded by `decodeWasm` (src/plugin/compiler/wasm-codec.ts) on
 * first use. Deterministic: gzip of the same bytes gives the same text.
 */
export function gzipBase64(bytes) {
  return gzipSync(bytes, {level: 9}).toString('base64');
}
