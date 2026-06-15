/**
 * Normalize the math/markdown quirks AI models emit, before react-markdown +
 * remark-math sees the text. Two fixes, both skipping fenced code blocks and
 * inline code so example code is never rewritten:
 *
 * 1. **TeX delimiters → dollar forms.** Convert \( … \) / \[ … \] into the only
 *    forms KaTeX/remark-math recognises ($ … $ / $$ … $$). remark-math v6 only
 *    parses $/$$; models frequently improvise with \(...\), which otherwise
 *    renders the literal backslashes and parentheses.
 *
 * 2. **Escape currency dollar signs.** With `singleDollarTextMath: true`,
 *    remark-math treats a pair of single `$` as inline math. A money-heavy reply
 *    like "$138.15 美元 …（…为 $4,296.94 美元）" therefore gets the text BETWEEN
 *    the two `$` rendered as a LaTeX formula (its `**` bold markers turn into
 *    `∗∗`). Currency is far more common than inline math in this product, so we
 *    escape a `$` that sits directly before a digit (`$138`, `$4,296`) to a
 *    literal `\$`. Real formulas start with a non-digit (`$x^2$`, `$\alpha$`)
 *    and are left untouched; `$$` display math and already-escaped `\$` are
 *    skipped via a lookbehind.
 *
 * Ported/extended from the Curve project (windseed-curve) — the canonical
 * markdown stack this component mirrors.
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
      // First convert TeX delimiters, then escape currency `$` — both run
      // outside inline code so code samples are preserved.
      return escapeCurrencyOutsideInlineCode(rewriteOutsideInlineCode(part));
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

/**
 * Escape "currency" dollar signs (a `$` immediately before a digit) to `\$` so
 * remark-math never pairs them into inline math. Inline code spans are kept
 * verbatim; `$$` display math and already-escaped `\$` are excluded by the
 * lookbehind. The replacement is returned from a function so the literal `\$`
 * is not reinterpreted as a `$`-replacement pattern.
 */
function escapeCurrencyOutsideInlineCode(segment: string): string {
  // Match an inline-code span (keep verbatim) OR a currency `$` (escape it).
  const pattern = /(`+)([^`\n]+?)\1|(?<![\\$])\$(?=\d)/g;
  return segment.replace(pattern, (match, backticks) =>
    backticks !== undefined ? match : "\\$",
  );
}
