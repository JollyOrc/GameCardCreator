// US-013 AC-12: the user-facing texts of `src/plugin`, in one place. Fixed texts are
// strings; texts with values are functions that only put the values in (no decision).

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/** US-005 AC-9, US-008 AC-4, US-013 AC-11: the run's notices. */
export const RUN = {
  busy: 'A run of cards is already in progress',
  cancelled: '❌ Card run cancelled.',
  /** US-013 AC-11: an exception, or a run that gives no PDF (its message). */
  failed: (reason: string): string => `❌ Card run failed: ${reason}`,
  /** US-013 AC-11: `✅ Created 12 cards on 2 pages, 3 warnings. Written to /out`. */
  done: (
    cards: number,
    pages: number,
    warnings: number,
    folder: string,
  ): string =>
    `✅ Created ${plural(cards, 'card', 'cards')} on ${plural(pages, 'page', 'pages')}, ` +
    `${plural(warnings, 'warning', 'warnings')}. Written to ${folder}`,
  cannot: (reason: string): string => `Cannot make cards: ${reason}`,
  outputIsFile: (folder: string): string =>
    `output folder "${folder}" is a file`,
  /** US-008 AC-4, US-013 AC-11: the ending of a refusal: the section and the settings file. */
  seeSettings: (text: string, section: string, file: string): string =>
    `${text}\nSee Settings → ${section} (file: ${file})`,
} as const;
