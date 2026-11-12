# Dependencies

Pinned exactly (no `^`), SCAR-042.

| Package | Version | Licence | Role |
|---|---|---|---|
| @myriaddreamin/typst.ts | 0.7.0 | Apache-2.0 | Typst in WebAssembly (Typst 0.14.2 inside) |
| @myriaddreamin/typst-ts-web-compiler | 0.7.0 | Apache-2.0 | the compiler WASM |
| @myriaddreamin/typst-ts-renderer | 0.7.0 | Apache-2.0 | the renderer WASM (loaded by typst.ts) |

| yaml | 2.9.1 | ISC | the front matter of a note (US-002) |
| markdown-it | 15.0.3 | MIT | the description of a note (US-002) |

`markdown-it` 15.0.3 lists `argparse` (PSF-2.0) as a dependency for its
command-line tool only; the plugin imports the library, not the tool. The
release bundle is checked through esbuild's metafile (SCAR-036); until then
this is an expectation, not a measurement. Its other dependencies (entities
BSD-2-Clause; linkify-it, mdurl, uc.micro, punycode.js MIT) are in
`THIRD_PARTY_NOTICES.md`.

Dev tools (also `@types/markdown-it` 14.2.0): eslint, typescript-eslint, prettier, typescript, vitest, esbuild,
`@types/node`, `obsidian` (types), pinned as in Obsidian2Typst.

**Measured 2026-11-12 (US-008 #13, `npm run build`, from the metafiles of the
plugin and the worker bundle):** 10 packages are bundled, all with an allowed
licence: the three `@myriaddreamin` packages (Apache-2.0; the renderer's glue
only, its WebAssembly is not embedded), entities (BSD-2-Clause), linkify-it,
markdown-it, mdurl, punycode.js, uc.micro (MIT), yaml (ISC). `argparse` is
**not** in the bundle (the build refuses it). `main.js` is 15.6 MB (16 308 950
bytes; estimate was 16 MB).

SCAR-042: the first artefact, the spike build 0.1.0-m01.1, has `main.js`
SHA-256 `68b2ba772948c43728ff82b710f37b886a8049ba8eb270bf269e541a49d77787`; the
checksum is recorded again at each dependency change. Measurements of the Typst packages:
`spike-typst.md`.
