// Auto-term extraction + in-body DOM decoration for the reading article (ported
// from Curve's reading-interactions.ts + auto-term-decoration.ts, adapted to
// NanoBee's single-string `node.content`).
//
// Two jobs:
//  1) extractAutoTermCandidates — pull high-signal phrases out of the article
//     markdown (AI bold spans, 《...》 book titles, 「...」 corner quotes, plus the
//     node's tags). These become clickable deep-dive anchors.
//  2) DOM decoration — after the article renders, wrap occurrences of those
//     phrases (and the reader's saved highlights) in <span.rc-autoterm> / <mark>.
//     The caller only runs this on STABLE (non-streaming) content and keeps the
//     <Markdown> element referentially stable (memoized) so React never
//     reconciles the mutated subtree.

const MAX_CANDIDATE_LENGTH = 80;

// Ancestors whose text must never be re-wrapped: links, code, math, and anything
// already decorated (the bold deep-dive buttons React rendered, prior runs).
const SKIP_ANCESTOR_SELECTOR =
  "a, code, pre, .katex, .katex-display, .rc-term, .rc-autoterm, .rc-highlight, .rc-selbubble, button";

/**
 * Extract clickable deep-dive candidates from article markdown + tags.
 * Returned longest-first so a short phrase can't wrap a substring of a longer
 * one before the longer one matches.
 */
export function extractAutoTermCandidates(
  content: string,
  tags?: ReadonlyArray<string> | undefined,
): string[] {
  const set = new Set<string>();

  // 1) tags — short, AI-assigned key concepts (keep the ≤40-char bound).
  for (const t of tags ?? []) {
    const name = t?.trim();
    if (name && name.length >= 2 && name.length <= 40) set.add(name);
  }

  // 2) markdown bold (**term**) — up to 80 chars so AI's longer "probe phrases"
  //    come through, not just short entities.
  const boldRegex = new RegExp(`\\*\\*([^*\\n]{2,${MAX_CANDIDATE_LENGTH}})\\*\\*`, "g");
  let m: RegExpExecArray | null;
  while ((m = boldRegex.exec(content)) !== null) {
    const term = m[1].trim();
    if (term) set.add(term);
  }

  // 3) 《...》 and 「...」 — typical proper-name signals (≤40 chars).
  const bookTitle = /《([^》\n]{1,40})》/g;
  while ((m = bookTitle.exec(content)) !== null) {
    const term = m[1].trim();
    if (term) set.add(term);
  }
  const cornerQuote = /「([^」\n]{1,40})」/g;
  while ((m = cornerQuote.exec(content)) !== null) {
    const term = m[1].trim();
    if (term) set.add(term);
  }

  return Array.from(set).sort((a, b) => b.length - a.length);
}

interface DecorateOptions {
  candidates: ReadonlyArray<string>;
  highlights?: ReadonlyArray<string>;
}

/**
 * One-shot entry: strip old decorations, then re-apply highlights (<mark>) then
 * auto-terms (<span>), in that order. Safe to call repeatedly on the same DOM.
 */
export function applyDecorations(root: HTMLElement, options: DecorateOptions): void {
  cleanupDecorations(root);
  for (const text of options.highlights ?? []) {
    decorateMatches(root, text, "rc-highlight");
  }
  for (const term of options.candidates) {
    decorateMatches(root, term, "rc-autoterm");
  }
}

/** Unwrap every decoration span/mark back to plain text and re-merge text nodes. */
export function cleanupDecorations(root: HTMLElement): void {
  const decorated = root.querySelectorAll<HTMLElement>(".rc-autoterm, .rc-highlight");
  decorated.forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(el.textContent ?? ""), el);
  });
  root.normalize();
}

function shouldSkipTextNode(textNode: Text): boolean {
  const parent = textNode.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest(SKIP_ANCESTOR_SELECTOR));
}

function decorateMatches(
  root: HTMLElement,
  term: string,
  className: "rc-autoterm" | "rc-highlight",
): void {
  if (!term || term.length < 2) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const candidates: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    const t = node as Text;
    if (!shouldSkipTextNode(t) && t.nodeValue && t.nodeValue.includes(term)) {
      candidates.push(t);
    }
    node = walker.nextNode();
  }
  for (const textNode of candidates) splitAndWrap(textNode, term, className);
}

function splitAndWrap(
  textNode: Text,
  term: string,
  className: "rc-autoterm" | "rc-highlight",
): void {
  const text = textNode.nodeValue ?? "";
  if (!text) return;
  const parent = textNode.parentNode;
  if (!parent) return;

  const frag = document.createDocumentFragment();
  let cursor = 0;
  while (cursor < text.length) {
    const idx = text.indexOf(term, cursor);
    if (idx === -1) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
      break;
    }
    if (idx > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, idx)));
    const wrapper = document.createElement(className === "rc-highlight" ? "mark" : "span");
    wrapper.className = className;
    wrapper.textContent = term;
    if (className === "rc-autoterm") {
      wrapper.dataset.term = term;
      wrapper.setAttribute("role", "button");
      wrapper.setAttribute("tabindex", "0");
      wrapper.title = `点击深入研究：${term}`;
    }
    frag.appendChild(wrapper);
    cursor = idx + term.length;
  }
  parent.replaceChild(frag, textNode);
}

// Block elements that carry "a readable paragraph of context" — used to grab the
// paragraph around a clicked term / selection and send it to the model.
const PARAGRAPH_BLOCK_REGEX = /^(P|LI|BLOCKQUOTE|H[1-6]|TD|FIGCAPTION)$/i;

export function findEnclosingParagraphText(
  startEl: HTMLElement | null,
  root: HTMLElement,
): string | undefined {
  let cur: HTMLElement | null = startEl;
  while (cur && cur !== root) {
    if (PARAGRAPH_BLOCK_REGEX.test(cur.tagName)) {
      const text = (cur.textContent ?? "").trim();
      return text || undefined;
    }
    cur = cur.parentElement;
  }
  return undefined;
}
