// Initial proactive updates — the reading items on the Today page,
// also surfaced in the bell dropdown.
import type { UpdateItem } from '../types';

export const INITIAL_UPDATES: UpdateItem[] = [
  {
    id: 'u1', topicId: 'gold', icon: 'trend', color: '#1a7f55', tone: 'up',
    title: '金价大幅上涨 +2.8%', time: '今天 09:14', group: '今天',
    summary: '现货黄金突破 $2,412/oz，单日涨幅 2.8%，是近三周最大涨幅。主因避险情绪升温与美元走弱。',
    body: [
      '现货黄金今早突破 $2,412/oz，较昨收上涨 $65.80（+2.8%），创近三周最大单日涨幅。',
      { list: ['避险情绪升温 — 地缘风险推动资金流入黄金', '美元走弱 — 美元指数 DXY 跌至 103.2', '降息预期升温 — 美债实际收益率回落'] },
      '你的「金价异动提醒」任务已触发本次通知。',
    ],
    source: '世界黄金协会 · DXY · 美债 10Y',
  },
  {
    id: 'u2', topicId: 'gold', icon: 'spark', color: '#d4a64a', tone: 'info',
    title: '黄金趋势可能反转', time: '今天 09:15', group: '今天',
    summary: '过去 5 个交易日下跌趋势被打破，短期动能转为上行。要不要我帮你盯住 $2,450 这个关口？',
    body: [
      '过去 5 个交易日的下跌趋势在今天被有效打破：价格站上 5 日与 10 日均线，短期动能转为上行。',
      '如果你打算逢高减仓，$2,450 是上方最近的密集成交区。要不要我帮你盯住这个关口，到了就提醒你？',
    ],
    source: '基于你的「金价异动提醒」任务',
  },
  {
    id: 'u7', topicId: 'edu', icon: 'clock', color: '#635bff', tone: 'info',
    title: '待办 · 今晚 20:00 陪孩子复习数学', time: '今天 20:00', group: '今天',
    summary: '你设置的复习提醒：明天数学单元测，5 道第三章易错题已备好。',
    body: [
      '这是你昨天在对话里设置的提醒：今晚 20:00 陪孩子复习数学，重点是第三章「分数」。',
      '5 道易错题（含解析）已经准备好，打开对话即可查看。',
    ],
    source: '来自任务「今晚陪孩子复习数学」',
  },
  {
    id: 'u3', topicId: 'edu', icon: 'book', color: '#635bff', tone: 'info',
    title: '明天有数学单元测', time: '今天 07:30', group: '今天',
    summary: '从班级群和校历检测到：明天上午第二节数学单元测，范围是第三章。已为你准备 5 道易错题。',
    body: [
      '从班级群公告和校历里检测到：明天上午第二节是数学单元测，范围为第三章「分数」。',
      '根据孩子最近的练习记录，我整理了 5 道最常出错的题型，并附了讲解思路。',
    ],
    source: '班级群 · 校历 · 练习记录',
  },
  {
    id: 'u4', topicId: 'brief', icon: 'news', color: '#ff6a3d', tone: 'info',
    title: '今日早报已就绪', time: '今天 07:30', group: '今天',
    summary: '5 条要闻 · 其中 2 条与你关注的科技、地产相关。点开查看 90 秒速读版。',
    body: [
      { list: ['央行宣布维持利率不变，符合市场预期', '多家车企下调智能驾驶选装价格（科技 · 你在关注）', '一线城市二手房挂牌量环比下降 6%（地产 · 你在关注）', '国际油价小幅回落，布伦特报 $78.4', '今日多云转晴，22–31°C，适合户外'] },
    ],
    source: '每日早报任务 · 07:30 自动生成',
  },
  {
    id: 'u5', topicId: 'gold', icon: 'trendDown', color: '#c4362b', tone: 'down',
    title: '金价回调 -1.6%', time: '昨天 21:40', group: '本周',
    summary: '隔夜美联储官员鹰派发言，金价自高点回落 1.6%。整体仍在上行通道内。',
    body: [
      '隔夜美联储官员发表鹰派言论，金价自日内高点回落 1.6%。回调幅度在正常波动范围内，整体仍处于上行通道。',
    ],
    source: '金价异动提醒 · 自动触发',
  },
  {
    id: 'u6', topicId: 'health', icon: 'heart', color: '#1a7f55', tone: 'info',
    title: '本周步数低于目标', time: '周一 20:00', group: '本周',
    summary: '上周日均 4,210 步，低于你设定的 8,000 步目标。要调整提醒时间或目标吗？',
    body: [
      '上周日均 4,210 步，仅达到目标（8,000 步）的 53%。周三、周四几乎全天静坐。',
      '两个建议：把午饭后的散步提醒提前到 12:40；或先把目标调到 6,000 步，循序渐进。',
    ],
    source: '健康数据 · 每周一汇总',
  },
];

/** Maps a topic to a representative seeded conversation (used by "open chat"). */
export const UPDATE_TO_CHAT: Record<string, string> = {
  gold: 'c_gold_today',
  edu: 'c_edu_test',
  brief: 'c_brief',
  health: 'c_health',
};
