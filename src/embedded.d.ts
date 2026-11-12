// US-008 AC-2, AC-7: modules that the build (ticket #13) fills with embedded
// text; `main.js` needs no other file than the manifest and the styles.
declare module 'embedded:compiler-wasm' {
  /** The Typst compiler WebAssembly as gzip + base64. */
  const text: string;
  export default text;
}
declare module 'embedded:fonts' {
  /** The bundled font files (assets/fonts) as gzip + base64, one text each. */
  const texts: string[];
  export default texts;
}
declare module 'embedded:worker-source' {
  /** The code of the compile worker. */
  const text: string;
  export default text;
}
