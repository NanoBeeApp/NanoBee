// Shared display formatting for artifacts — labels + the one-line meta. Handles
// both artifact kinds: data views ("Hacker News · 128 条") and legacy word decks
// ("单词 · 10 张"). Centralized so the card / row / table renderers all read from
// one place.

import type { Artifact, PipelineStatus } from "./types";

/** Map an artifact kind to a short human label. */
const KIND_LABEL: Record<string, string> = { word: "单词", data_view: "数据视图" };

/** Human label for an artifact kind (falls back to the raw kind). */
export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

/** Friendly label for a data-hub source id. */
const SOURCE_LABEL: Record<string, string> = {
  hackernews: "Hacker News",
  news: "新闻",
  websearch: "网络搜索",
  gold: "黄金",
  stocks: "股票",
  crypto: "加密货币",
  forex: "外汇",
  treasury: "美债",
  "econ-calendar": "经济日历",
  webpage: "网页",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

/** Human label for a pipeline stage (used by the status pill). */
const STATUS_LABEL: Record<PipelineStatus, string> = {
  pending: "排队中",
  fetching: "拉取中…",
  filtering: "筛选中…",
  extracting: "整理中…",
  templating: "生成中…",
  ready: "就绪",
  error: "出错",
};

export function pipelineStatusLabel(s: PipelineStatus): string {
  return STATUS_LABEL[s] ?? s;
}

/** The artifact's primary count (items for a data view, cards for a word deck). */
export function artifactCount(a: Artifact): number {
  return a.kind === "data_view" ? a.itemCount : a.cardCount;
}

/** The one-line meta shown under/next to a title. */
export function artifactMeta(a: Artifact): string {
  if (a.kind === "data_view") return `${sourceLabel(a.source)} · ${a.itemCount} 条`;
  return `${kindLabel(a.kind)} · ${a.cardCount} 张`;
}
