// US-002 AC-5, AC-10: the settings of the skill card, their check and the
// text sizes that are tried. Pure; messages are returned, never reported.

/**
 * US-003 AC-6 (D2): the size settings that every kind of text card shares.
 * `maxSize` 5.5 to 10 pt, `minSize` 4 to 10 pt (not above the largest),
 * `sizeStep` 0.05 to 1 pt.
 */
export interface CardSizes {
  maxSize: number;
  minSize: number;
  sizeStep: number;
}

/** US-003 AC-6: the shared defaults, as the skill card had them. */
export const DEFAULT_SIZES: Readonly<CardSizes> = Object.freeze({
  maxSize: 7,
  minSize: 5.5,
  sizeStep: 0.25,
});

/** US-002 settings table: property names, labels and the size range. */
export interface SkillSettings extends CardSizes {
  tagsProperty: string;
  timingProperty: string;
  timingLabel: string;
  kindProperty: string;
  kindLabel: string;
  requiresProperty: string;
  requiresLabel: string;
}

/** US-002 settings table: the defaults (invented names, D1). */
export const DEFAULT_SKILL: Readonly<SkillSettings> = Object.freeze({
  tagsProperty: 'tags',
  timingProperty: 'timing',
  timingLabel: 'Time',
  kindProperty: 'kind',
  kindLabel: 'Type',
  requiresProperty: 'requires',
  requiresLabel: 'Requires',
  ...DEFAULT_SIZES,
});

/** Rounds to 1e-4 pt, which removes floating-point dust from sizes. */
const round = (value: number): number => Math.round(value * 1e4) / 1e4;

/**
 * US-003 AC-6, US-002 AC-10: checks the size settings; one message per
 * problem, empty when they are valid. "Largest below smallest" is checked only
 * when both are in range, so one mistake gives one message.
 */
export function checkSizes(sizes: CardSizes): string[] {
  const issues: string[] = [];
  const inRange = (value: number, low: number, high: number): boolean =>
    Number.isFinite(value) && value >= low && value <= high;
  const largestOk = inRange(sizes.maxSize, 5.5, 10);
  const smallestOk = inRange(sizes.minSize, 4, 10);
  if (!largestOk) {
    issues.push(`The largest size ${sizes.maxSize} is outside 5.5 to 10 pt`);
  }
  if (!smallestOk) {
    issues.push(`The smallest size ${sizes.minSize} is outside 4 to 10 pt`);
  }
  if (!inRange(sizes.sizeStep, 0.05, 1)) {
    issues.push(`The size step ${sizes.sizeStep} is outside 0.05 to 1 pt`);
  }
  if (largestOk && smallestOk && sizes.maxSize < sizes.minSize) {
    issues.push(
      `The largest size ${sizes.maxSize} is below the smallest size ${sizes.minSize}`,
    );
  }
  return issues;
}

/**
 * US-002 AC-10: checks the settings; one message per problem, empty when the
 * settings are valid.
 *
 * Property names compare without case and surrounding spaces: an empty name
 * and two settings naming the same property are refused. Sizes must be finite
 * numbers inside their ranges; "largest below smallest" is checked only when
 * both are in range, so one mistake gives one message.
 */
export function checkSkillSettings(settings: SkillSettings): string[] {
  const issues: string[] = [];
  const properties: [string, string][] = [
    ['tags', settings.tagsProperty],
    ['timing', settings.timingProperty],
    ['kind', settings.kindProperty],
    ['requires', settings.requiresProperty],
  ];
  const seen = new Map<string, string>();
  for (const [role, name] of properties) {
    const key = name.trim().toLowerCase();
    if (key === '') {
      issues.push(`The ${role} property name is empty`);
      continue;
    }
    const first = seen.get(key);
    if (first !== undefined) {
      issues.push(
        `The ${first} property and the ${role} property both name "${name.trim()}"`,
      );
    } else {
      seen.set(key, role);
    }
  }

  issues.push(...checkSizes(settings));
  return issues;
}

/**
 * US-002 AC-5, AC-10: the sizes tried, largest first: the largest size, then
 * steps of `sizeStep` down while not below the smallest, and the smallest
 * itself as the last one (always). Assumes valid settings. Defaults: 7, 6.75,
 * 6.5, 6.25, 6, 5.75, 5.5.
 */
export function textSizes(sizes: CardSizes): number[] {
  const {maxSize, minSize, sizeStep} = sizes;
  // Float dust may lose the last step; the smallest size is added below anyway.
  const steps = Math.floor((maxSize - minSize) / sizeStep);
  const list: number[] = [];
  for (let k = 0; k <= steps; k++) list.push(round(maxSize - k * sizeStep));
  if (list[list.length - 1] !== round(minSize)) list.push(round(minSize));
  return list;
}
