// The list view of a data view's item stream: a flat, feed-style list (no card
// boxes) — title + optional summary + a meta line, separated by hairlines. The
// same items the card pane renders, just compact. Pure render.
import type { DataViewItem } from '../../artifacts/types';
import { sourceLabel } from '../../artifacts/format';
import { Icons } from '../../icons/icons';

interface Props {
  items: DataViewItem[];
}

function timeLabel(ts?: string): string | null {
  if (!ts) return null;
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  return `${Math.round(hrs / 24)} 天前`;
}

export function DataViewListPane({ items }: Props) {
  return (
    <div className="nb-dv-list" data-testid="data-view-list">
      {items.map((item) => {
        const time = timeLabel(item.itemCreatedAt);
        return (
          <div className="nb-dv-row" key={item.id} data-testid={`data-view-item-${item.id}`}>
            {item.url ? (
              <a className="nb-dv-row-title" href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            ) : (
              <span className="nb-dv-row-title nb-dv-card-title-plain">{item.title}</span>
            )}
            {item.summary && <p className="nb-dv-row-summary">{item.summary}</p>}
            <div className="nb-dv-row-meta">
              <span className="nb-dv-source-badge">{sourceLabel(item.source)}</span>
              {item.author && <><span className="nb-dv-dot">·</span><span>{item.author}</span></>}
              {item.points != null && (
                <><span className="nb-dv-dot">·</span><span><Icons.trend size={11} /> {item.points}</span></>
              )}
              {item.comments != null && (
                <><span className="nb-dv-dot">·</span><span><Icons.chat size={11} /> {item.comments}</span></>
              )}
              {time && <><span className="nb-dv-dot">·</span><span>{time}</span></>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
