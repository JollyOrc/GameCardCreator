// US-005 AC-13: generates the scratch vault of the manual check M01. Invented
// notes only (SCAR-035). usage: node --experimental-strip-types
// tests/fixtures/generate-vault.ts <new folder>. It writes into a folder that
// does not exist yet and refuses one that does (SCAR-018).
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const WORDS =
  'sweeping defender opponent adjacent weapon success spend knock before after instead either another character against movement requires ability combat attack target strike guard stance reaction advantage penalty rounds within range gather momentum'.split(
    ' ',
  );

/** `n` invented words, in paragraphs of 35. */
function body(n: number): string {
  const w = Array.from(
    {length: n},
    (_, i) => WORDS[(i * 7 + 3) % WORDS.length]!,
  );
  const out: string[] = [];
  for (let i = 0; i < n; i += 35) out.push(`${w.slice(i, i + 35).join(' ')}.`);
  return out.join('\n\n');
}

const skill = (
  tags: string[],
  timing: string,
  kind: string,
  text: string,
  requires = '',
): string =>
  `---\ntags:\n${tags.map((t) => `  - ${t}`).join('\n')}\ntiming: ${timing}\nkind: ${kind}\n${requires === '' ? '' : `requires: "${requires}"\n`}---\n${text}\n`;

/** The files of the vault: path below the vault folder, text. */
export function vaultFiles(): Record<string, string> {
  return {
    'Decks/Opening Deck.md': [
      '# Opening Deck',
      '',
      '- [[Reed Sweep]]',
      '- [[Reed Whisper|the whisper]]',
      '- [[Guard Stance#Notes]]',
      '- [[Gone Note]]',
      '- [[Skills]]',
      '- [[dup]]',
      '- [[Loose]]',
      '- [the stone spell](../Spells/Stone%20Skin.md)',
      '- [[Reed Sweep]]',
      '',
    ].join('\n'),
    'Skills/Combat/Reed Sweep.md': skill(
      ['FieldCraft', 'Melee'],
      'action',
      'attack',
      'You sweep a **reed staff** low. Spend a success to knock an adjacent enemy *prone*.\n\n- Works only with a staff.\n- Costs [one stamina](Stamina.md).\n\n![](../../pics/reed.png)',
      '[[Basket Knots]]',
    ),
    'Skills/Combat/Guard Stance.md': skill(
      ['FieldCraft', 'Melee'],
      'turn',
      'passive',
      'You hold a low guard.\n\n### Notes\nThe stance ends when you move.',
    ),
    'Skills/Combat/dup.md': skill(
      ['FieldCraft'],
      'action',
      'attack',
      'The combat one. First of two notes with this name.',
    ),
    'Skills/General/Basket Knots.md': skill(
      ['Craft'],
      'none',
      'passive',
      'You tie baskets that hold.',
    ),
    'Skills/General/Cord Work.md': skill(
      ['Craft'],
      'weeks',
      'tested',
      `${body(120)}`,
      '[[Basket Knots]]',
    ),
    'Skills/General/dup.md': skill(
      ['Craft'],
      'none',
      'passive',
      'The general one. Second of two notes with this name.',
    ),
    'Spells/Reed Whisper.md':
      '---\ntags:\n  - Wizardry\n  - ElementalMagic\n---\nA **thin breeze** carries your voice to one listener within sight.\n\nThe target hears you as a whisper, however far away. They can answer only\nif they know [[Reed Whisper|this spell]].\n',
    'Spells/Stone Skin.md': `---\ntags:\n  - NatureMagic\n---\n${body(80)}\n`,
    'Spells/Long Spell.md': `---\ntags:\n  - Wizardry\n---\n${body(400)}\n`,
    'Misc/Loose.md': 'A note that no kind rule covers.\n',
  };
}

/** The binary files of the vault (the image the Reed Sweep note names): a 1 x 1 PNG. */
export function vaultBinaries(): Record<string, Uint8Array> {
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  return {'pics/reed.png': new Uint8Array(Buffer.from(png, 'base64'))};
}

/** Writes the files below `target`; refuses a target that exists. */
function write(target: string): void {
  const root = resolve(target);
  if (existsSync(root)) {
    throw new Error(
      `The folder exists: ${root} (the generator writes only into a new folder)`,
    );
  }
  const all: Record<string, string | Uint8Array> = {
    ...vaultFiles(),
    ...vaultBinaries(),
  };
  for (const [path, data] of Object.entries(all)) {
    const full = join(root, path);
    mkdirSync(dirname(full), {recursive: true});
    writeFileSync(full, data);
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const target = process.argv[2];
  if (target === undefined) {
    process.stderr.write('usage: generate-vault.ts <new folder>\n');
    process.exit(2);
  }
  try {
    write(target);
    process.stdout.write(`vault written to ${resolve(target)}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}
