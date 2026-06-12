// Sidebar chat history (flat, ChatGPT-style) for the demo.
import type { ChatMeta } from '../types';

export const CHATS: ChatMeta[] = [
  { id: 'c_gold_today', topicId: 'gold', title: '为什么黄金今天大涨？', sub: '4 次工具调用 · 已引用 3 个来源', group: '今天', pinned: true },
  { id: 'c_gold_setup', topicId: 'gold', title: '帮我盯着黄金价格', sub: '已创建 2 个任务', group: '今天' },
  { id: 'c_edu_test', topicId: 'edu', title: '孩子明天数学考试', sub: '生成了 5 道易错题', group: '今天' },
  { id: 'c_brief', topicId: 'brief', title: '每天早上给我一份早报', sub: '每天 07:30 推送', group: '昨天' },
  { id: 'c_edu_plan', topicId: 'edu', title: '暑假学习计划', sub: '8 周计划 · 已保存', group: '昨天' },
  { id: 'c_health', topicId: 'health', title: '提醒我多走动', sub: '久坐提醒（已暂停）', group: '近 7 天' },
  { id: 'c_gold_tax', topicId: 'gold', title: '黄金交易要交税吗？', sub: '已解答', group: '近 7 天' },
];

export const CHAT_HISTORY_GROUPS = ['今天', '昨天', '近 7 天'];
