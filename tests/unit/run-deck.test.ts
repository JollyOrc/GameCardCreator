// US-005 AC-1: the links of a deck note, and the plan of cards they give. The
// resolver is a stand-in modelled on the Vault Compiler's rule (the smallest
// path for a bare name); the real one is measured in AC-13 (SCAR-024).
// Expected values come from the story. Red until the code ticket.
import {describe, expect, it} from 'vitest';
import {deckLinks, planDeck} from '../../src/core/run/deck';

const FENCE = '```';

describe('US-005 AC-1: deckLinks', () => {
  it('the example: three links in text order, alias dropped, a repeat kept', () => {
    const text =
      '- [[Reed Sweep]]\n- [[Reed Whisper|the whisper]]\n- [[Reed Sweep]]\n';
    expect(deckLinks(text)).toEqual([
      'Reed Sweep',
      'Reed Whisper',
      'Reed Sweep',
    ]);
  });
  it.each([
    ['[[Name]]', ['Name']],
    ['[[Name|alias]]', ['Name']],
    ['[[Folder/Name]]', ['Folder/Name']],
    ['[[Name#Heading]]', ['Name']],
    ['[[Name^abc123]]', ['Name']],
    ['[[Name#Heading|alias]]', ['Name']],
    ['[text](Name.md)', ['Name']],
    ['[text](Folder%20X/Name.md)', ['Folder X/Name']],
    ['[text](Name.md#Heading)', ['Name']],
    ['[text](Name)', ['Name']],
    ['[img](pics/x.png)', ['pics/x.png']],
    ['a [[A]] b [[B]] c [t](C.md) d [[D]]', ['A', 'B', 'C', 'D']],
    ['[[Name\\|alias]]', ['Name']],
    ['[t](Name.md "A title")', ['Name']],
    ["[t](Name.md 'A title')", ['Name']],
    ['[t](<Folder X/Name.md>)', ['Folder X/Name']],
    ['[t](<Folder X/Name.md#h> "T")', ['Folder X/Name']],
  ])('%s gives %j', (text, targets) => {
    expect(deckLinks(text)).toEqual(targets);
  });
  it.each([
    ['![[Name]]'],
    ['![alt](x.png)'],
    ['[web](https://example.com/page)'],
    ['[mail](mailto:a@example.com)'],
    ['[[#Heading]]'],
    ['`[[Inline]]`'],
    [FENCE + '\n[[Fenced]]\n' + FENCE],
    ['---\nrelated: "[[InHeader]]"\n---\n'],
  ])('%j is no link to a card', (text) => {
    expect(deckLinks(text)).toEqual([]);
  });
  it('a tilde fence is a code block too, and a backtick fence is not closed by a tilde line', () => {
    expect(deckLinks('~~~\n[[InTilde]]\n~~~\n- [[Real]]\n')).toEqual(['Real']);
    expect(
      deckLinks(FENCE + '\n~~~\n[[StillCode]]\n' + FENCE + '\n- [[Real]]\n'),
    ).toEqual(['Real']);
  });
  it('links after a code block and after the header still count', () => {
    const text = `---\nrelated: "[[InHeader]]"\n---\n${FENCE}\n[[Fenced]]\n${FENCE}\n- [[Real]]\n`;
    expect(deckLinks(text)).toEqual(['Real']);
  });
  it('a look-alike header in the middle is content (SCAR-034)', () => {
    expect(deckLinks('- [[A]]\n---\n[[B]]\n---\n')).toEqual(['A', 'B']);
  });
  it('CRLF line ends and a byte-order mark are read like LF', () => {
    expect(deckLinks('\uFEFF- [[A]]\r\n- [[B]]\r\n')).toEqual(['A', 'B']);
  });
});

/** A stand-in for Obsidian's lookup: exact path, else the smallest path with that name. */
function vault(files: string[], folders: string[] = []) {
  const notes = files.filter((f) => f.endsWith('.md'));
  const base = (p: string) => p.replace(/^.*\//, '').replace(/\.md$/, '');
  return {
    resolve(target: string) {
      const exact = [target, `${target}.md`].find((c) => files.includes(c));
      if (exact !== undefined)
        return {path: exact, isNote: exact.endsWith('.md')};
      if (folders.includes(target)) return {path: target, isNote: false};
      const named = notes
        .filter((n) => base(n) === target || n === `${target}.md`)
        .sort();
      return named.length > 0 ? {path: named[0]!, isNote: true} : null;
    },
    // by the name alone, as the real lookup of a name: a path's last part
    notesNamed: (name: string) =>
      notes.filter((n) => base(n) === base(name)).sort(),
  };
}

describe('US-005 AC-1: planDeck', () => {
  const v = vault(
    [
      'skills/Reed Sweep.md',
      'spells/Reed Whisper.md',
      'a/dup.md',
      'b/dup.md',
      'pics/x.png',
    ],
    ['skills'],
  );
  it('the example deck gives three cards in order, a repeat twice, no warning', () => {
    const plan = planDeck(
      'Opening Deck.md',
      '- [[Reed Sweep]]\n- [[Reed Whisper]]\n- [[Reed Sweep]]\n',
      v,
    );
    expect(plan.notes).toEqual([
      'skills/Reed Sweep.md',
      'spells/Reed Whisper.md',
      'skills/Reed Sweep.md',
    ]);
    expect(plan.warnings).toEqual([]);
  });
  it('a missing target: no card, DECK_LINK_MISSING with the target', () => {
    const plan = planDeck(
      'Deck.md',
      '- [[Gone]]\n- [[Gone|alias]]\n- [[Reed Sweep]]',
      v,
    );
    expect(plan.notes).toEqual(['skills/Reed Sweep.md']);
    expect(plan.warnings).toEqual([
      {code: 'DECK_LINK_MISSING', path: 'Deck.md', detail: 'Gone'},
      {code: 'DECK_LINK_MISSING', path: 'Deck.md', detail: 'Gone'},
    ]);
  });
  it('a folder and an image: DECK_LINK_NOT_A_NOTE with the target', () => {
    const plan = planDeck('Deck.md', '- [[skills]]\n- [pic](pics/x.png)\n', v);
    expect(plan.notes).toEqual([]);
    expect(plan.warnings).toEqual([
      {code: 'DECK_LINK_NOT_A_NOTE', path: 'Deck.md', detail: 'skills'},
      {code: 'DECK_LINK_NOT_A_NOTE', path: 'Deck.md', detail: 'pics/x.png'},
    ]);
  });
  it('a bare name that two notes have: the answered note and DECK_LINK_AMBIGUOUS', () => {
    const plan = planDeck('Deck.md', '- [[dup]]\n', v);
    expect(plan.notes).toEqual(['a/dup.md']);
    expect(plan.warnings).toEqual([
      {
        code: 'DECK_LINK_AMBIGUOUS',
        path: 'Deck.md',
        detail: 'dup; using a/dup.md',
      },
    ]);
  });
  it('a name with its folder is not ambiguous', () => {
    const plan = planDeck('Deck.md', '- [[b/dup]]\n', v);
    expect(plan.notes).toEqual(['b/dup.md']);
    expect(plan.warnings).toEqual([]);
  });
  it('warnings come in link order, mixed kinds', () => {
    const plan = planDeck(
      'Deck.md',
      '- [[Gone]]\n- [[dup]]\n- [[skills]]\n- [[Reed Sweep]]\n',
      v,
    );
    expect(plan.warnings.map((w) => w.code)).toEqual([
      'DECK_LINK_MISSING',
      'DECK_LINK_AMBIGUOUS',
      'DECK_LINK_NOT_A_NOTE',
    ]);
    expect(plan.notes).toEqual(['a/dup.md', 'skills/Reed Sweep.md']);
  });
  it('the resolver is asked with the deck note as the place of the link', () => {
    const asked: [string, string][] = [];
    planDeck('Decks/Deck.md', '- [[A]]\n- [[B]]', {
      resolve: (t, f) => (asked.push([t, f]), null),
      notesNamed: () => [],
    });
    expect(asked).toEqual([
      ['A', 'Decks/Deck.md'],
      ['B', 'Decks/Deck.md'],
    ]);
  });
});
