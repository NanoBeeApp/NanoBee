/**
 * Convert the TeX-style delimiters AI models occasionally emit (\( … \) / \[ … \])
 * into the only forms KaTeX/remark-math recognises (the dollar forms $ … $ / $$ … $$),
 * while skipping fenced code blocks and inline code so we never rewrite example code.
 *
 * remark-math v6 only parses $/$$ by default; models frequently improvise with
 * \(...\), which otherwise renders the literal backslashes and parentheses.
 * Pre-processing once fixes ~90% of "the formula doesn't show up" reports.
 *
 * Ported from the Curve project (windseed-curve) — the canonical markdown stack
 * this component mirrors.
 */
export function normalizeMathDelimiters(input: string): string {
  if (!input) return input;

  // Step 1: split on fenced code blocks; only rewrite the non-code fragments.
  const fencePattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
  const parts = input.split(fencePattern);

  return parts
    .map((part, index) => {
      // Odd indices are the fenced code blocks themselves — keep them verbatim.
      if (index % 2 === 1) return part;
      return rewriteOutsideInlineCode(part);
    })
    .join("");
}

function rewriteOutsideInlineCode(segment: string): string {
  // One regex matches both inline code and TeX delimiters; when inline code is
  // hit we return it untouched:
  // - inline code:   (`+)([^`\n]+?)\1
  // - display math:  $$ … $$ (promoted to a standalone block even mid-paragraph)
  // - inline math:   \( … \)
  // - block math:    \[ … \]
  const pattern =
    /(`+)([^`\n]+?)\1|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;

  return segment.replace(
    pattern,
    (match, _backticks, _code, dollarBlockMath, inlineMath, blockMath) => {
      if (dollarBlockMath !== undefined) {
        return `\n\n$$\n${dollarBlockMath.trim()}\n$$\n\n`;
      }
      if (inlineMath !== undefined) {
        return `$${inlineMath.trim()}$`;
      }
      if (blockMath !== undefined) {
        return `\n\n$$\n${blockMath.trim()}\n$$\n\n`;
      }
      // Inline code — return as-is.
      return match;
    },
  );
}
