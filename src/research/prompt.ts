// Prompt builders for research generation, ported from WindSeed Curve's
// `core/ai/prompt-*.ts` and condensed into one module.
//
// Two modes:
//  - outline: the user names a research direction; the model returns a
//    two-level title tree + mirrored brief tree (no article body).
//  - content: the user expands a follow-up question / deep-dives a bold term;
//    the model writes one 500–1200 character narrative article.
//
// The prompt *content* stays Chinese because it is product output for Chinese
// users; only code comments are English (public-repo language rule).

import { FOLLOWUP_COUNT } from "./contract";
import {
  DEFAULT_RESEARCH_STYLE,
  researchStyleDirective,
  type ResearchReplyStyle,
} from "./styles";
import type { ResearchGenerationInput, ResearchGenerationMode } from "./types";

/** Pick the generation mode: explicit override, else inferred from `question`. */
export function resolveMode(
  input: ResearchGenerationInput,
): ResearchGenerationMode {
  if (input.generationMode === "outline" || input.generationMode === "content") {
    return input.generationMode;
  }
  return input.question?.trim() ? "content" : "outline";
}

const N = FOLLOWUP_COUNT;

// --- Shared writing rules (content mode only) ---------------------------------

// Bold terms double as clickable deep-dive entries on the canvas, so the model
// must mark exactly the high-signal, researchable entities.
const EMPHASIS_RULE = [
  "✦ 关键探究点加粗铁律（产品核心交互依赖）：正文里所有「值得用户单独点开生长成一篇新文章的探究入口」在首次出现时必须用 markdown 加粗 `**xxx**`，前端会把它们变成可点击入口，点击即沿该入口生长子节点。判定标准只有一条「信噪比测试」：把这个词单独作为一次搜索，能否拿回一段有具体人物/年份/机构/数据/案例的可读内容？能→加粗；只会拿回泛泛定义→严禁加粗。",
  "  · ✅ 必须加粗：具名人物/药物/化合物/物种/理论/方程/算法/事件/实验/机构/期刊/关键年份（如 **爱因斯坦**、**双缝实验**、**薛定谔方程**、**CRISPR-Cas9**、**FDA**）。",
  "  · 🚫 严禁加粗：抽象修饰短语、流程类动名词、连词副词、宽泛大类概念（如 **核心机制**、**应用场景**、**重要意义**、**患者**、**研究**）。",
  "  · 必须加粗完整实体短语，不要切碎；仅首次出现时加粗；整篇加粗比例过高视为违规，密度参考每 100~150 字 1~3 个。",
].join("\n");

const NARRATIVE_RULES = [
  "==【内容质量铁律 - 长正文（500~1200 字）必须遵守】==",
  "✦ 信息密度：必须传递真实世界、可验证、有具体细节的领域知识——人名、年份、机构、实验、数据、案例必须落到具体；禁止「许多研究表明」「通常认为」这类无信息密度的填充措辞。",
  `✦ 叙事化（拒绝教科书）：以叙事性散文为主——开头有钩子（故事/反常识结论/戏剧性事件/具体人物），中段层层展开（机制/案例/对比/历史脉络），结尾自然过渡到 ${N} 个 follow-up。严禁「定义—分类—性质—举例」教科书结构，严禁说教语气。`,
  "✦ 案例化：遇到枯燥知识点（公式/定义/术语），必须先找一个具体人物/事件/类比/真实案例作切入口，再带出原理。",
  "✦ 可读性：正文以连贯段落为主，禁止整段靠 bullet list 撑起；列表只在确需并列时偶尔使用。",
  "✦ 长度：content 目标 500~1200 字，能流畅读 1-3 分钟；过短（<300 字）或只有提纲视为违规。",
  `✦ follow-up 配比：${N} 个 questions 必须同时覆盖「纵向深入」与「横向拓展」，禁止 ${N} 个都钻同一方向。`,
].join("\n");

const LOCALE_SUFFIX = (locale: string) => `回答语言使用 ${locale}。`;

// --- System prompts -----------------------------------------------------------

function outlineSystemPrompt(locale: string, style: ResearchReplyStyle): string {
  return [
    "你是 NanoBee 的领域研究助手。",
    "本次任务是「大纲模式」：用户开启一个全新研究主题，没有具体追问问题。你不写正文，只生成一份覆盖该领域核心知识点的「极简标题树 + 镜像简介树」研究目录。",
    "",
    "==【输出格式硬契约】==",
    "必须输出严格 JSON，不要 Markdown code fence、不要在 JSON 之外加任何解释文字。",
    '顶层字段顺序必须严格为：{"outline":[...],"outlineBriefs":[...],"content":"","questions":[...]}，让前端能先点亮标题、再填简介。',
    `顶层 \`questions\` 必须恰好 ${N} 个非空字符串，每个都适合作为下一步深挖节点。少于或多于 ${N} 个视为非法。`,
    "顶层可选 `tags`：1~4 个 ≤12 字短标签。",
    "",
    "==【大纲生成硬规则】==",
    '顶层 `content`：必须直接输出空字符串 ""——目录本身就是导航，不要总览正文。',
    "顶层 `outline`：标题树。每项只含 `title`（可选 `children` 同形递归、可选 `tags`），严禁含 brief/detail/questions，严禁写成裸字符串或 null。",
    "🎯 必须至少两级目录：每个一级节点都必须有 `children`（建议 2-5 项）；建议 5-8 个一级节点。只输出一级节点视为违规。",
    "顶层 `outlineBriefs`：与 `outline` 结构完全镜像（同层级、同顺序、同标题），每个节点额外加 `brief` 字段——纯文本一段话、1~120 汉字、有信息密度（具体人物/年份/事件/反常识结论作钩子），不要 markdown/引号/序号/emoji/换行。",
    "",
    "==【title 写作要求】==",
    "每个 title 是一句「能勾起好奇心的具体切入点」，10~30 字，可以是问题句/悬念句/反常识结论；禁止只是名词短语（「量子力学」）或干巴口号（「核心理论」）。",
    "",
    researchStyleDirective(style, "outline"),
    "",
    LOCALE_SUFFIX(locale),
  ].join("\n");
}

function contentSystemPrompt(locale: string, style: ResearchReplyStyle): string {
  return [
    "你是 NanoBee 的领域研究助手。",
    "本次任务是「正文模式」：用户带着具体问题追问，或大纲里某个节点被展开。目标是把这一个节点写成一篇能读 1-3 分钟的好文章。",
    "",
    "==【输出格式硬契约】==",
    "必须输出严格 JSON，不要 Markdown code fence、不要在 JSON 之外加任何解释文字。",
    `JSON 顶层至少包含：{"content":"...","questions":[...]}。\`questions\` 必须恰好 ${N} 个非空字符串，每个适合作为下一步深挖节点。少于或多于 ${N} 个视为非法。`,
    "顶层 `content`：500~1200 字的完整叙事正文，按下文铁律写作。",
    "顶层 `summary`（必填）：在 content 之后输出一段 ≤120 汉字的紧凑卡片摘要，传达正文主体+核心结论，纯一段话不换行、不加 markdown/引号/序号/emoji。",
    "顶层可选 `tags`：1~4 个 ≤12 字短标签。🚫 不要输出 `outline`。",
    "",
    NARRATIVE_RULES,
    EMPHASIS_RULE,
    "",
    researchStyleDirective(style, "content"),
    "",
    LOCALE_SUFFIX(locale),
  ].join("\n");
}

// --- User prompts -------------------------------------------------------------

function outlineUserPrompt(input: ResearchGenerationInput): string {
  const contextBlock = input.context?.trim()
    ? `已有上下文：\n${input.context.trim()}\n`
    : "";
  return [
    `研究主题：${input.topic}`,
    "",
    contextBlock,
    `请为这个主题生成一份兴趣驱动型研究大纲，并给出 ${N} 个下一步探索问题；可附 1~4 个简短 tags。`,
    "先输出 `outline`（极简标题树，至少两级，每个一级节点带 2-5 个 children），再输出 `outlineBriefs`（镜像结构，每节点一个 ≤120 汉字、有具体钩子的 brief）。JSON 顶层字段顺序严格为 outline → outlineBriefs → content → questions，content 输出空字符串。",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function contentUserPrompt(input: ResearchGenerationInput): string {
  const contextBlock = input.context?.trim()
    ? `已有上下文：\n${input.context.trim()}\n`
    : "";
  const anchorParagraph = input.focusParagraph?.trim();
  const anchorBlock = input.focusTerm?.trim()
    ? [
        "==【本次为深入探究：用户在阅读中点击了正文里的高亮关键词】==",
        `用户点击的锚点：「${input.focusTerm.trim()}」`,
        // The paragraph the anchor sat in — grounds the deep-dive in the reader's
        // actual point of interest rather than the bare phrase.
        anchorParagraph
          ? `锚点所在原文段落（仅作背景，理解用户从什么语境点进来；不要逐句复述）：\n${anchorParagraph}`
          : "",
        "请围绕这个锚点生长一篇独立成文的新节点：开篇承接用户的兴趣点（不要复读原文、不要字典式定义），内容同时覆盖纵向深入（更深机制/数据/前沿/具体人物事件）与横向拓展（相邻领域/跨学科类比/对立观点/历史脉络）。",
        "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  const questionLine = input.question
    ? `当前问题：${input.question}`
    : "当前问题：请围绕本节点的主题写一篇完整正文。";
  return [
    anchorBlock,
    `研究主题：${input.topic}`,
    "",
    questionLine,
    "",
    contextBlock,
    `请按内容质量铁律写 500~1200 字完整正文（开头钩子 + 中段层层展开 + 自然过渡到 ${N} 个 follow-up），并给出 ${N} 个下一步探索问题；可附 1~4 个简短 tags。`,
    "正文之后输出顶层 `summary`（≤120 汉字，纯一段话）。不要返回 outline 字段。",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Build the system + user messages for one generation call. */
export function buildResearchMessages(input: ResearchGenerationInput): {
  system: string;
  user: string;
} {
  const locale = input.locale?.trim() || "zh-CN";
  const style = input.style ?? DEFAULT_RESEARCH_STYLE;
  if (resolveMode(input) === "content") {
    return { system: contentSystemPrompt(locale, style), user: contentUserPrompt(input) };
  }
  return { system: outlineSystemPrompt(locale, style), user: outlineUserPrompt(input) };
}

/** Repair instruction injected as a retry when the first reply fails the schema. */
export const REPAIR_INSTRUCTION = [
  "Your previous output was rejected because it did not satisfy the strict contract.",
  "Reply again with ONLY a single JSON object, no Markdown, no code fences, no commentary.",
  `Top-level keys MUST include \`content\` (string) and \`questions\` (array of exactly ${N} non-empty strings).`,
  "For outline mode, also emit `outline` (array of objects, each with a `title`; level-1 items must have a non-empty `children` array) and a mirrored `outlineBriefs` array adding a `brief` to every node.",
  "For content mode, also emit `summary` (string). Do not wrap the JSON in fences.",
].join(" ");
