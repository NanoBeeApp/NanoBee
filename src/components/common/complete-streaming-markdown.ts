// Stabilize a partial Markdown string mid-stream so its rendered block/inline
// structure matches the FINAL structure instead of mutating on every token.
//
// The problem this solves: while a model types out Markdown character by
// character, a marker that has been opened but not yet closed renders as raw
// text and then suddenly snaps into a styled element the instant its closing
// marker arrives — `**bold` is plain text until the trailing `**` lands, an
// opening ``` swallows the rest of the article as one code block until its
// closing fence appears, a lone `#`/`-`/`|` flashes before its content streams
// in. Every such snap re-lays-out the document; visually the typesetting
// "jumps around" on each frame.
//
// The fix: before rendering each partial frame, temporarily close the markers
// the stream has opened but not yet closed, so every frame is syntactically
// valid and structurally identical to the final output — only shorter. This is
// display-only: the authoritative content is still the completed string, which
// the reading overlay swaps back in (without completion) once the `final` event
// lands.
//
// Scope: we deliberately balance only the markers whose unclosed state causes a
// large, common reflow and whose forced closing is low-risk. A lone inline `$`
// is intentionally left alone (it is usually a currency sign in prose, and
// force-closing it would render a bogus formula).

/** Count non-overlapping occurrences of `sub` in `s`. */
function countOccurrences(s: string, sub: string): number {
  return s.split(sub).length - 1;
}

/**
 * Drop a trailing line that is only the *prefix* of a block marker with no
 * content yet (e.g. `##`, `- `, `>`, `1.`). Without this the bare marker flashes
 * as raw text for a frame before its text arrives.
 */
function hideDanglingBlockPrefix(text: string): string {
  const nlIndex = text.lastIndexOf("\n");
  const lastLine = text.slice(nlIndex + 1);
  if (/^[ \t]{0,3}(#{1,6}|[-*+]|\d+[.)]|>)[ \t]*$/.test(lastLine)) {
    return text.slice(0, nlIndex + 1);
  }
  return text;
}

/**
 * Hide an inline link/image whose closing `)` has not streamed yet
 * (`...[label](url-so-far`), so a half-typed URL does not show as raw text.
 * Only triggers once `](` is present, so prose `[` brackets are left untouched.
 */
function hideUnterminatedLink(text: string): string {
  const m = text.match(/!?\[[^\]]*\]\([^()]*$/);
  if (m && m.index !== undefined) return text.slice(0, m.index);
  return text;
}

/**
 * Strip the trailing run of emphasis marker characters when nothing has been
 * typed after them yet (e.g. the stream is mid-marker: `Intro with *`, `**bold*`
 * mid-close, or a stacked `**\``). Closing those would create an empty span or a
 * stray marker that snaps into the real element a frame later; removing them and
 * letting `closeInlineMarkers` rebalance keeps the structure stable. This is
 * idempotent on complete input — `**bold**` strips to `**bold` and is re-closed
 * back to `**bold**`. The `(?<!\`)` guard keeps it from splitting a 3+ backtick
 * fence (a closed fence ends in ```` ``` ````, which must stay intact).
 */
function stripTrailingOpenMarker(text: string): string {
  const TRAILING = /(?:\*+|_+|~+|\${1,2}|(?<!`)`{1,2})[ \t]*$/;
  let prev: string;
  let out = text;
  do {
    prev = out;
    out = out.replace(TRAILING, "");
  } while (out !== prev);
  return out;
}

/**
 * Append the closing markers needed to balance any inline emphasis the streamed
 * tail has left open. Order matters: double-char markers are counted and
 * stripped before single-char ones so `**` is never mistaken for two `*`.
 */
function closeInlineMarkers(text: string): string {
  // Reduce to the text that participates in inline emphasis: drop closed code
  // (fenced + inline), list/quote line prefixes, and intraword underscores so
  // their literal markers do not skew the parity counts.
  let s = text
    .replace(/(`{3,}|~{3,})[\s\S]*?\1/g, "") // closed fenced blocks
    .replace(/(`+)[^`\n]*?\1/g, "") // closed inline-code spans
    .replace(/^[ \t]{0,3}([*+-]|\d+[.)]|>)[ \t]+/gm, "") // list / quote prefixes
    .replace(/(?<=\w)_+(?=\w)/g, ""); // intraword `_` (snake_case) is not emphasis

  let suffix = "";
  const closeIf = (marker: string) => {
    if (countOccurrences(s, marker) % 2 === 1) suffix = marker + suffix;
    s = s.split(marker).join(""); // strip so narrower markers count cleanly
  };

  // Leftover inline code (a lone backtick run) — close first (innermost).
  if ((s.match(/`/g) ?? []).length % 2 === 1) {
    suffix = "`" + suffix;
    s = s.replace(/`/g, "");
  }
  closeIf("**"); // bold
  closeIf("__"); // bold (underscore)
  closeIf("~~"); // strikethrough
  closeIf("$$"); // display math
  closeIf("*"); // italic
  closeIf("_"); // italic (underscore)
  // A lone inline `$` is intentionally NOT closed (currency vs. formula).

  return text + suffix;
}

/**
 * Return a structurally-stable version of a still-streaming Markdown string.
 * Safe to call on complete Markdown too: balanced input is returned unchanged.
 */
export function completeStreamingMarkdown(input: string): string {
  if (!input) return input;

  // 1. Fenced code block: an odd number of fence lines means the trailing block
  //    is still open and would otherwise swallow the remaining article. Close it
  //    and stop — markers inside a code block are literal, nothing else applies.
  const fences = input.match(/^[ \t]{0,3}(`{3,}|~{3,})[^\n]*$/gm);
  if (fences && fences.length % 2 === 1) {
    const opener = fences[fences.length - 1].trim().match(/^(`{3,}|~{3,})/)![1];
    return input + (input.endsWith("\n") ? "" : "\n") + opener;
  }

  let text = input;
  text = hideDanglingBlockPrefix(text);
  text = hideUnterminatedLink(text);
  text = stripTrailingOpenMarker(text);
  text = closeInlineMarkers(text);
  return text;
}
