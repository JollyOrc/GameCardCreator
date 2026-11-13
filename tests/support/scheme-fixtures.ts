// Invented fixtures for US-009 (SCAR-035): the scheme note of the story's example and
// the notes that use it. Nothing here is a real tag, colour or note.
export const SCHEME_PATH = 'Layouting/Branch Scheme.md';

/** The scheme note of the story ("The scheme note"), as a vault note. */
export const EXAMPLE_SCHEME = [
  '---',
  'schemeVersion: 1',
  'iconSet: rpg-awesome',
  'credit: "Icons: Game-icons.net (CC BY 3.0), via RPG Awesome"',
  '---',
  '| Tag | Label | Colour | Icon |',
  '|---|---|---|---|',
  '| Swordplay | Sword play | #F4D6B0 | sword |',
  '| Stonework | Stone work | #CBD5E8 | anvil |',
  '| Pyromancy | Pyromancy | #FFB4A2 | fire |',
  '| Hexes | Hexes | #E4F0A8 | skull |',
  '',
].join('\n');

/** The rows the example note gives (colours in normal, lower-case form). */
export const EXAMPLE_ROWS = [
  {tag: 'Swordplay', colour: '#f4d6b0', icon: 'sword', line: 8},
  {tag: 'Stonework', colour: '#cbd5e8', icon: 'anvil', line: 9},
  {tag: 'Pyromancy', colour: '#ffb4a2', icon: 'fire', line: 10},
  {tag: 'Hexes', colour: '#e4f0a8', icon: 'skull', line: 11},
] as const;

/** A note of the story's example: `Parry` (skill, one branch). */
export const PARRY_NOTE =
  '---\ntags:\n  - CombatSkill\n  - Swordplay\ntiming: reaction\n---\nYou turn a blow aside.\n';
/** `Ember Spark` (spell, one branch). */
export const EMBER_SPARK_NOTE =
  '---\ntags:\n  - Pyromancy\n---\nA spark jumps from your fingers.\n';
/** `Scorch Hex` (spell, two branches in this order). */
export const SCORCH_HEX_NOTE =
  '---\ntags:\n  - Pyromancy\n  - Hexes\n---\nThe target smoulders and is cursed.\n';
/** `Plain` (skill, no branch of the scheme). */
export const PLAIN_NOTE = '---\ntags:\n  - Misc\n---\nJust text.\n';
/** A skill with a tag in another spelling than the row's. */
export const SPELLING_NOTE =
  '---\ntags:\n  - "#swordplay "\n---\nSpelling differs from the row.\n';
