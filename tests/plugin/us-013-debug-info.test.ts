// US-013 AC-8 (D7): the text of "Copy debug info". Red until the code ticket (G2, 2026-11-17).
import {describe, expect, it} from 'vitest';
import {debugInfo} from '../../src/plugin/debug-info';
import {enabledPlugins} from '../../src/plugin/obsidian-deps';

describe('US-013 AC-8: debugInfo', () => {
  it('versions, the enabled plugins sorted by id, then the settings file', () => {
    expect(
      debugInfo({
        pluginVersion: '0.7.0',
        obsidianVersion: '1.15.0',
        settingsText: '{\n  "outputFolder": "/out"\n}',
        plugins: [
          {id: 'obsidian2typst', version: '0.15.2'},
          {id: 'game-card-creator', version: '0.7.0'},
        ],
      }),
    ).toBe(
      'Game Card Creator 0.7.0\n' +
        'Obsidian 1.15.0\n' +
        'Enabled plugins:\n' +
        '- game-card-creator 0.7.0\n' +
        '- obsidian2typst 0.15.2\n' +
        'Settings file:\n' +
        '{\n  "outputFolder": "/out"\n}\n',
    );
  });
  it('no settings file and no other plugin', () => {
    expect(
      debugInfo({
        pluginVersion: '0.7.0',
        obsidianVersion: '1.15.0',
        settingsText: null,
        plugins: [],
      }),
    ).toBe(
      'Game Card Creator 0.7.0\nObsidian 1.15.0\nEnabled plugins:\nSettings file:\n(no settings file)\n',
    );
  });
});

describe('US-013 AC-8: enabledPlugins (the structural read of app.plugins.plugins)', () => {
  it('lists each plugin with a manifest id and version; skips the rest', () => {
    const app = {
      plugins: {
        plugins: {
          a: {manifest: {id: 'obsidian2typst', version: '0.15.2'}},
          b: {manifest: {id: 'no-version'}},
          c: {},
          d: undefined,
        },
      },
    };
    expect(enabledPlugins(app)).toEqual([
      {id: 'obsidian2typst', version: '0.15.2'},
    ]);
  });
  it('an app without plugins gives an empty list', () => {
    expect(enabledPlugins({})).toEqual([]);
    expect(enabledPlugins({plugins: {}})).toEqual([]);
  });
});
