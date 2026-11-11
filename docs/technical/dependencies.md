# Dependencies

Pinned exactly (no `^`), SCAR-042.

| Package | Version | Licence | Role |
|---|---|---|---|
| @myriaddreamin/typst.ts | 0.7.0 | Apache-2.0 | Typst in WebAssembly (Typst 0.14.2 inside) |
| @myriaddreamin/typst-ts-web-compiler | 0.7.0 | Apache-2.0 | the compiler WASM |
| @myriaddreamin/typst-ts-renderer | 0.7.0 | Apache-2.0 | the renderer WASM (loaded by typst.ts) |

Dev tools: eslint, typescript-eslint, prettier, typescript, vitest, esbuild,
`@types/node`, `obsidian` (types), pinned as in Obsidian2Typst.

SCAR-042: no release artefact exists yet (`main.js` is not built: there is no
plugin entry), so there is no checksum to compare; the first one is recorded
by the ticket that adds the plugin entry. Measurements of the Typst packages:
`spike-typst.md`.
