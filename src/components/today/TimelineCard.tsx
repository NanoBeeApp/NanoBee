// Tweet-style timeline row (the Today page's default view): avatar, header
// row, full body text, optional trend sparkline and a light action row.
// Rendered as a flat list separated only by hairline dividers (no card box,
// border, shadow or filled background) so nothing competes for attention.
import type { UpdateItem } from '../../types';
import { Icon, Icons } from '../../icons/icons';
import { Sparkline } from '../chat/Sparkline';
import type { ReadItemActions } from './ReadBody';

interface TimelineCardProps extends ReadItemActions {
  item: UpdateItem;
}

export function TimelineCard({ item, onOpenChat, onToggleRead }: TimelineCardProps) {
  return (
    <div className={`nb-tl-card${item.unread ? ' unread' : ' read'}`}
      data-rid={item.unread ? item.id : undefined} data-cid={item.id}
      data-testid={`timeline-item-${item.id}`}>
      <div className="tl-av" style={{ background: item.color }}><Icon name={item.icon} size={18} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tl-head">
          <b>NanoBee</b>
          <span className="htime">{item.time}</span>
          {item.unread && <span className="tl-dot" />}
        </div>
        <div className="tl-title">{item.title}</div>
        <div className="tl-body">
          {item.body.map((seg, i) => {
            if (typeof seg === 'string') return <p key={i}>{seg}</p>;
            return <ul key={i}>{seg.list.map((li, j) => <li key={j}>{li}</li>)}</ul>;
          })}
        </div>
        {(item.tone === 'up' || item.tone === 'down') && (
          <div className="tl-spark">
            <Sparkline up={item.tone === 'up'} color={item.tone === 'up' ? 'var(--success)' : 'var(--danger)'} height={40} vbHeight={46} />
          </div>
        )}
        {item.source && <div className="src-line" style={{ marginTop: 8 }}>来源 · {item.source}</div>}
        <div className="tl-actions">
          <button onClick={() => onOpenChat(item)} aria-label="打开对话" title="打开对话" data-testid={`timeline-open-chat-${item.id}`}>
            <Icons.chat size={15} />
          </button>
          <button onClick={() => onToggleRead(item.id, item.unread)} aria-label={item.unread ? '标为已读' : '标为未读'} title={item.unread ? '标为已读' : '标为未读'} data-testid={`timeline-toggle-read-${item.id}`}>
            <Icons.check size={15} />
          </button>
          <button aria-label="稍后" title="稍后" data-testid={`timeline-save-later-${item.id}`}>
            <Icons.bookmark size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
