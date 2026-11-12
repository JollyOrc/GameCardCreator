// Bundles src/plugin/main.ts into main.js for Obsidian (see build/build-plugin.mjs).
/* global console */
import {buildPlugin, formatReport} from './build/build-plugin.mjs';

console.log(formatReport(await buildPlugin({outfile: 'main.js'})).join('\n'));
