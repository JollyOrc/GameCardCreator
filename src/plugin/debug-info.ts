// US-013 AC-8 (D7): the text "Copy debug info" puts on the clipboard. Pure; the tab
// gathers the versions, the settings file and the enabled plugins, and copies the text.

/** US-013 AC-8: what the debug text holds. */
export interface DebugFacts {
  pluginVersion: string;
  obsidianVersion: string;
  /** The settings file's text; `null` when there is none. */
  settingsText: string | null;
  plugins: readonly {id: string; version: string}[];
}

/**
 * US-013 | AC-8: The debug text: `Game Card Creator <v>`, `Obsidian <v>`, `Enabled
 * plugins:` with one `- <id> <version>` line per plugin sorted by id, `Settings file:`,
 * then the file's text or `(no settings file)`; a line break ends it. Nothing is sent.
 */
export function debugInfo(facts: DebugFacts): string {
  const plugins = [...facts.plugins].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  return (
    [
      `Game Card Creator ${facts.pluginVersion}`,
      `Obsidian ${facts.obsidianVersion}`,
      'Enabled plugins:',
      ...plugins.map((p) => `- ${p.id} ${p.version}`),
      'Settings file:',
      facts.settingsText ?? '(no settings file)',
    ].join('\n') + '\n'
  );
}
