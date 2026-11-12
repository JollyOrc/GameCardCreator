// US-008 AC-7: the worker entry. Built as an IIFE and embedded in main.js as
// text (build/build-plugin.mjs); started from a Blob URL (start-worker.ts).
// Adapted from Obsidian2Typst's worker.ts (same author, MIT licence).
import {createWorkerCore} from './worker-core';

/** The global scope of a dedicated worker (the DOM typings do not have it). */
const scope = self as unknown as {
  postMessage(message: unknown, transfer: Transferable[]): void;
  onmessage: ((event: {data: unknown}) => void) | null;
};

const core = createWorkerCore((message, transfer = []) => {
  scope.postMessage(message, transfer);
});
scope.onmessage = (event) => {
  void core.handle(event.data);
};
