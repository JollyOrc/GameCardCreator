// US-008 AC-2: the embedded compiler and fonts are gzip + base64 text and are
// decoded on first use only. Adapted from Obsidian2Typst's wasm-codec.ts (same
// author, MIT licence).

/**
 * US-008 | AC-2: Decodes gzip + base64 text to the original bytes.
 *
 * Refuses text that is not base64 with an error naming base64 (a build fault
 * must be loud, never an empty compiler).
 */
export async function decodeWasm(text: string): Promise<Uint8Array> {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
    throw new Error('The embedded data is not valid base64');
  }
  const binary = atob(text);
  const packed = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) packed[i] = binary.charCodeAt(i);
  const stream = new Blob([packed])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * US-008 | AC-2: A function that decodes `text` on its first call (never at
 * creation) and gives the same bytes afterwards, decoding once.
 *
 * A failed decode is not remembered: the next call tries again.
 */
export function lazyWasm(
  text: string,
  decode: (text: string) => Promise<Uint8Array> = decodeWasm,
): () => Promise<Uint8Array> {
  let pending: Promise<Uint8Array> | null = null;
  return () => {
    if (pending === null) {
      const attempt = decode(text);
      pending = attempt;
      attempt.catch(() => {
        if (pending === attempt) pending = null;
      });
    }
    return pending;
  };
}
