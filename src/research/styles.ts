// Research reply-style presets for the Research Canvas.
//
// A user-selectable "AI reply style" that re-shapes BOTH the generated outline
// and the article output — tone, depth, terminology and length. The chosen
// style is a browser-local preference (see store/useResearchPrefs) sent with
// every generation request and woven into the system prompt by
// research/prompt.ts.
//
// Style ids are stable identifiers (persisted to localStorage + sent over the
// wire); labels/descriptions and the prompt directives are Chinese on purpose —
// they are product output, like the rest of research/prompt.ts.

/** Stable style ids — kept as a tuple so the worker can build a zod enum. */
export const RESEARCH_STYLE_IDS = ["popular", "professional", "concise"] as const;

export type ResearchReplyStyle = (typeof RESEARCH_STYLE_IDS)[number];

/** The style applied when the user hasn't chosen one. Matches the product's
 *  default voice (curious-reader popularization), so existing behavior is kept. */
export const DEFAULT_RESEARCH_STYLE: ResearchReplyStyle = "popular";

export interface ResearchStyleOption {
  id: ResearchReplyStyle;
  /** Short display name shown in settings (科普 / 专业 / 简练). */
  label: string;
  /** One-line description shown under the option. */
  description: string;
}

/** Selectable options, in display order, for the settings UI. */
export const RESEARCH_STYLE_OPTIONS: ResearchStyleOption[] = [
  {
    id: "popular",
    label: "科普",
    description: "面向好奇心驱动的大众读者：亲切生动、多用类比和故事，把术语讲成人话。",
  },
  {
    id: "professional",
    label: "专业",
    description: "面向有专业背景的读者：严谨克制、术语精确，强调机制、数据与前沿，信息密度更高。",
  },
  {
    id: "concise",
    label: "简练",
    description: "直给结论、干净利落：去掉铺垫与修辞，篇幅更短、重点突出。",
  },
];

/** Coerce an unknown value into a valid style id (falls back to the default). */
export function normalizeReplyStyle(value: unknown): ResearchReplyStyle {
  return RESEARCH_STYLE_IDS.includes(value as ResearchReplyStyle)
    ? (value as ResearchReplyStyle)
    : DEFAULT_RESEARCH_STYLE;
}

// --- Prompt directives --------------------------------------------------------
// The block returned here is appended to the system prompt AFTER the base rules,
// so it takes precedence on tone / depth / length where the two disagree.

interface StyleDirective {
  /** Extra guidance for outline mode (title tree + brief tree). */
  outline: string;
  /** Extra guidance for content mode (one article). */
  content: string;
}

const STYLE_DIRECTIVES: Record<ResearchReplyStyle, StyleDirective> = {
  popular: {
    outline:
      "标题用能勾起好奇心的具体问题 / 悬念 / 反常识结论，避免干巴名词；brief 亲切生动，点出一个有趣的人物 / 事件 / 反差钩子。",
    content:
      "面向对该领域好奇但非专业的大众读者：语气亲切、有温度、讲故事；多用贴近生活的类比与具体人物 / 事件作切入；遇到术语先用大白话点破再展开；保留趣味钩子与反常识结论。篇幅按默认 500~1200 字。",
  },
  professional: {
    outline:
      "标题聚焦核心机制、关键方法、重要争议与前沿进展，而非趣味噱头；brief 用准确、信息密度高的专业表述，可点名关键理论 / 方法 / 数据。",
    content:
      "面向有一定专业背景的读者：语气严谨克制、信息致密；精确使用领域术语（不必翻译成大白话），优先呈现机制、数据、实验、方法论、前沿与论证链条；减少铺垫与煽情，可适当提高深度。仍需保留加粗探究点与 follow-up，篇幅取 700~1200 字偏上限。",
  },
  concise: {
    outline:
      "标题与 brief 都尽量短、直指要点；brief 控制在 ≤50 字，只保留最关键的钩子或结论。",
    content:
      "直给结论、干净利落：先抛核心结论再补关键支撑，去掉寒暄、铺垫与修辞堆叠；句子短、节奏快、重点突出。本次篇幅以「简练」为准，目标 300~600 字（覆盖上面 500~1200 字的设定），不要凑字数；仍保留加粗探究点与 3 个 follow-up。",
  },
};

/**
 * The style block appended to the system prompt for the given mode. Empty
 * string for an unknown style (defensive — callers pass a normalized id).
 */
export function researchStyleDirective(
  style: ResearchReplyStyle,
  mode: "outline" | "content",
): string {
  const directive = STYLE_DIRECTIVES[style];
  if (!directive) return "";
  const name = RESEARCH_STYLE_OPTIONS.find((o) => o.id === style)?.label ?? style;
  return [
    `==【本次回复风格：${name}（用户在设置中选定，优先级高于上面的语气 / 篇幅默认）】==`,
    mode === "outline" ? directive.outline : directive.content,
  ].join("\n");
}
