// Curated catalog that powers the Artifacts page browse experience: the
// category tabs ("科技 / 开发者 / 财经 / 新闻 / 生活") and the recommended
// templates shown under each category — and at the bottom of the empty
// "你创建的" / "你收藏的" tabs so a brand-new user always has something to click.
//
// A template is a one-click seed for the data-view pipeline: clicking it runs
// `prompt` through the chat agent's create_data_view tool (the same path as
// typing the request in chat), producing a real data view that then lives under
// "你创建的". Pure static content — no generation logic here.
//
// Product copy is Chinese (user-facing output); code/comments stay English.

import type { IconName } from "../types";

/** A browse category — one tab after the personal tabs. */
export interface ArtifactCategory {
  /** Stable id, used as the URL `tab` value. */
  id: string;
  /** Chinese tab label. */
  label: string;
  /** Tab/section icon. */
  icon: IconName;
}

/** A one-click recommended template that seeds a data view. */
export interface RecommendedTemplate {
  /** Stable id (also a React key). */
  id: string;
  /** Owning category id. */
  categoryId: string;
  /** Template title. */
  title: string;
  /** One-line description under the title. */
  subtitle: string;
  /** The canned chat prompt this template sends (asks for a data view). */
  prompt: string;
  /** Optional small badge, e.g. "热门". */
  badge?: string;
}

/** The browse categories, in tab order (after 你创建的 / 你收藏的). */
export const ARTIFACT_CATEGORIES: ArtifactCategory[] = [
  { id: "tech", label: "科技", icon: "spark" },
  { id: "dev", label: "开发者", icon: "bolt" },
  { id: "finance", label: "财经", icon: "coins" },
  { id: "news", label: "新闻", icon: "globe" },
  { id: "life", label: "生活", icon: "heart" },
];

/** All recommended templates, grouped by category. Each prompt asks the agent to
 *  create a data view (the create_data_view tool picks the source + topic). */
export const RECOMMENDED_TEMPLATES: RecommendedTemplate[] = [
  // 科技
  {
    id: "rec_tech_ai",
    categoryId: "tech",
    title: "AI 头条精选",
    subtitle: "只看 Hacker News 上 AI / 大模型相关帖子",
    prompt: "帮我创建一个数据视图：只看 Hacker News 上 AI / 大模型相关的帖子",
    badge: "热门",
  },
  {
    id: "rec_tech_startup",
    categoryId: "tech",
    title: "科技创业动态",
    subtitle: "聚焦科技创业与融资的新闻流",
    prompt: "帮我创建一个数据视图：聚合科技创业与融资相关的新闻",
  },

  // 开发者
  {
    id: "rec_dev_hn",
    categoryId: "dev",
    title: "开发者 Hacker News",
    subtitle: "编程、开源与开发工具的热门讨论",
    prompt: "帮我创建一个开发者向的 Hacker News 数据视图，聚焦编程、开源与开发工具",
    badge: "热门",
  },
  {
    id: "rec_dev_rust",
    categoryId: "dev",
    title: "Rust 语言动态",
    subtitle: "跟踪 Rust 相关的讨论与项目",
    prompt: "帮我创建一个数据视图：跟踪 Rust 语言相关的 Hacker News 讨论",
  },

  // 财经
  {
    id: "rec_finance_fed",
    categoryId: "finance",
    title: "美联储与利率",
    subtitle: "利率决议与美联储动态新闻",
    prompt: "帮我创建一个数据视图：跟踪美联储与利率相关的财经新闻",
    badge: "热门",
  },
  {
    id: "rec_finance_gold",
    categoryId: "finance",
    title: "黄金行情速览",
    subtitle: "黄金价格与相关市场新闻",
    prompt: "帮我创建一个数据视图：跟踪黄金价格与相关的市场新闻",
  },

  // 新闻
  {
    id: "rec_news_tech",
    categoryId: "news",
    title: "今日科技要闻",
    subtitle: "聚合当天科技领域要闻",
    prompt: "帮我创建一个数据视图：聚合今日科技领域的要闻",
  },
  {
    id: "rec_news_ai_policy",
    categoryId: "news",
    title: "AI 监管动态",
    subtitle: "AI 监管与政策相关报道",
    prompt: "帮我创建一个数据视图：跟踪 AI 监管与政策相关的新闻",
  },

  // 生活
  {
    id: "rec_life_science",
    categoryId: "life",
    title: "健康与科学",
    subtitle: "健康与前沿科学新闻",
    prompt: "帮我创建一个数据视图：跟踪健康与前沿科学相关的新闻",
  },
  {
    id: "rec_life_space",
    categoryId: "life",
    title: "太空与探索",
    subtitle: "太空探索与航天动态",
    prompt: "帮我创建一个数据视图：跟踪太空探索与航天相关的新闻",
  },
];

/** Templates for one category, in catalog order. */
export function templatesForCategory(categoryId: string): RecommendedTemplate[] {
  return RECOMMENDED_TEMPLATES.filter((t) => t.categoryId === categoryId);
}

/**
 * A cross-category "为你推荐" set for the empty personal tabs: the first
 * template of each category, so a new user sees a varied spread rather than
 * several from one topic.
 */
export function recommendedForYou(limit = 6): RecommendedTemplate[] {
  const leads: RecommendedTemplate[] = [];
  for (const cat of ARTIFACT_CATEGORIES) {
    const first = RECOMMENDED_TEMPLATES.find((t) => t.categoryId === cat.id);
    if (first) leads.push(first);
  }
  return leads.slice(0, limit);
}

/** Look up a category's label, falling back to the raw id. */
export function categoryLabel(categoryId: string): string {
  return ARTIFACT_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}
