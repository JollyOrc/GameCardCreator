# Third-party notices

Game Card Creator is under the MIT licence (see `LICENSE`). This file lists
what the plugin's `main.js` bundles and under which licence. The release files
carry it (`THIRD_PARTY_NOTICES.md`), and the bundle is checked through esbuild's
metafile at every build, not from `package.json` (SCAR-036). The versions below
were read from the registry on 2026-11-11.

| Component | Version | Licence |
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
1.1, text in `assets/fonts/Libertinus-OFL.txt`. Bundled into the plugin.

RPG Awesome (`assets/fonts/RPGAwesome.ttf`, family `rpg-awesome`), the icon
font of the colour-coded card headers (US-009), copied on 2026-11-13: the font is
under the SIL Open Font License 1.1 (Daniela Howe and Ivan Montiel), text in
`assets/fonts/RPGAwesome-OFL.txt`; the code points of its glyphs are read from its
own CSS (`assets/fonts/RPGAwesome-icons.txt`). Bundled into the plugin like
Libertinus Serif.

## Icon designs

The glyph designs of RPG Awesome come from Game-icons.net and are under the
Creative Commons Attribution 3.0 licence (CC BY 3.0), as the site's own page
states (<https://game-icons.net/about.html>, read on 2026-11-16: "provided under
the terms of the Creative Commons 3.0 BY license"; credit the original author).
The cards print a credit line for them at the foot of every sheet that shows an
icon (default text: `Icons made by Lorc, Delapouite, sbed and other authors. Available on https://game-icons.net (CC BY 3.0), via RPG Awesome`; the
scheme note's `credit` property replaces it).
