// Task template catalog for the one-click template picker on the Tasks home screen.
// Every template carries a ready triggerSpec so POST /api/tasks can be called
// directly without any LLM round-trip. Templates whose required data-hub source
// does not yet exist are marked `comingSoon: true` — they display grayed out and
// cannot be activated until the source ships.
//
// Available data-hub sources today: 'gold', 'hackernews', 'websearch'.
// Schedule-only templates (no data source) are always available.
//
// Change history:
//   2026-06-15  Initial catalog: 3 categories, 10 templates, 3 coming-soon.

import type { IconName, TriggerSpec } from '../types';

/** A browse category for the template picker. */
export interface TemplateCategory {
  /** Stable id used as the URL `tpl` category param. */
  id: string;
  /** Chinese tab label. */
  label: string;
  /** Icon from the shared icon set. */
  icon: IconName;
}

/**
 * One template in the catalog. The `triggerSpec` is the exact payload the cron
 * engine evaluates — no LLM involved after the user clicks "create".
 *
 * Parameterizable templates carry a `params` array that drives the mini-form
 * shown before creation. The picker substitutes user-entered values into
 * the triggerSpec before POSTing.
 */
export interface TaskTemplate {
  /** Stable id — also used as the React key and the task id prefix. */
  id: string;
  /** Owning category id. */
  categoryId: string;
  /** Short Chinese title shown on the card. */
  title: string;
  /** One-line Chinese description. */
  description: string;
  /** Topic passed to POST /api/tasks (topicId). */
  topic: string;
  /** Icon from the shared icon set. */
  icon: IconName;
  /** Accent color for the task dot / icon. */
  iconColor: string;
  /**
   * Whether the template is disabled because its data source is not yet live.
   * Disabled templates are rendered with a "即将上线" badge and cannot be clicked.
   */
  comingSoon?: boolean;
  /** Optional badge label (e.g. "热门"). Only shown when comingSoon is false/absent. */
  badge?: string;
  /**
   * Fillable parameters the picker renders as inline inputs before creation.
   * The substitution is done client-side: a `{{key}}` token in
   * triggerSpec's messageTemplate / label / threshold is replaced with the
   * user's value. If empty/absent the template is one-click with no form.
   */
  params?: TemplateParam[];
  /**
   * The declarative trigger spec. May contain `{{key}}` placeholders that get
   * substituted from `params` values before the task is created.
   * For `schedule` kind the `message` field is rendered into the feed.
   * For `condition` kind `messageTemplate` is rendered with {{value}} / {{threshold}}.
   */
  triggerSpec: TriggerSpec;
  /** Human-readable trigger description shown on the card (e.g. "每天 09:00 UTC"). */
  triggerLabel: string;
}

/** One fillable field in the mini-form. */
export interface TemplateParam {
  /** Placeholder key in triggerSpec strings. */
  key: string;
  /** Chinese field label. */
  label: string;
  /** Input type hint. */
  type: 'number' | 'text' | 'time';
  /** Default value (pre-filled). */
  default: string;
  /** Optional Chinese hint shown below the input. */
  hint?: string;
}

/** Browse categories for the template picker, in display order. */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'monitor',  label: '价格监控', icon: 'trend'    },
  { id: 'news',     label: '资讯推送', icon: 'news'     },
  { id: 'schedule', label: '定时提醒', icon: 'calendar' },
];

/** Full template catalog. */
export const TASK_TEMPLATES: TaskTemplate[] = [
  // ─── 价格监控 ────────────────────────────────────────────────────────────────

  {
    id: 'tpl_gold_above',
    categoryId: 'monitor',
    title: '黄金价格超过阈值提醒',
    description: '当黄金现货价超过你设定的价格时立即通知',
    topic: 'gold',
    icon: 'coins',
    iconColor: '#d4a64a',
    badge: '热门',
    params: [
      {
        key: 'threshold',
        label: '触发价格（USD/oz）',
        type: 'number',
        default: '3200',
        hint: '黄金价格高于此值时触发',
      },
    ],
    triggerSpec: {
      kind: 'condition',
      sourceId: 'gold',
      metric: 'items[0].xauUsdPerOz',
      op: 'gt',
      threshold: 3200,          // substituted from {{threshold}}
      cooldownSeconds: 3600,
      messageTemplate: '黄金现货价已涨到 ${{value}}，高于你的提醒价 ${{threshold}}。',
    },
    triggerLabel: '黄金现货价 > ${{threshold}}',
  },

  {
    id: 'tpl_gold_below',
    categoryId: 'monitor',
    title: '黄金价格跌破阈值提醒',
    description: '当黄金现货价跌破你设定的价格时立即通知',
    topic: 'gold',
    icon: 'trendDown',
    iconColor: '#d4a64a',
    params: [
      {
        key: 'threshold',
        label: '触发价格（USD/oz）',
        type: 'number',
        default: '3000',
        hint: '黄金价格低于此值时触发',
      },
    ],
    triggerSpec: {
      kind: 'condition',
      sourceId: 'gold',
      metric: 'items[0].xauUsdPerOz',
      op: 'lt',
      threshold: 3000,
      cooldownSeconds: 3600,
      messageTemplate: '黄金现货价已跌至 ${{value}}，低于你的提醒价 ${{threshold}}。',
    },
    triggerLabel: '黄金现货价 < ${{threshold}}',
  },

  {
    id: 'tpl_gold_change',
    categoryId: 'monitor',
    title: '黄金价格任何变动',
    description: '每当黄金价格数据更新时推送最新报价',
    topic: 'gold',
    icon: 'bars',
    iconColor: '#d4a64a',
    triggerSpec: {
      kind: 'condition',
      sourceId: 'gold',
      metric: 'items[0].xauUsdPerOz',
      op: 'changed',
      cooldownSeconds: 7200,
      messageTemplate: '黄金现货价更新：${{value}} USD/oz。',
    },
    triggerLabel: '黄金价格每次变化（最多每 2 小时一次）',
  },

  {
    id: 'tpl_keyword_watch',
    categoryId: 'monitor',
    title: '关键词网络监控',
    description: '当关键词出现在最新搜索结果时通知你',
    topic: 'tech',
    icon: 'search',
    iconColor: '#6366f1',
    params: [
      {
        key: 'keyword',
        label: '监控关键词',
        type: 'text',
        default: 'NanoBee',
        hint: '出现在新闻或网页搜索结果时触发',
      },
    ],
    triggerSpec: {
      kind: 'condition',
      sourceId: 'websearch',
      metric: '__count__',
      op: 'gt',
      threshold: 0,
      cooldownSeconds: 21600,
      messageTemplate: '关键词"{{keyword}}"在最新搜索结果中有 {{value}} 条相关内容。',
      params: { query: '{{keyword}}' },
    },
    triggerLabel: '「{{keyword}}」出现在搜索结果（最多每 6 小时一次）',
  },

  // ─── 资讯推送 ────────────────────────────────────────────────────────────────

  {
    id: 'tpl_hn_top',
    categoryId: 'news',
    title: 'Hacker News 每日精选',
    description: '每天早上推送 HN 当日热门故事榜单',
    topic: 'news',
    icon: 'news',
    iconColor: '#6366f1',
    badge: '热门',
    params: [
      {
        key: 'hour',
        label: '推送时间（UTC 小时，0–23）',
        type: 'number',
        default: '1',
        hint: '北京时间 = UTC + 8，推送 09:00 北京时间请填 1',
      },
    ],
    triggerSpec: {
      kind: 'schedule',
      hour: 1,
      minute: 0,
      label: '每天 09:00（北京时间）',
      message: '今日 Hacker News 热门故事已更新，点击查看。',
    },
    triggerLabel: '每天 {{hour}}:00 UTC',
  },

  {
    id: 'tpl_hn_spike',
    categoryId: 'news',
    title: 'HN 热度突增提醒',
    description: '当 HN 首页热门故事超过 25 条时通知',
    topic: 'news',
    icon: 'bolt',
    iconColor: '#6366f1',
    triggerSpec: {
      kind: 'condition',
      sourceId: 'hackernews',
      metric: '__count__',
      op: 'gt',
      threshold: 25,
      cooldownSeconds: 10800,
      // Pass limit=30 so the hub returns up to 30 stories; __count__ = items.length.
      // Without this param the hub defaults to limit=10, making __count__ <= 10
      // which means threshold=10 would never be exceeded.
      params: { limit: 30 },
      messageTemplate: 'Hacker News 今日热门故事已有 {{value}} 条，赶快查看。',
    },
    triggerLabel: 'HN 首页故事数 > 25（最多每 3 小时一次）',
  },

  {
    id: 'tpl_websearch_briefing',
    categoryId: 'news',
    title: '关键词每日摘要',
    description: '每天推送某个关键词的最新搜索结果摘要',
    topic: 'news',
    icon: 'globe',
    iconColor: '#2563b3',
    params: [
      {
        key: 'keyword',
        label: '关键词',
        type: 'text',
        default: 'AI 新闻',
        hint: '每天搜索并推送最新结果摘要',
      },
      {
        key: 'hour',
        label: '推送时间（UTC 小时）',
        type: 'number',
        default: '1',
        hint: '北京时间 = UTC + 8',
      },
    ],
    triggerSpec: {
      kind: 'schedule',
      hour: 1,
      minute: 0,
      label: '每天早上',
      message: '「{{keyword}}」每日摘要已就绪，点击查看最新结果。',
    },
    triggerLabel: '每天 {{hour}}:00 UTC（关键词：{{keyword}}）',
  },

  // ─── 定时提醒 ────────────────────────────────────────────────────────────────

  {
    id: 'tpl_daily_briefing',
    categoryId: 'schedule',
    title: '每日晨间简报',
    description: '每天早上固定时间推送一条提醒，开启新的一天',
    topic: 'brief',
    icon: 'bell',
    iconColor: '#1a7f55',
    badge: '热门',
    params: [
      {
        key: 'hour',
        label: '推送时间（UTC 小时，0–23）',
        type: 'number',
        default: '1',
        hint: '北京时间 = UTC + 8，推送 09:00 北京时间请填 1',
      },
    ],
    triggerSpec: {
      kind: 'schedule',
      hour: 1,
      minute: 0,
      label: '每天 {{hour}}:00 UTC',
      message: '早上好！今天也继续加油。',
    },
    triggerLabel: '每天 {{hour}}:00 UTC',
  },

  {
    id: 'tpl_weekly_review',
    categoryId: 'schedule',
    title: '每周复盘提醒',
    // comingSoon: weekly scheduling (weekday field on ScheduleTrigger + engine
    // support) is not yet implemented. The current ScheduleTrigger only has
    // hour+minute, so the engine fires EVERY day — not just Mondays.
    // Mark as coming-soon to avoid misleading users until weekly cadence ships.
    comingSoon: true,
    description: '每周一固定时间推送本周复盘提醒（每周任务即将上线）',
    topic: 'brief',
    icon: 'calendar',
    iconColor: '#1a7f55',
    params: [
      {
        key: 'hour',
        label: '推送时间（UTC 小时）',
        type: 'number',
        default: '2',
        hint: '每周一的这个时间点触发',
      },
    ],
    triggerSpec: {
      kind: 'schedule',
      hour: 2,
      minute: 0,
      label: '每周一 {{hour}}:00 UTC',
      message: '本周复盘时间到！回顾目标，规划下一步。',
    },
    triggerLabel: '每周一 {{hour}}:00 UTC',
  },

  {
    id: 'tpl_custom_reminder',
    categoryId: 'schedule',
    title: '自定义定时提醒',
    description: '设定任意时间，每天固定推送一条提醒消息',
    topic: 'brief',
    icon: 'clock',
    iconColor: '#5a5e6b',
    params: [
      {
        key: 'hour',
        label: '触发时间（UTC 小时，0–23）',
        type: 'number',
        default: '9',
      },
      {
        key: 'minute',
        label: '触发分钟（0–59）',
        type: 'number',
        default: '0',
      },
      {
        key: 'message',
        label: '提醒内容',
        type: 'text',
        default: '该做计划了！',
      },
    ],
    triggerSpec: {
      kind: 'schedule',
      hour: 9,
      minute: 0,
      label: '每天 {{hour}}:{{minute}} UTC',
      message: '{{message}}',
    },
    triggerLabel: '每天 {{hour}}:{{minute}} UTC',
  },
];

/** Templates for one category, in catalog order. */
export function templatesForCategory(categoryId: string): TaskTemplate[] {
  return TASK_TEMPLATES.filter((t) => t.categoryId === categoryId);
}

/**
 * Cross-category featured set: the first non-coming-soon template of each
 * category, so the "全部" tab shows one from each theme.
 */
export function featuredTemplates(): TaskTemplate[] {
  const seen = new Set<string>();
  const out: TaskTemplate[] = [];
  for (const t of TASK_TEMPLATES) {
    if (!seen.has(t.categoryId) && !t.comingSoon) {
      seen.add(t.categoryId);
      out.push(t);
    }
  }
  return out;
}

/**
 * Substitute `{{key}}` placeholders in a string with the provided map.
 * Non-matching placeholders are left intact.
 */
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
}

/**
 * Apply param values to a triggerSpec, returning a new spec with all
 * `{{key}}` placeholders substituted. Numeric fields (hour, minute, threshold)
 * are coerced from the string values.
 */
export function applyParams(
  spec: TriggerSpec,
  values: Record<string, string>,
): TriggerSpec {
  if (spec.kind === 'schedule') {
    return {
      ...spec,
      hour:    values.hour    !== undefined ? Number(values.hour)   : spec.hour,
      minute:  values.minute  !== undefined ? Number(values.minute) : spec.minute,
      label:   interpolate(spec.label, values),
      message: spec.message !== undefined ? interpolate(spec.message, values) : spec.message,
    };
  }
  // condition
  return {
    ...spec,
    threshold:       values.threshold !== undefined ? Number(values.threshold) : spec.threshold,
    messageTemplate: interpolate(spec.messageTemplate, values),
    params: spec.params
      ? Object.fromEntries(
          Object.entries(spec.params).map(([k, v]) => [
            k,
            typeof v === 'string' ? interpolate(v, values) : v,
          ]),
        )
      : spec.params,
  };
}

/**
 * Build the human-readable trigger label for a task created from a template,
 * with param placeholders substituted.
 */
export function buildTriggerLabel(template: TaskTemplate, values: Record<string, string>): string {
  return interpolate(template.triggerLabel, values);
}
