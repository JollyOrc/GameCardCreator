// US-008 AC-1, AC-12 (the spike): a fixed sheet of nine invented skill cards,
// the same source in Node (the reference) and in Obsidian (the measurement).
import {cardSheetTypst} from '../core/card/sheet';
import {DEFAULT_SHEET} from '../core/sheet/layout';
import {readSkill} from '../core/skill/read';
import {DEFAULT_SKILL} from '../core/skill/settings';

const NOTES = [
  [
    'Reed Sweep',
    'You sweep a **reed staff** low. Spend a success to knock an adjacent enemy *prone*.\n\n- Works only with a staff.\n- Costs one stamina.',
  ],
  [
    'Basket Knots',
    'You tie a knot that holds. The next check to undo it is **hard**.\n\n- Takes a minute.',
  ],
  [
    'Stone Skin',
    'Your skin hardens for the scene. Ignore the first wound you take, then the effect ends. *Only one at a time.*',
  ],
] as const;

/**
 * US-008 | AC-1: The Typst source of the fixed spike sheet (nine cards, A4,
 * default settings). Deterministic; throws only if the story's own settings
 * stop being valid.
 */
export function spikeSheetSource(): string {
  const cards = Array.from({length: 9}, (_, i) => {
    const [title, body] = NOTES[i % NOTES.length]!;
    const text = `---\ntags:\n  - Spike\ntiming: action\nkind: attack\n---\n${body}\n`;
    return readSkill(`skills/${title}.md`, text, DEFAULT_SKILL).card;
  });
  const result = cardSheetTypst(cards, DEFAULT_SHEET, DEFAULT_SKILL);
  if (!result.ok) throw new Error(result.message);
  return result.source;
}

/** The number of pages of a Typst PDF (its page objects), 0 if none is found. */
export function countPages(pdf: Uint8Array): number {
  const text = new TextDecoder('latin1').decode(pdf);
  return (text.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
}

/** What the developer command shows (`notice`) and logs (`log`). */
export interface SpikeReport {
  notice: string;
  log: string;
}

const hex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

/**
 * US-008 | AC-1, AC-12 (the spike): compiles the fixed sheet with `compiler` and
 * reports the time, the pages, the bytes, the fit facts, the heap (when the
 * engine gives it) and the SHA-256 of the PDF, to compare with the Node
 * reference. A failed compile is reported as such.
 */
export async function runSpike(compiler: {
  compile(source: string): Promise<{
    pdf: Uint8Array | null;
    facts: unknown[];
    message?: string;
  }>;
}): Promise<SpikeReport> {
  const started = performance.now();
  const result = await compiler.compile(spikeSheetSource());
  const ms = Math.round(performance.now() - started);
  if (result.pdf === null) {
    const text = `Spike failed after ${ms} ms: ${result.message ?? '?'}`;
    return {notice: text, log: `Game Card Creator spike: ${text}`};
  }
  const sha = hex(
    await crypto.subtle.digest('SHA-256', result.pdf.slice().buffer),
  );
  const memory = (performance as unknown as {memory?: {usedJSHeapSize: number}})
    .memory;
  const heap = memory
    ? `${Math.round(memory.usedJSHeapSize / 1048576)} MB`
    : 'n/a';
  const line = `${ms} ms, ${countPages(result.pdf)} page(s), ${result.pdf.length} bytes, ${result.facts.length} fit facts, heap ${heap}`;
  return {
    notice: `Spike: ${line}`,
    log: `Game Card Creator spike: ${line}; sha256 ${sha}`,
  };
}
