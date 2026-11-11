// Test support (US-008): a minimal element that records what the confirmation
// modal does with it: children, text, listeners, focus, events. It carries only
// what Obsidian's `createEl`, `addEventListener` and `focus` give (SCAR-023).
export class FakeEl {
  readonly children: FakeEl[] = [];
  text = '';
  focused = false;
  private readonly listeners = new Map<string, ((e: unknown) => void)[]>();
  constructor(readonly tag = 'div') {}
  createEl(tag: string, options: {text?: string; cls?: string} = {}): FakeEl {
    const el = new FakeEl(tag);
    el.text = options.text ?? '';
    this.children.push(el);
    return el;
  }
  createDiv(options: {text?: string; cls?: string} = {}): FakeEl {
    return this.createEl('div', options);
  }
  empty(): void {
    this.children.length = 0;
  }
  addEventListener(type: string, fn: (e: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  focus(): void {
    this.focused = true;
    this.fire('focus', {});
  }
  click(): void {
    this.fire('click', {});
  }
  fire(type: string, event: unknown): void {
    for (const fn of this.listeners.get(type) ?? []) fn(event);
  }
  /** Every element below this one, depth first. */
  all(): FakeEl[] {
    return this.children.flatMap((c) => [c, ...c.all()]);
  }
}
