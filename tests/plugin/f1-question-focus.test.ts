// #58 (F1; US-005 AC-7, US-007 AC-9 amended, SCAR-014, SCAR-028): the replace and reset
// questions with a fake modal that copies Obsidian 1.15.0's measured behaviour (M12
// diagnosis): after `onOpen`, `Modal.open()` focuses the first focusable element. The
// earlier fakes did not, which is why no test saw F1. Red on 0.7.0-m12.1's code first.
import {describe, expect, it} from 'vitest';
import {replaceDialog} from '../../src/core/run/confirm';
import {resetSectionDialog} from '../../src/plugin/settings/sections';
import {confirmDialogWith} from '../../src/plugin/ui';
import {FakeEl} from '../support/fake-dom';

/** A modal that, like Obsidian's, focuses the first button after `onOpen` has run. */
class ObsidianLikeModal {
  contentEl = new FakeEl();
  modalEl = new FakeEl();
  closed = 0;
  static made: ObsidianLikeModal[] = [];
  constructor(public app: unknown) {
    ObsidianLikeModal.made.push(this);
  }
  open(): void {
    (this as unknown as {onOpen(): void}).onOpen();
    const first = this.contentEl.all().find((e) => e.tag === 'button');
    first?.focus();
  }
  close(): void {
    this.closed++;
    (this as unknown as {onClose(): void}).onClose();
  }
}

const QUESTIONS = [
  [
    'replace',
    replaceDialog(['/out/A cards.pdf', '/out/A cards warnings.md']),
    'Replace',
  ],
  ['reset', resetSectionDialog('layout'), 'Reset'],
] as const;

function open(dialog: (typeof QUESTIONS)[number][1]) {
  const answer = confirmDialogWith<unknown>(ObsidianLikeModal as never)(
    {},
    dialog,
  );
  const modal = ObsidianLikeModal.made[ObsidianLikeModal.made.length - 1]!;
  const buttons = () => modal.contentEl.all().filter((e) => e.tag === 'button');
  return {modal, answer, buttons};
}

describe('#58 F1: the safe button keeps the focus after Obsidian opens the question', () => {
  it.each(QUESTIONS)(
    '%s: the buttons read Cancel, then the action',
    (_n, dialog, action) => {
      expect(
        open(dialog)
          .buttons()
          .map((b) => b.text),
      ).toEqual(['Cancel', action]);
    },
  );
  it.each(QUESTIONS)(
    '%s: Enter right after the question opened cancels',
    async (_n, dialog) => {
      const {modal, answer} = open(dialog);
      modal.contentEl.fire('keydown', {key: 'Enter'});
      expect(await answer).toBe(false);
    },
  );
  it.each(QUESTIONS)(
    '%s: Enter after moving the focus to the action acts',
    async (_n, dialog, action) => {
      const {modal, answer, buttons} = open(dialog);
      buttons()
        .find((b) => b.text === action)!
        .focus();
      modal.contentEl.fire('keydown', {key: 'Enter'});
      expect(await answer).toBe(true);
    },
  );
  it.each(QUESTIONS)(
    '%s: focus to the action and back to Cancel, then Enter cancels (#58 mutant)',
    async (_n, dialog, action) => {
      const {modal, answer, buttons} = open(dialog);
      buttons()
        .find((b) => b.text === action)!
        .focus();
      buttons()
        .find((b) => b.text === 'Cancel')!
        .focus();
      modal.contentEl.fire('keydown', {key: 'Enter'});
      expect(await answer).toBe(false);
    },
  );
});
