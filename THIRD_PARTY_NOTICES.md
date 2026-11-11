# Third-party notices

Game Card Creator is under the MIT licence (see `LICENSE`). No release file
exists yet; this list is the state of the runtime dependencies on 2026-11-11
and is completed with the licence texts when the first release bundles them
(SCAR-036: the bundle is checked through esbuild's metafile, not from
`package.json`).

| Component | Version | Licence (read from the registry 2026-11-11) |
|---|---|---|
| @myriaddreamin/typst.ts | 0.7.0 | Apache-2.0 |
| @myriaddreamin/typst-ts-web-compiler | 0.7.0 | Apache-2.0 |
| @myriaddreamin/typst-ts-renderer | 0.7.0 | Apache-2.0 |
| yaml | 2.9.1 | ISC |
| markdown-it | 15.0.3 | MIT |
| entities | as locked | BSD-2-Clause |
| linkify-it, mdurl, uc.micro, punycode.js | as locked | MIT |

The two WebAssembly binaries are compiled from Rust code, including the Typst
compiler (Apache-2.0) and its Rust dependencies; their licence texts are not
shipped by the npm packages. See https://github.com/Myriad-Dreamin/typst.ts
and https://github.com/typst/typst.

## Fonts

Libertinus Serif (Regular, Bold, Italic, Bold Italic) in `assets/fonts`,
copied from Obsidian2Typst (same author) on 2026-11-11: SIL Open Font License
1.1, text in `assets/fonts/Libertinus-OFL.txt`. Bundled into the plugin at the
first release.
