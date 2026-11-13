// US-002 AC-6, AC-8, US-004 AC-5: the warnings made from the fit facts that the
// Typst side writes, one per card, with the label `gcc-fit` (`metadata((i:,
// size:, fits:))`; a creature card's fact also has `dropped`). Pure; returns
// the warnings and reports nothing (SCAR-038).
import {cardCode} from '../card/warning';
import type {CreatureCard} from '../creature/read';
import type {CardWarning, SkillCard} from './read';

/** US-002 AC-5: the label of the fit facts in the compiled document. */
export const FIT_LABEL = 'gcc-fit';

interface FitFact {
  i: number;
  size: number;
  fits: boolean;
  /** The parts a creature card gave up, in order; null when the fact has no valid list. */
  dropped: string[] | null;
}

/** A fact of the right shape, or null (a malformed fact is ignored). */
function asFact(value: unknown): FitFact | null {
  if (typeof value !== 'object' || value === null) return null;
  const {i, size, fits, dropped} = value as Record<string, unknown>;
  if (
    typeof i !== 'number' ||
    // `typeof` narrows the type; `isFinite` refuses NaN and Infinity.
    typeof size !== 'number' ||
    !Number.isFinite(size) ||
    typeof fits !== 'boolean'
  ) {
    return null;
  }
  const list =
    Array.isArray(dropped) && dropped.every((d) => typeof d === 'string')
      ? (dropped as string[])
      : null;
  return {i, size, fits, dropped: list};
}

/**
 * US-004 AC-5: the parts whose loss is warned of. The Signs section is the
 * lowest priority by design and gives no warning.
 */
const WARNED_PARTS: readonly string[] = ['Instincts', 'Skills'];

/**
 * US-002 AC-6, AC-8, US-004 AC-5: the warnings for `cards`, in card order.
 *
 * A card whose fact says it does not fit gets the overflow warning with the
 * size in pt; a card without a valid fact gets the fit-unknown warning, because
 * the fit is never assumed. A creature card's fact must also name the parts
 * given up (`dropped`, else fit-unknown); each given-up Instincts section or
 * Skills line gives the part-dropped warning (detail: the part), in the order
 * given up, before the overflow warning. The codes carry the card's kind (a
 * card without a kind is a skill card, `cardCode`). The first valid fact of a
 * card counts.
 */
export function fitWarnings(
  facts: readonly unknown[],
  cards: readonly (SkillCard | CreatureCard)[],
): CardWarning[] {
  const byCard = new Map<number, FitFact>();
  for (const raw of facts) {
    const fact = asFact(raw);
    if (fact !== null && !byCard.has(fact.i)) byCard.set(fact.i, fact);
  }
  const warnings: CardWarning[] = [];
  cards.forEach((card, i) => {
    const kind = card.kind ?? 'skill';
    const fact = byCard.get(i);
    if (fact === undefined || (kind === 'creature' && fact.dropped === null)) {
      warnings.push({
        code: cardCode(kind, 'FIT_UNKNOWN'),
        path: card.path,
        detail: '',
      });
      return;
    }
    if (kind === 'creature') {
      for (const part of fact.dropped ?? []) {
        if (WARNED_PARTS.includes(part)) {
          warnings.push({
            code: cardCode(kind, 'PART_DROPPED'),
            path: card.path,
            detail: part,
          });
        }
      }
    }
    if (!fact.fits) {
      warnings.push({
        code: cardCode(kind, 'TEXT_OVERFLOW'),
        path: card.path,
        detail: `${fact.size} pt`,
      });
    }
  });
  return warnings;
}
