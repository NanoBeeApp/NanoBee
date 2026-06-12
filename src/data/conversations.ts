// Scripted demo conversations keyed by chat id (pure data, no JSX).
// Messages are plain text only — no status pills, task cards, citations
// or reply-suggestion chips.
import type { ChatMessage } from '../types';

/** Omit that distributes over union members (plain Omit collapses unions). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

// Seed message ids must be deterministic: they are persisted to D1 and this
// module also loads in the Worker, where random values are forbidden in
// global scope. A counter keeps them stable across isolates and reloads.
let seedSeq = 0;

/** Assign deterministic ids to message descriptors lacking one. */
function wid(arr: Array<DistributiveOmit<ChatMessage, 'id'> & { id?: string }>): ChatMessage[] {
  return arr.map((m) => ({ id: m.id ?? `m_seed_${++seedSeq}`, ...m }) as ChatMessage);
}

export const CONVERSATIONS: Record<string, ChatMessage[]> = {
  c_gold_today: wid([
    {
      role: 'proactive', icon: 'trend', title: '金价大幅上涨 +2.8%', time: '今天 09:14',
      paras: [
        ['你昨天提到在关注黄金。今天现货黄金大涨 ', { num: '+2.8%' }, '，突破 ', { num: '$2,412/oz' }, '，是近三周以来最大单日涨幅。'],
      ],
    },
    { role: 'user', text: '为什么涨这么多？以后这种大变化，重要的就主动告诉我。' },
    {
      role: 'ai',
      paras: [
        ['今天金价大涨，主要是三个因素同时发生：'],
        [{ b: '1. 避险情绪升温' }, ' — 地缘风险推动资金流入黄金等避险资产。'],
        [{ b: '2. 美元走弱' }, ' — 美元指数 DXY 跌至 ', { num: '103.2' }, '，以美元计价的黄金因此变贵。'],
        [{ b: '3. 降息预期升温' }, ' — 市场上调 9 月降息概率，美债实际收益率回落，利好不生息的黄金。'],
        ['好的，以后这类大变化我会主动推给你。'],
      ],
    },
  ]),

  c_gold_setup: wid([
    { role: 'user', text: '帮我盯着黄金价格。' },
    {
      role: 'ai',
      paras: [
        ['没问题。我可以帮你 ', { b: '实时盯盘' }, '，只在重要的时候打扰你——大涨大跌、趋势反转、或到了你设的价位。'],
        ['你想怎么被通知？'],
      ],
    },
  ]),

  c_edu_test: wid([
    {
      role: 'proactive', icon: 'book', title: '明天有数学单元测', time: '今天 07:30',
      paras: [['从班级群和校历里发现：', { b: '明天上午第二节' }, ' 有数学单元测，范围第三章「分数」。我整理了 5 道孩子最近常错的题型。']],
    },
    { role: 'user', text: '帮我整理这 5 道题，今晚 8 点提醒我陪她复习。' },
    {
      role: 'ai',
      paras: [['好的，5 道易错题（含解析）已经准备好，并设置了今晚 ', { num: '20:00' }, ' 的复习提醒。']],
    },
  ]),

  c_brief: wid([
    { role: 'user', text: '每天早上给我一份早报。' },
    {
      role: 'ai',
      paras: [['好的，我会每天早上 ', { num: '07:30' }, ' 给你一份早报：你关心的科技、地产，以及与持仓相关的要闻，控制在 90 秒读完。']],
    },
  ]),

  c_edu_plan: wid([
    { role: 'user', text: '帮我做个暑假学习计划。' },
    {
      role: 'ai',
      paras: [['我按 ', { b: '8 周' }, ' 给你排了一版：上午学科巩固、下午兴趣+阅读、每周留半天机动。已保存，可以随时让我调整。']],
    },
  ]),

  c_health: wid([
    { role: 'user', text: '提醒我别老坐着。' },
    {
      role: 'ai',
      paras: [['好的，工作日里如果你连续静止超过 90 分钟，我会轻轻提醒你起来活动一下。这条提醒目前是 ', { b: '暂停' }, ' 状态，你可以在右侧任务面板里随时打开。']],
    },
  ]),

  c_gold_tax: wid([
    { role: 'user', text: '黄金交易要交税吗？' },
    {
      role: 'ai',
      paras: [
        ['这要看你买的形式和所在地。实物金条、纸黄金、黄金 ETF、积存金的税务处理各不相同。简单说：个人长期持有实物黄金通常在卖出时才可能涉及，频繁交易的收益更可能被视作应税所得。'],
        ['要不要我根据你的实际情况，整理一份更具体的说明？'],
      ],
    },
  ]),
};
