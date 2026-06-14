// Incremental extraction of the `content` field from a partial, still-streaming
// research JSON payload. The content-mode contract puts `content` first
// (`{"content":"...","questions":[...],...}`), so while the model streams its
// raw JSON we can decode the article body character-by-character — before the
// JSON object is closed — to drive a live typewriter effect in the reading
// overlay.
//
// This is display-only: the authoritative parse still happens via
// `parseModelPayload` once the full reply arrives. The extractor is deliberately
// tolerant — an incomplete trailing escape (`\` or a short `\uXXXX`) just stops
// early instead of throwing.

/**
 * Decode the JSON string value of the first top-level `content` key from a
 * possibly-incomplete JSON document. Returns the text decoded so far (with JSON
 * escapes resolved), or "" if the `content` field hasn't started streaming yet.
 */
export function extractStreamingContent(raw: string): string {
  const opener = raw.match(/"content"\s*:\s*"/);
  if (!opener || opener.index === undefined) return "";

  let i = opener.index + opener[0].length;
  let out = "";

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === "\\") {
      const next = raw[i + 1];
      if (next === undefined) break; // escape not fully streamed yet → stop here
      switch (next) {
        case "n":
          out += "\n";
          break;
        case "t":
          out += "\t";
          break;
        case "r":
          out += "\r";
          break;
        case "b":
          out += "\b";
          break;
        case "f":
          out += "\f";
          break;
        case '"':
          out += '"';
          break;
        case "\\":
          out += "\\";
          break;
        case "/":
          out += "/";
          break;
        case "u": {
          const hex = raw.slice(i + 2, i + 6);
          if (hex.length < 4 || /[^0-9a-fA-F]/.test(hex)) return out; // \uXXXX still streaming
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
          break;
        }
        default:
          out += next; // unknown escape → keep the char verbatim
      }
      i += 2;
    } else if (ch === '"') {
      break; // closing quote of the content string → field complete
    } else {
      out += ch;
      i += 1;
    }
  }

  return out;
}
