// US-008 #13 (the spike build): a minimal entry point with one developer
// command that compiles the fixed sheet and shows the time, the pages and the
// bytes. Replaced by the real entry point in ticket #14.
import {Notice, Plugin} from 'obsidian';
import {createEmbeddedCompiler} from './compiler/embedded-assets';
import type {Compiler} from './compiler/index';
import {countPages, spikeSheetSource} from './spike-sheet';

const hex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

export default class GameCardCreatorPlugin extends Plugin {
  private compiler: Compiler | null = null;

  /** US-008 | AC-7, AC-12: the compiler exists from the first command, not at start-up. */
  override onload(): void {
    this.addCommand({
      id: 'spike-compile',
      name: 'Spike: compile a fixed sheet (developer)',
      callback: () => void this.spike(),
    });
  }

  /** US-008 | AC-3, AC-7: ends the worker when the plugin unloads. */
  override onunload(): void {
    this.compiler?.dispose();
    this.compiler = null;
  }

  /** US-008 | AC-1, AC-12: compiles the fixed sheet; shows and logs the measurements. */
  private async spike(): Promise<void> {
    this.compiler ??= createEmbeddedCompiler();
    const started = performance.now();
    const result = await this.compiler.compile(spikeSheetSource());
    const ms = Math.round(performance.now() - started);
    if (result.pdf === null) {
      new Notice(`Spike failed after ${ms} ms: ${result.message ?? '?'}`);
      return;
    }
    const sha = hex(
      await crypto.subtle.digest('SHA-256', result.pdf.slice().buffer),
    );
    const memory = (
      performance as unknown as {memory?: {usedJSHeapSize: number}}
    ).memory;
    const heap = memory
      ? `${Math.round(memory.usedJSHeapSize / 1048576)} MB`
      : 'n/a';
    const line = `${ms} ms, ${countPages(result.pdf)} page(s), ${result.pdf.length} bytes, ${result.facts.length} fit facts, heap ${heap}`;
    console.log(`Game Card Creator spike: ${line}; sha256 ${sha}`);
    new Notice(`Spike: ${line}`);
  }
}
