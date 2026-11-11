// US-005 AC-7 (SCAR-013, SCAR-014): the replace confirmation's text and its key
// rule, as pure functions the Obsidian dialog (US-008) only calls. Written at
// the tickets' review (the ticket promised these tests; G2 had none).
import {describe, expect, it} from 'vitest';
import {dialogKey, replaceDialog} from '../../src/core/run/confirm';

describe('US-005 AC-7: the dialog', () => {
  const files = [
    '/out/Opening Deck cards.pdf',
    '/out/Opening Deck cards warnings.md',
  ];
  it('names both files, offers Replace and Cancel by their own names, focus on Cancel', () => {
    const d = replaceDialog(files);
    for (const f of files) expect(d.message).toContain(f);
    expect(d.replaceLabel).toBe('Replace');
    expect(d.cancelLabel).toBe('Cancel');
    expect(d.focus).toBe('cancel');
  });
  it('says what will happen (the files are replaced)', () => {
    expect(replaceDialog(files).message).toMatch(/replace/i);
  });
});

describe('US-005 AC-7: dialogKey (the keys of the confirmation)', () => {
  it.each([
    [{key: 'Escape'}, 'cancel', 'cancel'],
    [{key: 'Escape'}, 'replace', 'cancel'],
    [{key: 'Enter'}, 'cancel', 'cancel'],
    [{key: 'Enter'}, 'replace', 'replace'],
    [{key: 'a'}, 'cancel', 'none'],
    [{key: ' '}, 'replace', 'none'],
    [{key: 'Tab'}, 'cancel', 'none'],
  ] as const)('%j with focus on %s gives %s', (event, focus, result) => {
    expect(dialogKey(event, focus)).toBe(result);
  });
  it('Enter in the middle of a composition (isComposing, key code 229) does nothing', () => {
    expect(dialogKey({key: 'Enter', isComposing: true}, 'replace')).toBe(
      'none',
    );
    expect(dialogKey({key: 'Enter', keyCode: 229}, 'replace')).toBe('none');
    expect(dialogKey({key: 'Escape', isComposing: true}, 'replace')).toBe(
      'none',
    );
  });
  it('Enter outside a composition acts as before', () => {
    expect(
      dialogKey({key: 'Enter', isComposing: false, keyCode: 13}, 'replace'),
    ).toBe('replace');
  });
});
