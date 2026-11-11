// US-002 AC-6, AC-8: the warnings made from the fit facts that the Typst side
// writes, one per card, with the label `gcc-fit` (`metadata((i:, size:,
// fits:))`). Pure; returns the warnings and reports nothing (SCAR-038).
import type {CardWarning, SkillCard} from './read';

/** US-002 AC-5: the label of the fit facts in the compiled document. */
export const FIT_LABEL = 'gcc-fit';

interface FitFact {
  i: number;
  size: number;
  fits: boolean;
}

/** A fact of the right shape, or null (a malformed fact is ignored). */
function asFact(value: unknown): FitFact | null {
  if (typeof value !== 'object' || value === null) return null;
  const {i, size, fits} = value as Record<string, unknown>;
  if (
    typeof i !== 'number' ||
    // `typeof` narrows the type; `isFinite` refuses NaN and Infinity.
    typeof size !== 'number' ||
    !Number.isFinite(size) ||
    typeof fits !== 'boolean'
  ) {
    return null;
  }
  return {i, size, fits};
}

/**
 * US-002 AC-6, AC-8: the warnings for `cards`, in card order.
 *
 * A card whose fact says it does not fit gets `SKILL_TEXT_OVERFLOW` with the
 * size in pt; a card without a valid fact gets `SKILL_FIT_UNKNOWN`, because
 * the fit is never assumed. The first valid fact of a card counts.
 */
export function fitWarnings(
  facts: readonly unknown[],
  cards: readonly SkillCard[],
): CardWarning[] {
  const byCard = new Map<number, FitFact>();
  for (const raw of facts) {
    const fact = asFact(raw);
    if (fact !== null && !byCard.has(fact.i)) byCard.set(fact.i, fact);
  }
  const warnings: CardWarning[] = [];
  cards.forEach((card, i) => {
    const fact = byCard.get(i);
    if (fact === undefined) {
      warnings.push({code: 'SKILL_FIT_UNKNOWN', path: card.path, detail: ''});
    } else if (!fact.fits) {
      warnings.push({
        code: 'SKILL_TEXT_OVERFLOW',
        path: card.path,
        detail: `${fact.size} pt`,
      });
    }
  });
  return warnings;
}
