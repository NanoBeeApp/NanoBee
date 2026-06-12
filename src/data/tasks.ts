// Initial demo tasks shown in the right rail and the sidebar topic view.
import type { Task } from '../types';

export const INITIAL_TASKS: Task[] = [
  {
    id: 't_gold_alert', topicId: 'gold', title: '金价异动提醒', iconColor: '#d4a64a',
    triggerType: 'condition', trigger: '日内涨跌超 ±1.5% 或趋势反转',
    status: 'active', last: '今天 09:14', next: '实时监控中',
    result: '现货黄金 $2,412/oz，较昨日 +2.8%，触发上涨提醒。', resultTone: 'up',
  },
  {
    id: 't_gold_brief', topicId: 'gold', title: '每日金价早报', iconColor: '#d4a64a',
    triggerType: 'schedule', trigger: '每天 08:00',
    status: 'active', last: '今天 08:00', next: '明天 08:00',
    result: '已推送：金价、美元指数、美债收益率与隔夜要闻摘要。', resultTone: 'info',
  },
  {
    id: 't_edu_hw', topicId: 'edu', title: '作业 & 考试提醒', iconColor: '#635bff',
    triggerType: 'schedule', trigger: '工作日 18:30',
    status: 'active', last: '昨天 18:30', next: '今天 18:30',
    result: '明天数学单元测；语文作文初稿待批改。', resultTone: 'info',
  },
  {
    id: 't_brief', topicId: 'brief', title: '每日新闻早报', iconColor: '#ff6a3d',
    triggerType: 'schedule', trigger: '每天 07:30',
    status: 'active', last: '今天 07:30', next: '明天 07:30',
    result: '5 条要闻已整理，2 条与你关注的科技、地产相关。', resultTone: 'info',
  },
  {
    id: 't_health', topicId: 'health', title: '久坐提醒', iconColor: '#1a7f55',
    triggerType: 'condition', trigger: '连续静止 > 90 分钟（工作日）',
    status: 'paused', last: '前天 15:20', next: '已暂停',
    result: '上次：连续坐 1h52m，建议起身活动。', resultTone: 'info',
  },
];
