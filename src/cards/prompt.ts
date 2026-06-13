// Per-kind generation specs for the Dynamic Card feature. Each CardKindSpec
// bundles everything one kind needs: display metadata, its card schema, count
// bounds, and a prompt builder. The worker looks up a spec by kind and is
// otherwise kind-agnostic — adding a new data type means adding one spec here
// plus one renderer on the client, nothing else.
//
// Prompt *content* stays Chinese (product output for Chinese users); only code
// and comments are English (public-repo language rule).

import type { ZodTypeAny } from "zod";
import { wordCardSchema } from "./contract";
import type { CardGenerationInput, CardKind } from "./types";

/** Everything the worker needs to generate + validate one kind of deck. */
export interface CardKindSpec {
  id: CardKind;
  /** Human label for the kind, e.g. "单词卡片". */
  label: string;
  /** One-line description shown on the kind picker. */
  description: string;
  /** Default number of cards when the user does not specify. */
  defaultCount: number;
  /** Allowed count range (clamped before prompting). */
  minCount: number;
  maxCount: number;
  /** Zod schema validating one card of this kind. */
  cardSchema: ZodTypeAny;
  /** Build the system + user messages for one generation call. */
  buildMessages: (
    input: CardGenerationInput,
    count: number,
  ) => { system: string; user: string };
}

const LOCALE_SUFFIX = (locale: string) => `解释性文字使用 ${locale}。`;

// --- word kind ----------------------------------------------------------------

function wordSystemPrompt(count: number, locale: string): string {
  return [
    "你是 NanoBee 的英语单词卡片生成器。",
    `本次任务：生成 ${count} 个适合中文学习者每日记忆的英语单词卡片。`,
    "",
    "==【输出格式硬契约】==",
    "必须输出严格 JSON，禁止 Markdown code fence，禁止在 JSON 之外写任何解释文字。",
    '顶层结构严格为：{"title":"...","subtitle":"...","cards":[ {单词卡片}, ... ]}。',
    `\`cards\` 数组必须恰好 ${count} 个元素，元素之间不得重复同一个单词。`,
    "",
    "==【每个单词卡片字段】==",
    "word（必填）：英文单词或常用短语，全小写（专有名词除外）。",
    "phonetic（必填）：IPA 音标，带斜杠，如 /ˌser.ənˈdɪp.ə.ti/。",
    "partOfSpeech（必填）：词性缩写，如 n. / v. / adj. / adv.。",
    "definition（必填）：一句简洁的英文释义。",
    "translation（必填）：对应中文释义，简短准确。",
    "example（必填）：一句自然地道、能体现词义的英文例句。",
    "exampleTranslation（必填）：例句的中文翻译。",
    "synonyms（可选）：2~4 个近义词数组。",
    "mnemonic（可选）：一句中文记忆法或词根词源，帮助记住该词。",
    "",
    "==【内容质量铁律】==",
    "单词要真实存在、拼写正确、音标准确；释义和例句要彼此对应、不能张冠李戴。",
    "难度适中、实用高频，避免生僻到几乎用不到的词；同一副卡片内难度可有梯度但风格统一。",
    "title 用一句中文概括这组单词的主题，如「今日 10 词 · 情绪表达」；subtitle 可补一句学习提示。",
    "",
    LOCALE_SUFFIX(locale),
  ].join("\n");
}

function wordUserPrompt(input: CardGenerationInput, count: number): string {
  const theme = input.topic?.trim();
  const themeLine = theme
    ? `围绕主题「${theme}」挑选这 ${count} 个单词，确保都与该主题相关。`
    : `挑选 ${count} 个实用高频、覆盖不同生活/学习场景的单词。`;
  return [
    `请生成 ${count} 个英语单词卡片。`,
    themeLine,
    "严格按系统提示的 JSON 契约输出，cards 中每个对象字段齐全。",
  ].join("\n");
}

// --- registry -----------------------------------------------------------------

const WORD_SPEC: CardKindSpec = {
  id: "word",
  label: "单词卡片",
  description: "AI 每天教你一组英语单词，含音标、释义、例句与记忆法",
  defaultCount: 10,
  minCount: 1,
  maxCount: 20,
  cardSchema: wordCardSchema,
  buildMessages: (input, count) => {
    const locale = input.locale?.trim() || "zh-CN";
    return {
      system: wordSystemPrompt(count, locale),
      user: wordUserPrompt(input, count),
    };
  },
};

/** All registered card kinds, keyed by id. */
export const CARD_KIND_SPECS: Record<CardKind, CardKindSpec> = {
  word: WORD_SPEC,
};

/** Look up a kind spec, throwing on an unknown kind. */
export function getCardKindSpec(kind: CardKind): CardKindSpec {
  const spec = CARD_KIND_SPECS[kind];
  if (!spec) throw new Error(`Unknown card kind: ${kind}`);
  return spec;
}

/** Clamp a requested count into the kind's allowed range. */
export function resolveCount(spec: CardKindSpec, requested?: number): number {
  if (!requested || !Number.isFinite(requested)) return spec.defaultCount;
  return Math.max(spec.minCount, Math.min(spec.maxCount, Math.round(requested)));
}

/** Repair instruction injected as a retry when the first reply fails the schema. */
export const CARD_REPAIR_INSTRUCTION = [
  "Your previous output was rejected because it did not satisfy the strict contract.",
  "Reply again with ONLY a single JSON object, no Markdown, no code fences, no commentary.",
  'Top-level shape MUST be {"title": string, "subtitle"?: string, "cards": array}.',
  "Every card object must include all required fields for its kind.",
].join(" ");
