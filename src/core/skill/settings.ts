// US-002 AC-5, AC-10: the settings of the skill card, their check and the
// text sizes that are tried. Pure; messages are returned, never reported.

/** US-002 settings table: property names, labels and the size range. */
export interface SkillSettings {
  tagsProperty: string;
  timingProperty: string;
  timingLabel: string;
  kindProperty: string;
  kindLabel: string;
  requiresProperty: string;
  requiresLabel: string;
  /** Largest text size in pt, 5.5 to 10. */
  maxSize: number;
  /** Smallest text size in pt, 4 to the largest. */
  minSize: number;
  /** Step between the sizes in pt, 0.05 to 1. */
  sizeStep: number;
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
  maxSize: 7,
  minSize: 5.5,
  sizeStep: 0.25,
});

/** Rounds to 1e-4 pt, which removes floating-point dust from sizes. */
const round = (value: number): number => Math.round(value * 1e4) / 1e4;

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

  const inRange = (value: number, low: number, high: number): boolean =>
    Number.isFinite(value) && value >= low && value <= high;
  const largestOk = inRange(settings.maxSize, 5.5, 10);
  const smallestOk = inRange(settings.minSize, 4, 10);
  if (!largestOk) {
    issues.push(`The largest size ${settings.maxSize} is outside 5.5 to 10 pt`);
  }
  if (!smallestOk) {
    issues.push(`The smallest size ${settings.minSize} is outside 4 to 10 pt`);
  }
  if (!inRange(settings.sizeStep, 0.05, 1)) {
    issues.push(`The size step ${settings.sizeStep} is outside 0.05 to 1 pt`);
  }
  if (largestOk && smallestOk && settings.maxSize < settings.minSize) {
    issues.push(
      `The largest size ${settings.maxSize} is below the smallest size ${settings.minSize}`,
    );
  }
  return issues;
}

/**
 * US-002 AC-5, AC-10: the sizes tried, largest first: the largest size, then
 * steps of `sizeStep` down while not below the smallest, and the smallest
 * itself as the last one (always). Assumes valid settings. Defaults: 7, 6.75,
 * 6.5, 6.25, 6, 5.75, 5.5.
 */
export function textSizes(settings: SkillSettings): number[] {
  const {maxSize, minSize, sizeStep} = settings;
  // Float dust may lose the last step; the smallest size is added below anyway.
  const steps = Math.floor((maxSize - minSize) / sizeStep);
  const sizes: number[] = [];
  for (let k = 0; k <= steps; k++) sizes.push(round(maxSize - k * sizeStep));
  if (sizes[sizes.length - 1] !== round(minSize)) sizes.push(round(minSize));
  return sizes;
}
