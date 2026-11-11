// US-002 AC-7 (rule 6): the one function that turns user text into Typst.
// User text is never written as markup: it becomes a Typst string literal and
// is shown with `#"..."`, so no character of it can start a heading, a list, a
// label, a reference, math or a comment, at any position (SCAR-009, SCAR-010,
// SCAR-041). Inside a string literal only `\` and `"` and the control
// characters need an escape.

/**
 * US-002 AC-7: `text` as a Typst string literal, quotes included.
 *
 * Escapes: `\` as `\\`, `"` as `\"`, line feed, carriage return and tab as
 * `\n`, `\r`, `\t`, every other control character (below U+0020, and U+007F)
 * as `\u{hex}`. Everything else, including every non-ASCII character, is
 * written as it is. Use the result as `#<literal>` in markup or as a string
 * in code; never put user text into Typst any other way.
 */
export function typstString(text: string): string {
  let out = '"';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code === 0x7f) out += `\\u{${code.toString(16)}}`;
    else out += ch;
  }
  return `${out}"`;
}
