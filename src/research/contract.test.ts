import { describe, it, expect } from "vitest";
import { parseModelPayload } from "./contract";

// A minimal contract-valid outline payload, expressed as the model's mirrored
// `outline` + `outlineBriefs` trees (merged by `sanitizePayload` on parse).
const OUTLINE = [
  { title: "为什么咖啡因能骗过大脑", children: [{ title: "腺苷受体的占位战" }] },
];
const OUTLINE_BRIEFS = [
  {
    title: "为什么咖啡因能骗过大脑",
    brief: "咖啡因与腺苷结构相似，竞争性占据 A1/A2A 受体。",
    children: [{ title: "腺苷受体的占位战", brief: "突触间隙里的分子伪装术。" }],
  },
];
const QUESTIONS = ["问题一", "问题二", "问题三"];

describe("parseModelPayload", () => {
  it("parses a single bare JSON object (fast path)", () => {
    const raw = JSON.stringify({
      outline: OUTLINE,
      outlineBriefs: OUTLINE_BRIEFS,
      content: "",
      questions: QUESTIONS,
      tags: ["睡眠"],
    });
    const out = parseModelPayload(raw);
    expect(out.questions).toEqual(QUESTIONS);
    expect(out.outline?.[0].brief).toBe("咖啡因与腺苷结构相似，竞争性占据 A1/A2A 受体。");
    expect(out.tags).toEqual(["睡眠"]);
  });

  it("recovers JSON wrapped in model commentary", () => {
    const obj = JSON.stringify({ content: "正文", questions: QUESTIONS });
    const raw = `Sure! Here is the result:\n${obj}\nLet me know if you need changes.`;
    const out = parseModelPayload(raw);
    expect(out.content).toBe("正文");
    expect(out.questions).toEqual(QUESTIONS);
  });

  // The real /generate 502 regression: Gemini 3.5 Flash split one reply into
  // concatenated top-level objects (main payload, then a separate `{"tags"}`).
  it("merges a reply split across multiple concatenated JSON objects", () => {
    const main = JSON.stringify({
      outline: OUTLINE,
      outlineBriefs: OUTLINE_BRIEFS,
      content: "",
      questions: QUESTIONS,
    });
    const tail = JSON.stringify({ tags: ["睡眠科学", "咖啡因代谢"] });
    const out = parseModelPayload(`${main}\n${tail}`);
    expect(out.questions).toEqual(QUESTIONS);
    expect(out.tags).toEqual(["睡眠科学", "咖啡因代谢"]);
    expect(out.outline?.[0].title).toBe("为什么咖啡因能骗过大脑");
  });

  it("picks the richest value per key when a split repeats a key", () => {
    // questions peeled into a trailing object; the empty one must not win.
    const main = JSON.stringify({ content: "正文", questions: [] });
    const tail = JSON.stringify({ questions: QUESTIONS });
    const out = parseModelPayload(`${main}${tail}`);
    expect(out.questions).toEqual(QUESTIONS);
  });

  it("does not miscount braces that appear inside string values", () => {
    const raw = JSON.stringify({
      content: "用 {curly} 和 } 这样的符号也不能破坏解析",
      questions: QUESTIONS,
    });
    const out = parseModelPayload(raw);
    expect(out.content).toContain("{curly}");
  });

  it("throws when no JSON object is present", () => {
    expect(() => parseModelPayload("抱歉，我无法完成这个请求。")).toThrow(
      "did not return JSON content",
    );
  });

  it("enforces the exactly-three-questions invariant", () => {
    const raw = JSON.stringify({ content: "正文", questions: ["只有一个"] });
    expect(() => parseModelPayload(raw)).toThrow();
  });
});
