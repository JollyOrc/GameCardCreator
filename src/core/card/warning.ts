// US-003 AC-4, AC-11: the one place where the kind of a card and the name of a
// problem are put together into a warning code (SCAR-017). No other source
// file of `src/core` writes a literal `SKILL_`, `SPELL_` or `CREATURE_` code.

/** US-003, US-004: the kinds of card. A card without a kind is a skill card. */
export type CardKind = 'skill' | 'spell' | 'creature';

const PREFIX: Readonly<Record<CardKind, string>> = {
  skill: 'SKILL_',
  spell: 'SPELL_',
  creature: 'CREATURE_',
};

/**
 * US-003 AC-11: the warning code of `kind` for the problem `name`:
 * `cardCode('spell', 'IMAGE_OMITTED')` is `SPELL_IMAGE_OMITTED`.
 */
export function cardCode(kind: CardKind, name: string): string {
  return `${PREFIX[kind]}${name}`;
}
