// Curated catalog that powers the Artifacts page browse experience: the
// category tabs ("金融 / 科技 / 开发者 …") and the recommended templates shown
// under each category — and at the bottom of the empty "你创建的" / "你收藏的"
// tabs so a brand-new user always has something to click.
//
// A template is a one-click seed for the existing generation pipeline: clicking
// it runs `prompt` through the chat agent's create_card_artifact tool (the same
// path as the quick-launch shortcuts), producing a real artifact that then lives
// under "你创建的". So this file is pure static content — no generation logic.
//
// Every implemented card kind today is "word" (vocabulary), so each template is
// a themed vocabulary deck; the category is the theme. As new kinds ship, add
// templates with the new kind/prompt here without touching the page.
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

/** A one-click recommended template that seeds a generation. */
export interface RecommendedTemplate {
  /** Stable id (also a generation key / React key). */
  id: string;
  /** Owning category id. */
  categoryId: string;
  /** Card title. */
  title: string;
  /** One-line description under the title. */
  subtitle: string;
  /** The canned chat prompt this template sends. */
  prompt: string;
  /** Optional small badge, e.g. "热门". */
  badge?: string;
}

/** The browse categories, in tab order (after 你创建的 / 你收藏的). */
export const ARTIFACT_CATEGORIES: ArtifactCategory[] = [
  { id: "finance", label: "金融", icon: "coins" },
  { id: "tech", label: "科技", icon: "spark" },
  { id: "dev", label: "开发者", icon: "bolt" },
  { id: "business", label: "商务", icon: "trend" },
  { id: "travel", label: "旅行", icon: "globe" },
  { id: "academic", label: "学术", icon: "book" },
  { id: "life", label: "生活", icon: "heart" },
];

/** All recommended templates, grouped logically by category. */
export const RECOMMENDED_TEMPLATES: RecommendedTemplate[] = [
  // 金融
  {
    id: "rec_finance_market",
    categoryId: "finance",
    title: "金融市场高频词",
    subtitle: "股票、债券、汇率核心词汇",
    prompt: "教我 10 个金融市场（股票、债券、汇率）高频英语单词",
    badge: "热门",
  },
  {
    id: "rec_finance_invest",
    categoryId: "finance",
    title: "投资理财术语",
    subtitle: "资产配置与收益常用语",
    prompt: "教我 10 个投资理财常用英语术语",
  },
  {
    id: "rec_finance_bank",
    categoryId: "finance",
    title: "银行与支付",
    subtitle: "开户、转账、支付场景",
    prompt: "教我 10 个银行与支付场景常用英语单词",
  },

  // 科技
  {
    id: "rec_tech_ai",
    categoryId: "tech",
    title: "人工智能热词",
    subtitle: "模型、训练、推理高频词",
    prompt: "教我 10 个人工智能领域高频英语单词",
    badge: "热门",
  },
  {
    id: "rec_tech_product",
    categoryId: "tech",
    title: "互联网产品",
    subtitle: "增长、留存、转化术语",
    prompt: "教我 10 个互联网产品常用英语单词",
  },
  {
    id: "rec_tech_hardware",
    categoryId: "tech",
    title: "数码硬件",
    subtitle: "芯片、屏幕、外设词汇",
    prompt: "教我 10 个数码硬件常用英语单词",
  },

  // 开发者
  {
    id: "rec_dev_basics",
    categoryId: "dev",
    title: "编程基础术语",
    subtitle: "变量、函数、循环必备词",
    prompt: "教我 10 个编程基础英语术语",
    badge: "热门",
  },
  {
    id: "rec_dev_review",
    categoryId: "dev",
    title: "代码评审用语",
    subtitle: "Code review 常用表达",
    prompt: "教我 10 个代码评审（code review）常用英语表达",
  },
  {
    id: "rec_dev_cloud",
    categoryId: "dev",
    title: "云与 DevOps",
    subtitle: "部署、容器、流水线词汇",
    prompt: "教我 10 个云计算与 DevOps 常用英语单词",
  },

  // 商务
  {
    id: "rec_business_email",
    categoryId: "business",
    title: "商务邮件",
    subtitle: "正式邮件高频用词",
    prompt: "教我 10 个商务邮件高频英语单词",
  },
  {
    id: "rec_business_meeting",
    categoryId: "business",
    title: "会议与谈判",
    subtitle: "提案、讨论、达成共识",
    prompt: "教我 10 个会议与谈判常用英语表达",
  },

  // 旅行
  {
    id: "rec_travel_airport",
    categoryId: "travel",
    title: "机场与航班",
    subtitle: "值机、登机、转机场景",
    prompt: "教我 10 个机场与航班场景常用英语单词",
    badge: "热门",
  },
  {
    id: "rec_travel_hotel",
    categoryId: "travel",
    title: "酒店入住",
    subtitle: "预订、入住、退房用语",
    prompt: "教我 10 个酒店入住常用英语表达",
  },
  {
    id: "rec_travel_restaurant",
    categoryId: "travel",
    title: "餐厅点餐",
    subtitle: "点单、口味、结账词汇",
    prompt: "教我 10 个餐厅点餐常用英语单词",
  },

  // 学术
  {
    id: "rec_academic_paper",
    categoryId: "academic",
    title: "论文写作",
    subtitle: "摘要、论证、引用高频词",
    prompt: "教我 10 个学术论文写作高频英语单词",
  },
  {
    id: "rec_academic_talk",
    categoryId: "academic",
    title: "学术演讲",
    subtitle: "报告与答辩常用表达",
    prompt: "教我 10 个学术演讲常用英语表达",
  },

  // 生活
  {
    id: "rec_life_emotion",
    categoryId: "life",
    title: "情绪表达",
    subtitle: "描述心情与感受",
    prompt: "教我 10 个表达情绪和心情的英语单词",
  },
  {
    id: "rec_life_fitness",
    categoryId: "life",
    title: "健身与运动",
    subtitle: "训练、器械、动作词汇",
    prompt: "教我 10 个健身与运动常用英语单词",
  },
  {
    id: "rec_life_food",
    categoryId: "life",
    title: "烹饪美食",
    subtitle: "食材、做法、口感用语",
    prompt: "教我 10 个烹饪美食常用英语单词",
  },
];

/** Templates for one category, in catalog order. */
export function templatesForCategory(categoryId: string): RecommendedTemplate[] {
  return RECOMMENDED_TEMPLATES.filter((t) => t.categoryId === categoryId);
}

/**
 * A cross-category "为你推荐" set for the empty personal tabs: the first
 * template of each category (the curated lead of each theme), so a new user sees
 * a varied spread rather than three decks from one topic.
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
