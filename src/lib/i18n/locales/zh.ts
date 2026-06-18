// Chinese (Simplified) locale — default locale for NanoBee.
// All user-facing strings that have been migrated to i18n live here.
// Keys are grouped by surface; add new groups as more surfaces migrate.

export const zh = {
  // ── App shell / Sidebar navigation ──────────────────────────────────────
  nav: {
    apps: 'Apps',
    chat: '聊天',
    today: '今日事项',
    tasks: '任务',
    artifacts: 'Artifacts',
    research: '研究画布',
    settings: '设置',
    collapseSidebar: '收起边栏',
    chatHistory: '聊天记录',
    topicGroups: '话题分组',
  },

  // ── Sidebar new-action button ────────────────────────────────────────────
  newAction: {
    chat: '新建对话',
    task: '新建任务',
    artifact: '新建 Artifact',
    research: '新建研究',
  },

  // ── Brand tagline ────────────────────────────────────────────────────────
  brand: {
    tagline: '主动找你的 AI 助理',
  },

  // ── Chat empty state ─────────────────────────────────────────────────────
  emptyState: {
    heading: '聊点什么有趣的话题？',
    sub: '或者让 NanoBee 帮你盯一件事，有动态了主动通知你',
    starters: {
      gold: '盯黄金价格',
      hn: 'HN 每日热榜',
      keyword: '关键词监控',
      reminder: '每日提醒',
    },
  },

  // ── Settings page ────────────────────────────────────────────────────────
  settings: {
    pageTitle: '设置',
    pageSubtitle: '配置 AI 模型与联网搜索供应商 · 修改自动保存',
    loading: '正在加载设置…',
    signedOut: '登录后即可配置专属的 AI 模型与联网搜索供应商。',
    loginButton: '登录 / 注册',
    // Language switcher (new section)
    language: {
      sectionLabel: '语言 / Language',
      zh: '中文',
      en: 'English',
    },
  },
} as const;

export type ZhDict = typeof zh;
