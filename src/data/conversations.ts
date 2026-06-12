// Scripted demo conversations keyed by chat id (pure data, no JSX).
import type { ChatMessage } from '../types';
import { nextId } from './ids';

/** Omit that distributes over union members (plain Omit collapses unions). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Assign ids to message descriptors lacking one. */
function wid(arr: Array<DistributiveOmit<ChatMessage, 'id'> & { id?: string }>): ChatMessage[] {
  return arr.map((m) => ({ id: m.id ?? nextId(), ...m }) as ChatMessage);
}

export const CONVERSATIONS: Record<string, ChatMessage[]> = {
  c_gold_today: wid([
    {
      role: 'proactive', icon: 'trend', title: '金价大幅上涨 +2.8%', time: '今天 09:14',
      paras: [
        ['你昨天提到在关注黄金。今天现货黄金大涨 ', { num: '+2.8%' }, '，突破 ', { num: '$2,412/oz' }, '，是近三周以来最大单日涨幅。'],
      ],
      extras: [{ kind: 'price', data: { label: '现货黄金 · XAU/USD', value: '$2,412.50', delta: '+2.8%', dir: 'up', sub: '较昨收 +$65.80', tag: '今日 +2.8%' } }],
      suggest: ['为什么涨这么多？', '帮我盯住 $2,450 关口', '现在适合卖吗？'],
    },
    { role: 'user', text: '为什么涨这么多？以后这种大变化，重要的就主动告诉我。' },
    {
      role: 'ai', thinking: '分析了 3 个数据源 · 1.8s · 比较了近 4 周走势',
      paras: [
        ['今天金价大涨，主要是三个因素同时发生：'],
        [{ b: '1. 避险情绪升温' }, ' — 地缘风险推动资金流入黄金等避险资产。', { cite: 1 }],
        [{ b: '2. 美元走弱' }, ' — 美元指数 DXY 跌至 ', { num: '103.2' }, '，以美元计价的黄金因此变贵。', { cite: 2 }],
        [{ b: '3. 降息预期升温' }, ' — 市场上调 9 月降息概率，美债实际收益率回落，利好不生息的黄金。', { cite: 3 }],
        ['好的，以后这类大变化我会主动推给你。建议这样设置——你确认一下：'],
      ],
      extras: [{
        kind: 'task', data: {
          id: 't_gold_alert_new', topicId: 'gold', title: '黄金 · 异动提醒 + 每日早报',
          desc: '日内涨跌超过 ±1.5% 或趋势反转时立刻通知你；并在每天早上 8:00 发一份金价早报。',
          config: [{ icon: 'bolt', label: '涨跌 ±1.5%' }, { icon: 'bolt', label: '趋势反转' }, { icon: 'clock', label: '每天 08:00 早报' }],
          iconColor: '#d4a64a', trigger: '涨跌 ±1.5% / 趋势反转 · 每天 08:00', triggerType: 'condition',
          last: '刚刚创建', next: '实时监控中', result: '已开始监控金价。', resultTone: 'up',
        },
      }],
      citations: ['世界黄金协会 · 资金流向', '美元指数 DXY · 今日', '美债 10Y 实际收益率'],
      suggest: ['到 $2,450 再提醒我', '改成涨跌 2% 才通知', '顺便也盯着白银'],
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
      extras: [{
        kind: 'task', data: {
          id: 't_gold_alert_new', topicId: 'gold', title: '黄金 · 异动提醒',
          desc: '日内涨跌超 ±1.5% 或趋势反转时通知你。',
          config: [{ icon: 'bolt', label: '涨跌 ±1.5%' }, { icon: 'bolt', label: '趋势反转' }],
          iconColor: '#d4a64a', trigger: '涨跌 ±1.5% / 趋势反转', triggerType: 'condition',
          last: '刚刚创建', next: '实时监控中', result: '已开始监控。', resultTone: 'up',
        },
      }],
      suggest: ['每天也发份早报', '到 $2,450 提醒我', '只在大跌时通知'],
    },
  ]),

  c_edu_test: wid([
    {
      role: 'proactive', icon: 'book', title: '明天有数学单元测', time: '今天 07:30',
      paras: [['从班级群和校历里发现：', { b: '明天上午第二节' }, ' 有数学单元测，范围第三章「分数」。我整理了 5 道孩子最近常错的题型。']],
      suggest: ['看看这 5 道题', '今晚 8 点提醒我陪她复习', '以后这类通知都要'],
    },
    { role: 'user', text: '帮我整理这 5 道题，今晚 8 点提醒我陪她复习。' },
    {
      role: 'ai',
      paras: [['好的，5 道易错题（含解析）已经准备好，并设置了今晚 ', { num: '20:00' }, ' 的复习提醒。']],
      extras: [{
        kind: 'task', data: {
          id: 't_edu_review', topicId: 'edu', title: '今晚陪孩子复习数学',
          desc: '今晚 20:00 提醒，附带 5 道第三章易错题。',
          config: [{ icon: 'clock', label: '今天 20:00' }],
          iconColor: '#635bff', trigger: '今天 20:00', triggerType: 'schedule',
          last: '刚刚创建', next: '今天 20:00', result: '提醒已设置。', resultTone: 'info',
        },
      }],
    },
  ]),

  c_brief: wid([
    { role: 'user', text: '每天早上给我一份早报。' },
    {
      role: 'ai',
      paras: [['好的，我会每天早上 ', { num: '07:30' }, ' 给你一份早报：你关心的科技、地产，以及与持仓相关的要闻，控制在 90 秒读完。']],
      extras: [{
        kind: 'task', data: {
          id: 't_brief_new', topicId: 'brief', title: '每日新闻早报',
          desc: '每天 07:30 推送，90 秒速读。',
          config: [{ icon: 'clock', label: '每天 07:30' }],
          iconColor: '#ff6a3d', trigger: '每天 07:30', triggerType: 'schedule',
          last: '今天 07:30', next: '明天 07:30', result: '已推送 5 条要闻。', resultTone: 'info',
        },
      }],
      suggest: ['加上财经板块', '改到 08:00', '周末不用发'],
    },
  ]),

  c_edu_plan: wid([
    { role: 'user', text: '帮我做个暑假学习计划。' },
    {
      role: 'ai',
      paras: [['我按 ', { b: '8 周' }, ' 给你排了一版：上午学科巩固、下午兴趣+阅读、每周留半天机动。已保存，可以随时让我调整。']],
      suggest: ['每周给我一次进度', '增加英语口语', '导出成日历'],
    },
  ]),

  c_health: wid([
    { role: 'user', text: '提醒我别老坐着。' },
    {
      role: 'ai',
      paras: [['好的，工作日里如果你连续静止超过 90 分钟，我会轻轻提醒你起来活动一下。这条提醒目前是 ', { b: '暂停' }, ' 状态，你可以在右侧任务面板里随时打开。']],
      suggest: ['现在就打开', '改成 60 分钟', '周末也提醒'],
    },
  ]),

  c_gold_tax: wid([
    { role: 'user', text: '黄金交易要交税吗？' },
    {
      role: 'ai',
      paras: [
        ['这要看你买的形式和所在地。实物金条、纸黄金、黄金 ETF、积存金的税务处理各不相同。', { cite: 1 }, ' 简单说：个人长期持有实物黄金通常在卖出时才可能涉及，频繁交易的收益更可能被视作应税所得。'],
        ['要不要我根据你的实际情况，整理一份更具体的说明？'],
      ],
      citations: ['公开税务指引（仅供参考，非税务建议）'],
    },
  ]),
};
