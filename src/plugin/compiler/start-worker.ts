// US-008 AC-2, AC-7: starts the compile worker from the code that is embedded
// in main.js (a Blob URL; the plugin folder holds no worker file). Adapted from
// Obsidian2Typst's start-worker.ts (same author, MIT licence). Checked only by
// the spike (M02): Node has no Blob-URL worker like Electron's.
import workerSource from 'embedded:worker-source';
import type {WorkerLike} from './index';

/**
 * US-008 | AC-7: Starts one compile worker; the address of its code is
 * released as soon as the worker has the code.
 */
export function startWorker(): WorkerLike {
  const url = URL.createObjectURL(
    new Blob([workerSource], {type: 'text/javascript'}),
  );
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  const like: WorkerLike = {
    postMessage: (message, transfer = []) =>
      worker.postMessage(message, transfer),
    terminate: () => worker.terminate(),
    onmessage: null,
    onerror: null,
  };
  worker.onmessage = (event: MessageEvent) =>
    like.onmessage?.({data: event.data});
  worker.onerror = (event: ErrorEvent) =>
    like.onerror?.({message: event.message});
  return like;
}
