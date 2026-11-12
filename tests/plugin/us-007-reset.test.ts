// US-007 AC-9 (SCAR-013, SCAR-014): resetting a page. The question names the page,
// `Reset` and `Cancel`, the focus on `Cancel`; Enter acts on the focused button,
// Escape and a close are `Cancel`. Only the keys of that page go back to their
// defaults; the output folder, the kind rules, the other pages and unknown keys
// stay; the file is loaded for the reset. Red until the tickets.
import {describe, expect, it} from 'vitest';
import {DEFAULT_CARDS} from '../../src/core/run/settings';
import {
  PAGE_TITLES,
  resetDialog,
  resetPage,
} from '../../src/plugin/settings/reset';
import {confirmDialogWith} from '../../src/plugin/ui';
import {FakeEl} from '../support/fake-dom';
import {memoryStore} from '../support/memory-store';

describe('US-007 AC-9: the question', () => {
  it('names the page; Reset and Cancel by their own names; the focus on Cancel', () => {
    for (const page of ['properties', 'layout'] as const) {
      const d = resetDialog(page);
      expect(d.message).toContain(PAGE_TITLES[page]);
      expect(d.replaceLabel).toBe('Reset');
      expect(d.cancelLabel).toBe('Cancel');
      expect(d.focus).toBe('cancel');
    }
    expect(PAGE_TITLES).toEqual({
      properties: 'Note properties',
      layout: 'Page and text size',
    });
  });
  it('the two questions differ (they name different pages)', () => {
    expect(resetDialog('properties').message).not.toBe(
      resetDialog('layout').message,
    );
  });
});

interface FileShape {
  sheet: Record<string, unknown>;
  skill: Record<string, unknown>;
  spell: Record<string, unknown>;
  outputFolder: string;
  kindRules: unknown;
  future: unknown;
}

describe('US-007 AC-9: resetting changes only the keys of its page', () => {
  const edited = {
    outputFolder: '/out',
    kindRules: [{folder: 'Skills', kind: 'skill'}],
    future: {x: 1},
    sheet: {cardWidth: 70, margin: 15, gap: 2, cutMarks: false, mystery: 1},
    skill: {
      maxSize: 9,
      minSize: 6,
      sizeStep: 0.5,
      tagsProperty: 'labels',
      timingLabel: 'When',
    },
    spell: {tagsProperty: 'marks'},
  };
  it('layout: the sheet and the three sizes go back to the defaults; the names, the labels, the rules, the folder and unknown keys stay', async () => {
    const store = memoryStore(edited);
    await resetPage({store}, 'layout');
    const file = store.file() as FileShape;
    expect(file.sheet).toMatchObject({
      cardWidth: DEFAULT_CARDS.sheet.cardWidth,
      cardHeight: DEFAULT_CARDS.sheet.cardHeight,
      margin: DEFAULT_CARDS.sheet.margin,
      gap: DEFAULT_CARDS.sheet.gap,
      cutMarks: DEFAULT_CARDS.sheet.cutMarks,
      mystery: 1,
    });
    expect(file.skill).toMatchObject({
      maxSize: 7,
      minSize: 5.5,
      sizeStep: 0.25,
      tagsProperty: 'labels',
      timingLabel: 'When',
    });
    expect(file.spell).toEqual({tagsProperty: 'marks'});
    expect(file.outputFolder).toBe('/out');
    expect(file.kindRules).toEqual([{folder: 'Skills', kind: 'skill'}]);
    expect(file.future).toEqual({x: 1});
  });
  it('properties: the skill names and labels and the spell tags go back; the sizes, the sheet, the rules and the folder stay', async () => {
    const store = memoryStore(edited);
    await resetPage({store}, 'properties');
    const file = store.file() as FileShape;
    expect(file.skill).toMatchObject({
      tagsProperty: 'tags',
      timingProperty: 'timing',
      timingLabel: 'Time',
      kindProperty: 'kind',
      kindLabel: 'Type',
      requiresProperty: 'requires',
      requiresLabel: 'Requires',
      maxSize: 9,
      minSize: 6,
      sizeStep: 0.5,
    });
    expect(file.spell).toMatchObject({tagsProperty: 'tags'});
    expect(file.sheet).toEqual(edited.sheet);
    expect(file.outputFolder).toBe('/out');
    expect(file.kindRules).toEqual(edited.kindRules);
  });
  it('the reset is loaded from the file now (a hand edit before it is kept outside the page)', async () => {
    const store = memoryStore({outputFolder: '/old'});
    store.set({outputFolder: '/by-hand', sheet: {margin: 20}});
    await resetPage({store}, 'layout');
    expect((store.file() as Record<string, unknown>).outputFolder).toBe(
      '/by-hand',
    );
    expect(store.reads).toBe(1);
  });
  it("a file with nothing in it or none at all gets the page's defaults, nothing else", async () => {
    const store = memoryStore(null);
    await resetPage({store}, 'properties');
    const file = store.file() as Record<string, unknown>;
    expect(Object.keys(file).sort()).toEqual(['skill', 'spell']);
  });
  it('the same defaults as DEFAULT_CARDS: a page reset then read back changes no setting from the default', async () => {
    const store = memoryStore({
      skill: {tagsProperty: 'x', maxSize: 9},
      sheet: {margin: 20},
    });
    await resetPage({store}, 'properties');
    await resetPage({store}, 'layout');
    const {readSettingsFile} = await import('../../src/plugin/settings-file');
    const {settings} = readSettingsFile(store.file());
    expect(settings.sheet).toEqual(DEFAULT_CARDS.sheet);
    expect(settings.skill).toEqual(DEFAULT_CARDS.skill);
    expect(settings.spell).toEqual(DEFAULT_CARDS.spell);
  });
});

describe('US-007 AC-9: the modal logic, with the dialog data of the reset (SCAR-013, SCAR-014)', () => {
  class FakeModal {
    contentEl = new FakeEl();
    modalEl = new FakeEl();
    closed = 0;
    static made: FakeModal[] = [];
    constructor(public app: unknown) {
      FakeModal.made.push(this);
    }
    open(): void {
      (this as unknown as {onOpen(): void}).onOpen();
    }
    close(): void {
      this.closed++;
      (this as unknown as {onClose(): void}).onClose();
    }
  }
  function open(page: 'properties' | 'layout' = 'layout') {
    const answer = confirmDialogWith<unknown>(FakeModal as never)(
      {},
      resetDialog(page),
    );
    const modal = FakeModal.made[FakeModal.made.length - 1]!;
    const buttons = () =>
      modal.contentEl.all().filter((e) => e.tag === 'button');
    return {modal, answer, buttons};
  }
  it('draws the question with the page named, Reset and Cancel, the focus on Cancel', () => {
    const {modal, buttons} = open('properties');
    const text = modal.contentEl
      .all()
      .map((e) => e.text)
      .join('\n');
    expect(text).toContain('Note properties');
    expect(buttons().map((b) => b.text)).toEqual(['Reset', 'Cancel']);
    expect(buttons()[1]!.focused).toBe(true);
  });
  it.each([
    ['Escape', {key: 'Escape'}, false],
    ['Enter on the default focus (Cancel)', {key: 'Enter'}, false],
  ])('%s answers %s', async (_n, event, expected) => {
    const {modal, answer} = open();
    modal.contentEl.fire('keydown', event);
    expect(await answer).toBe(expected);
  });
  it('Enter after the focus moved to Reset answers true; a click on Reset true, on Cancel false', async () => {
    const a = open();
    a.buttons()[0]!.focus();
    a.modal.contentEl.fire('keydown', {key: 'Enter'});
    expect(await a.answer).toBe(true);
    const b = open();
    b.buttons()[0]!.click();
    expect(await b.answer).toBe(true);
    const c = open();
    c.buttons()[1]!.click();
    expect(await c.answer).toBe(false);
  });
  it('Enter during a composition does nothing; closing in any other way is Cancel; the first answer counts', async () => {
    const a = open();
    a.buttons()[0]!.focus();
    a.modal.contentEl.fire('keydown', {key: 'Enter', isComposing: true});
    await Promise.resolve();
    expect(a.modal.closed).toBe(0);
    const b = open();
    b.modal.close();
    expect(await b.answer).toBe(false);
    const c = open();
    c.buttons()[0]!.click();
    c.modal.close();
    expect(await c.answer).toBe(true);
  });
});
