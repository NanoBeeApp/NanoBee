// Expanded body of a Today item: paragraphs, bullet lists, source line and
// the "open chat" action row. Shared by list and card views.
import type { UpdateItem } from '../../types';
import { topicById, topicShortName } from '../../data/topics';
import { Icons } from '../../icons/icons';

export interface ReadItemActions {
  onOpenChat: (item: UpdateItem) => void;
}

interface ReadBodyProps extends ReadItemActions {
  item: UpdateItem;
}

export function ReadBody({ item, onOpenChat }: ReadBodyProps) {
  const t = topicById(item.topicId);
  return (
    <div className="nb-read-body">
      {item.body.map((seg, i) => {
        if (typeof seg === 'string') return <p key={i}>{seg}</p>;
        return <ul key={i}>{seg.list.map((li, j) => <li key={j}>{li}</li>)}</ul>;
      })}
      {item.source && <div className="src-line">来源 · {item.source}</div>}
      <div className="nb-read-actions">
        <button className="btn btn-secondary btn-sm" style={{ gap: 6 }}
          onClick={(e) => { e.stopPropagation(); onOpenChat(item); }}
          data-testid={`open-chat-from-item-${item.id}`}>
          <Icons.chat size={13} /> 打开对话
        </button>
        {t && (
          <span style={{ marginLeft: 'auto' }}>
            <span className="badge" style={{ background: t.soft, color: t.color, border: 'none' }}>{topicShortName(t)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
