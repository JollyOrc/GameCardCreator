// US-011 AC-2, AC-9 (D5): the title settings of a card kind (skill, spell), their
// check and the title sizes tried in equal mode. Pure; messages are returned, never
// reported (SCAR-038).

/**
 * US-011 D5: the title settings of one kind. `equalTitles` switches equal title bars
 * on; `titleSize` (6 to 20 pt) is the size tried first, `minTitleSize` (4 to 20 pt,
 * not above `titleSize`) the smallest.
 */
export interface TitleSettings {
  equalTitles: boolean;
  titleSize: number;
  minTitleSize: number;
}

/** US-011 D5: off, 9.1 pt (1.3 x the default text size 7 pt), 7 pt. */
export const DEFAULT_TITLES: Readonly<TitleSettings> = Object.freeze({
  equalTitles: false,
  titleSize: 9.1,
  minTitleSize: 7,
});

/**
 * US-011 | AC-9: checks the title settings of `kind`; one message per problem, empty
 * when they are valid.
 *
 * Checked whether the switch is on or off (as the bleed). Sizes must be finite and in
 * range; "smallest above the title size" is checked only when both are in range, so
 * one mistake gives one message. Messages name the kind.
 */
export function checkTitleSettings(
  kind: 'skill' | 'spell',
  settings: TitleSettings,
): string[] {
  const issues: string[] = [];
  const inRange = (value: number, low: number, high: number): boolean =>
    Number.isFinite(value) && value >= low && value <= high;
  const titleOk = inRange(settings.titleSize, 6, 20);
  const smallestOk = inRange(settings.minTitleSize, 4, 20);
  if (!titleOk) {
    issues.push(
      `The ${kind} title size ${settings.titleSize} is outside 6 to 20 pt`,
    );
  }
  if (!smallestOk) {
    issues.push(
      `The ${kind} smallest title size ${settings.minTitleSize} is outside 4 to 20 pt`,
    );
  }
  if (titleOk && smallestOk && settings.minTitleSize > settings.titleSize) {
    issues.push(
      `The ${kind} smallest title size ${settings.minTitleSize} is above the title size ${settings.titleSize}`,
    );
  }
  return issues;
}

/** Rounds to 1e-4 pt, which removes floating-point dust from sizes (as `textSizes`). */
const round = (value: number): number => Math.round(value * 1e4) / 1e4;

/**
 * US-011 | AC-2: the title sizes tried, largest first: `titleSize`, then steps of
 * `step` down while not below `minTitleSize`, and `minTitleSize` itself as the last
 * (always) — the rule of `textSizes` (US-002 AC-10). Assumes valid settings and a
 * valid step (the shared `sizeStep`). Defaults with step 0.25: 9.1, 8.85, …, 7.1, 7.
 */
export function titleSizes(settings: TitleSettings, step: number): number[] {
  const {titleSize, minTitleSize} = settings;
  // Float dust may lose the last step; the smallest size is added below anyway.
  const steps = Math.floor((titleSize - minTitleSize) / step);
  const list: number[] = [];
  for (let k = 0; k <= steps; k++) list.push(round(titleSize - k * step));
  if (list[list.length - 1] !== round(minTitleSize)) {
    list.push(round(minTitleSize));
  }
  return list;
}
