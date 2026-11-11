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

SCAR-042: no release artefact exists yet (`main.js` is not built: there is no
plugin entry), so there is no checksum to compare; the first one is recorded
by the ticket that adds the plugin entry. Measurements of the Typst packages:
`spike-typst.md`.
