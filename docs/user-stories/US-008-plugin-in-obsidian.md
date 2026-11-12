# US-008 — The plugin inside Obsidian: compile worker, wiring, build, test installs, release

**Status:** Ready (G0 and G1 done 2026-11-12; D1 to D4 accepted by the author
2026-11-12). Amended 2026-11-12 after the first measurement in Obsidian: AC-1
(measured), AC-2 and AC-7 (the worker decodes), new AC-13, D5.

**As** a game master **I want** the plugin installed in Obsidian, making the
cards from my notes without anything else installed or downloaded, **so that**
I can print cards for a session.

This story makes US-001 to US-005 run inside Obsidian desktop: the Typst
compile in a worker with the compiler and the font embedded in `main.js`, the
plugin entry (`main.ts`) that connects Obsidian to the runner of US-005, the
build, the install of a test build into a scratch vault, and the release. The
settings screen is US-007; the creature card is US-004.

Reader of the output of the compile: a PDF viewer and an A4 printer (US-001).
The plugin reads notes only; it writes only the PDF and the warnings file
into the output folder (rule 2).

## Terms

- **Test build**: a build with its own version (`0.1.0-m01.1`), installed in the
  scratch vault, never published (SCAR-012).
- **Scratch vault**: the vault the generator of US-005 AC-13 made; a folder of
  invented notes.
- **Embedded**: stored inside `main.js` as text and decoded in the compile
  worker when it starts (AC-13).

## Acceptance criteria

- **AC-1 (the compile).** The worker compiles the Typst of a sheet (US-001 to
  US-005) with the pinned Typst (0.14.2 through typst.ts 0.7.0) and answers the
  PDF bytes, the `gcc-fit` facts and, when there is no PDF, the first line of the
  first diagnostic. Measured in Node at G1 (a reference, SCAR-045): the composed
  deck of US-005 AC-12 gives a PDF whose page boxes, frames and text equal the
  test reference's. **Measured in Obsidian 2026-11-12 (M02, build 0.1.0-m01.1,
  M1 MacBook, macOS 27.0.1, Obsidian 1.15.0):** the Electron worker gives the
  byte-identical PDF (SHA-256 `6b9b67c1…01a6`, 29 068 bytes) on all three runs.
- **AC-2 (nothing to download).** The compiler WebAssembly (28.3 MB; about
  10.9 MB compressed in Obsidian2Typst's measurement) and the four font files
  (Libertinus Serif, SIL OFL 1.1) are embedded in `main.js` as text and decoded **in
  the worker** when it starts (AC-13), never on the main thread; the plugin
  folder needs only `main.js`, `manifest.json` and
  `styles.css`. A compile makes **no network request** (a fake `fetch` and
  `XMLHttpRequest` in the worker's tests fail the test when called; the spike
  checks in Obsidian). Starting Obsidian decodes nothing.
- **AC-3 (one compile at a time, no throw).** A second compile request waits for
  the running one; a compile that fails (a Typst error, a worker error, a worker
  that cannot start) answers a message and never throws into the caller; after
  an error the next request starts a new worker. On unload the worker is
  terminated and a waiting request answers `The plugin was unloaded`.
- **AC-4 (the settings file, until US-007).** The settings are read from the
  plugin's `data.json` with `loadData`: missing keys take the defaults of US-005
  and US-001 to US-003, unknown keys are ignored, a file that is not valid JSON
  or not an object gives the defaults and one notice; the plugin never calls
  `saveData` (there is no screen: the author's file is never overwritten; a text
  check over the sources). **Superseded by US-007 (2026-11-12): the plugin saves only
  through the settings screen (AC-10); the refusal notice also says `Settings → Game
  Card Creator` (AC-12).** The commands' refusal for missing settings (US-005
  AC-9) names the file's path, `<vault>/.obsidian/plugins/game-card-creator/
  data.json`, and the setting.
- **AC-5 (the Obsidian side of the runner).** `main.ts` builds the dependencies
  of US-005's runner from Obsidian and only hands them over (SCAR-031): the note's
  text is `vault.read` (not the cache); `resolve` is
  `metadataCache.getFirstLinkpathDest(target, deckPath)` (a `TFile` gives
  `{path, isNote: extension is md}`; none gives nothing: a folder is therefore
  `DECK_LINK_MISSING`); `notesNamed` is the vault's Markdown files with that
  base name; `notesBelow` is the files below a folder; `vaultRoot` is
  `FileSystemAdapter.getBasePath()`; `notice` is a `Notice`. The command
  `Create cards from this deck note` is registered with a `checkCallback` for
  the active Markdown file; `Create cards` is added to the file explorer's menu
  by `file-menu` (one item) and `files-menu` (several), for files and folders.
- **AC-6 (the confirmation dialog, SCAR-013, SCAR-014).** The question of US-005
  AC-7 is an Obsidian `Modal` that draws `replaceDialog` (both files, `Replace`
  and `Cancel`, the focus on `Cancel`), passes every key to `dialogKey`, and
  answers `false` when it is closed in any other way (the close button, a click
  outside). A text check shows that the modal's key handler calls `dialogKey` and
  nothing else decides.
- **AC-7 (the worker's life).** The worker is created on the first compile, not
  at start-up; it is created from the embedded source (a Blob URL), the WebAssembly
  and fonts are handed to it as their embedded texts (AC-13); a second run after the first reuses it;
  the memory is released on unload (a test with a fake worker).
- **AC-8 (the build, SCAR-042, SCAR-036).** `npm run build` writes `main.js` (the
  plugin and its worker with the embedded WebAssembly and fonts), and the build
  reports the packages bundled with their licences, read from the metafile, not
  from `package.json`; a package with a licence that is not on the allowed list
  (MIT, ISC, BSD-2-Clause, Apache-2.0, OFL-1.1 for the fonts) stops the build.
  The `argparse` package that `markdown-it` lists for its command-line tool must
  not be in the bundle (checked, not assumed). The size of `main.js` is reported
  (estimate before measurement: 16 MB).
- **AC-9 (test installs, SCAR-012, SCAR-018).** `npm run install:scratch -- <vault>`
  builds, writes `main.js`, `manifest.json` (with the version of the build:
  `0.1.0-m01.N`, not the release version) and `styles.css` into
  `<vault>/.obsidian/plugins/game-card-creator/`, refuses a folder that is not an
  Obsidian vault (no `.obsidian`), never touches `data.json` or any other file of
  the vault, and prints the checksums of the three files, which equal those of
  the fresh build. A second install with the same version is refused unless
  `--force` (a new test round gets a new version).
- **AC-10 (release, SCAR-006, SCAR-036, SCAR-042).** `npm run release:build`
  works as Obsidian2Typst's: it checks that the versions of `package.json`,
  `manifest.json` and `versions.json` agree, that `releases/vX.Y.Z.md` has a
  release date and `releases/RELEASES.md` a row, refuses uncommitted changes,
  clones `HEAD` into a temporary folder, runs `npm ci` and the whole gate there,
  builds `main.js`, writes `dist/release/<x.y.z>/` with `main.js`,
  `manifest.json`, `styles.css`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, the zip of
  these, `SHA256SUMS.txt` and `notes.md`, and never tags, pushes or publishes.
  The first release (0.1.0) is made only after US-007 and M01 (D2).
- **AC-11 (desktop only).** `manifest.json` says `isDesktopOnly: true`; the
  plugin imports Node's file system only in `plugin/disk-writer.ts`.
- **AC-12 (manual check on the real thing, SCAR-045).** M01 (US-005) is run with
  a test build in the scratch vault; M02 (this story) asks the tester: the
  plugin loads (no console error), the first compile time on the author's
  machine (reported), memory after a compile (reported), a second compile is
  faster than the first, nothing is downloaded (the developer console's network
  tab), the plugin unloads cleanly (disable and enable it). The results are
  written in the check's report.

- **AC-13 (the main thread does not decode, SCAR-045, SCAR-024, SCAR-032).** The
  compile service hands the worker the embedded texts (the compiler and each
  font, gzip + base64) in the init message; the worker decodes them, and answers
  `ready` after the decode; a text that cannot be decoded answers `failed` with
  a message naming it, and the next request starts a new worker (AC-3). No
  module the main thread runs (`compiler/index.ts`, `compiler/embedded-assets.ts`,
  `compiler/start-worker.ts`, `main.ts`) decodes: a text check finds no `atob`,
  `DecompressionStream` or `decodeWasm` in them. **Measured before the change**
  (M02 follow-up, build 0.1.0-m01.2, the author's Obsidian: M1 MacBook, macOS
  27.0.1, Obsidian 1.15.0): on the first compile, between the start and the end
  of the compiler decode (164 ms wall) two entries held the main thread, 95.5 ms
  (a long task that began at the click) and 60.6 ms (a promise continuation),
  about 156 ms together; the same decode steps took about 25 ms of synchronous
  work in Node (not Electron). **Not established:** that all of those 156 ms were
  the decode's own steps (the long task also held the click handling and 15 ms of
  our sheet preparation). **Not promised:** a number after the change; the spike
  build 0.1.0-m01.3 measures it in the same way (the trace of build 0.1.0-m01.2,
  same author, machine and Obsidian) and the result is recorded in M02; "fixed"
  is not written before that. The init message now carries about 14.3 MB of text
  instead of 28.3 MB of buffers; its cost on the main thread is part of that
  measurement. **Measured after the change (2026-11-12, M02 second run, build
  0.1.0-m01.3, the same author, machine and Obsidian, one first compile):** the
  decode step takes 0.1 ms on the main thread, and no long task and no
  long-animation-frame entry occurs between `compile start` and `compile end`
  (the 113 ms and 60.6 ms entries are gone); the PDF is byte-identical; later
  compiles take 6 and 5 ms. Not established: entries below Chromium's 50 ms
  threshold; the plugin load's own long task (about 218 ms with Obsidian's own
  start-up, unchanged); a shorter wall time (451 ms against 435 ms).

## Decisions (author, 2026-11-12: all proposals)

- **D1 — tickets.** (a) the compile worker with its embedded assets and a spike
  build measured in your Obsidian (AC-1 to AC-3, AC-7, AC-12 first part), (b)
  `main.ts`, the adapters, the settings loading and the dialog (AC-4 to AC-6,
  AC-11), (c) the build, the test install and the release scripts (AC-8 to
  AC-10). The order: a, c (so a build can be installed), b.
- **D2 — versions.** Test builds `0.1.0-m01.N` until US-007 and M01 have passed;
  the first release `0.1.0` (a GitHub release with `main.js`, `manifest.json`,
  `styles.css`) after that.
- **D3 — the worker pattern** of Obsidian2Typst (same author, MIT) copied and
  cut down to the compile and the facts (no renderer, no preview, no layout
  checks), with its origin named in each file's header and in `dependencies.md`
  (decided at US-005 D6).
- **D4 — the first run without a settings screen.** The refusal notices name
  the settings file's path (AC-4); M01 gives the file's content. No command
  opens the file.
- **D5 — the worker decodes (2026-11-12, after M02; the author's "go for all of
  that" to the proposal).** The embedded texts go to the worker as strings and
  are decoded there; the main thread decodes nothing. Alternatives not chosen:
  a faster decode on the main thread (still blocks it), or splitting the decode
  into chunks that yield (more code, still on the main thread).

## Interface used by the tests (G1)

- Worker protocol (as Obsidian2Typst's, cut down): `{type: 'init', id,
  compilerText: string, fontTexts: string[]}` (gzip + base64 texts; amended
  2026-11-12, AC-13) answers `{type: 'ready',
  id}`; `{type: 'compile', id, source}` answers `{type: 'compiled', id, pdf:
  ArrayBuffer, facts: unknown[]}`; any failure answers `{type: 'failed', id,
  message}` (the diagnostics, one per line). `src/plugin/compiler/worker-core.ts`:
  `createWorkerCore(post)` returns `{handle(message)}`.
- `src/plugin/compiler/index.ts`: `createCompiler({startWorker, compilerText,
  fontTexts})` (`compilerText(): string`, `fontTexts(): string[]`, amended
  2026-11-12) returns `{compile(source), dispose()}`; `compile` answers `{pdf:
  Uint8Array | null, facts, message?}` (the message is the first line of the
  first diagnostic) and never rejects. `src/plugin/compiler/wasm-codec.ts`:
  `decodeWasm` (used by the worker core; `lazyWasm` removed, amended 2026-11-12);
  `build/embed.mjs`: `gzipBase64`.
- `src/plugin/settings-file.ts`: `readSettingsFile(raw)` returns `{settings,
  notice}`: `null` (no file) gives the defaults and no notice; a value that is
  not an object gives the defaults and `Settings file: not an object, using the
  defaults`; a key of the wrong type is ignored and named: `Settings file:
  ignored sheet.margin, kindRules`; an unknown key is ignored silently.
- `src/plugin/obsidian-deps.ts`: `vaultAccess(app)` (`readNote`, `resolve`,
  `notesNamed`, `notesBelow`, `vaultRoot` over a structural subset of
  Obsidian's `App`). `src/plugin/ui.ts`: `toCheckCallback`, `selectionOf`,
  `onFileMenu`, `onFilesMenu`, `confirmReplaceWith(ModalBase)`. The runner
  gets one more optional dependency, `settingsFile(): string`; a refusal for
  a setting appends `Settings file: <path>`.
- `build/licences.mjs` (`bundledPackages`, `licenceReport`, `checkLicences`),
  `build/install-lib.mjs` (`installTest`), `build/release-checks.mjs`
  (`checkRelease(root, {testBuild})`, as Obsidian2Typst's).

## Not covered

The settings screen (US-007), the creature card (US-004), a card preview inside
Obsidian, mobile, Windows (not measured), publishing to the community plugin
list.
