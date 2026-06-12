// Empty / new-chat state: brand glyph, value proposition and starter cards
// that nudge the user toward "ask me to watch something for you".
import { Icon, Icons } from '../../icons/icons';

const STARTERS = [
  { ic: 'coins', color: '#d4a64a', t: '帮我盯着金价', d: '大涨大跌或趋势反转时主动通知我' },
  { ic: 'book', color: '#635bff', t: '关注孩子的学习', d: '作业、考试、重要通知自动提醒' },
  { ic: 'news', color: '#ff6a3d', t: '每天来一份早报', d: '每天早上 7:30 推送你关心的要闻' },
  { ic: 'heart', color: '#1a7f55', t: '提醒我照顾身体', d: '久坐、喝水、运动目标的贴心提醒' },
] as const;

interface EmptyStateProps {
  onSend: (text: string) => void;
}

export function EmptyState({ onSend }: EmptyStateProps) {
  return (
    <div className="nb-empty" data-testid="new-chat-empty-state">
      <div className="glyph-big"><Icons.bee size={32} sw={1.5} style={{ color: '#fff' }} /></div>
      <h1>今天想让我帮你盯着什么？</h1>
      <p>告诉我你关心的事，我会在重要的时候<strong style={{ color: 'var(--nb-amber-ink)' }}> 主动找你</strong>——不用你天天来问。</p>
      <div className="nb-starter-grid">
        {STARTERS.map((s, i) => (
          <button className="nb-starter" key={i} onClick={() => onSend(s.t)} data-testid={`starter-${s.ic}`}>
            <span className="si" style={{ background: s.color }}><Icon name={s.ic} size={17} /></span>
            <span><span className="st">{s.t}</span><span className="sd">{s.d}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}
