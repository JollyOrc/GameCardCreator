// Invented fixtures for the skill card tests (SCAR-035): the story's example
// note and a text generator. The generator's words average 6.7 letters, the
// harsh case of the capacity measurement in the story (AC-5).
export const FENCE = '```';

/** The example note of US-002 (docs/user-stories/US-002-skill-card.md). */
export const EXAMPLE_NOTE = [
  '---',
  'tags:',
  '  - FieldCraft',
  '  - Melee',
  'timing: action',
  'kind: attack',
  'requires: "[[Basket Knots]]"',
  '---',
  `${FENCE}dataviewjs`,
  'await dv.view("views/card-details")',
  FENCE,
  '',
  'You sweep a **reed staff** low. Spend a success to knock an adjacent enemy',
  '*prone*.',
  '',
  '- Works only with a staff.',
  '- Costs [one stamina](Stamina.md).',
  '',
  '![](pics/reed.png)',
  '',
].join('\n');

const VOCAB =
  'sweeping defender opponent adjacent weapon success spend knock before after instead either another character against movement requires ability combat attack target strike guard stance reaction advantage penalty rounds within range gather momentum'.split(
    ' ',
  );

/** `n` invented words, in paragraphs of 35 words (the measured shape). */
export function inventedParagraphs(n: number): string[] {
  const words = Array.from(
    {length: n},
    (_, i) => VOCAB[(i * 7 + 3) % VOCAB.length]!,
  );
  const out: string[] = [];
  for (let i = 0; i < n; i += 35)
    out.push(`${words.slice(i, i + 35).join(' ')}.`);
  return out;
}
