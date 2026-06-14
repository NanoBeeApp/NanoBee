import { describe, it, expect } from "vitest";
import { completeStreamingMarkdown } from "./complete-streaming-markdown";

describe("completeStreamingMarkdown", () => {
  it("leaves complete, balanced markdown unchanged", () => {
    const balanced = [
      "# Title\n\nA paragraph.",
      "Some **bold** and *italic* and `code`.",
      "```js\nconst x = 1;\n```",
      "A [link](https://example.com) and ~~strike~~.",
      "$$\na^2 + b^2\n$$",
      "it costs $5 today", // lone $ is currency, must not become a formula
      "snake_case stays plain",
    ];
    for (const md of balanced) {
      expect(completeStreamingMarkdown(md)).toBe(md);
    }
  });

  it("closes a half-typed bold span", () => {
    expect(completeStreamingMarkdown("an **important")).toBe("an **important**");
  });

  it("closes a still-open fenced code block (the worst reflow source)", () => {
    const out = completeStreamingMarkdown("```js\nconst a = 1");
    expect(out.endsWith("```")).toBe(true);
    expect((out.match(/^[ \t]{0,3}`{3,}/gm) ?? []).length % 2).toBe(0);
  });

  it("closes an open inline code run", () => {
    expect(completeStreamingMarkdown("run `npm")).toBe("run `npm`");
  });

  it("closes open strikethrough and display math", () => {
    expect(completeStreamingMarkdown("~~old")).toBe("~~old~~");
    expect(completeStreamingMarkdown("$$\n\\int x").endsWith("$$")).toBe(true);
  });

  it("closes bold+italic together (***)", () => {
    expect(completeStreamingMarkdown("***wow")).toBe("***wow***");
  });

  it("hides a dangling block-marker prefix line", () => {
    expect(completeStreamingMarkdown("para\n## ")).toBe("para\n");
    expect(completeStreamingMarkdown("para\n- ")).toBe("para\n");
    expect(completeStreamingMarkdown("para\n> ")).toBe("para\n");
  });

  it("hides an unterminated link until its ) arrives", () => {
    expect(completeStreamingMarkdown("see [Google](https://goog")).toBe("see ");
  });

  it("does NOT close a lone $ (currency, not a formula)", () => {
    expect(completeStreamingMarkdown("it costs $5")).toBe("it costs $5");
  });

  it("does not let inline-code contents skew emphasis counts", () => {
    // The * inside `2 * 3` is code, the ** is a real open span.
    expect(completeStreamingMarkdown("`2 * 3` and **bold")).toBe(
      "`2 * 3` and **bold**",
    );
  });

  // Property check: every streaming frame must be structurally balanced, so the
  // rendered block/inline structure never snaps from one token to the next.
  it("keeps every prefix of a document structurally balanced", () => {
    const DOC = [
      "# Heading",
      "",
      "Intro with **bold**, *italic*, `code`, and ~~strike~~ words.",
      "",
      "```ts",
      "const greet = (name: string) => `hi ${name}`;",
      "```",
      "",
      "- first item",
      "- second item",
      "",
      "A [link](https://example.com) and a formula:",
      "",
      "$$",
      "E = mc^2",
      "$$",
      "",
      "Done.",
    ].join("\n");

    const evenMarker = (s: string, re: RegExp) =>
      (s.match(re) ?? []).length % 2 === 0;

    for (let k = 1; k <= DOC.length; k++) {
      const frame = completeStreamingMarkdown(DOC.slice(0, k));
      // Fenced blocks must be balanced (never an open fence swallowing the rest).
      expect(evenMarker(frame, /^[ \t]{0,3}`{3,}/gm)).toBe(true);
      // Strip code so its literal markers don't count.
      const prose = frame
        .replace(/(`{3,})[\s\S]*?\1/g, "")
        .replace(/(`+)[^`\n]*?\1/g, "");
      expect(evenMarker(prose, /\*\*/g)).toBe(true);
      expect(evenMarker(prose, /~~/g)).toBe(true);
      expect(evenMarker(prose, /\$\$/g)).toBe(true);
      expect(evenMarker(prose, /`/g)).toBe(true);
    }
  });
});
