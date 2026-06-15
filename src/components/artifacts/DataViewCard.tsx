// One item rendered as a card in a data view's card pane. P1 uses a single
// built-in template that adapts to whichever fields the item actually has
// (title always; then optional author, summary, and a metric row of
// points/comments/time) — the field-driven rendering the feature is about.
// AI-generated per-shape templates arrive in P3; this is the safe default the
// renderer always falls back to.
import type { DataViewItem } from '../../artifacts/types';
import { Icons } from '../../icons/icons';

interface Props {
  item: DataViewItem;
}

/** Relative-time-ish label from an ISO/string timestamp; best-effort. */
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

export function DataViewCard({ item }: Props) {
  const time = timeLabel(item.itemCreatedAt);
  const hasMetrics = item.points != null || item.comments != null || time != null;

  return (
    <div className="nb-dv-card" data-testid={`data-view-card-${item.id}`}>
      <div className="nb-dv-card-body">
        {item.author && (
          <div className="nb-dv-card-author">
            <span className="nb-dv-avatar">{item.author.slice(0, 2).toUpperCase()}</span>
            <span className="nb-dv-card-author-name">{item.author}</span>
          </div>
        )}
        {item.url ? (
          <a className="nb-dv-card-title" href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        ) : (
          <div className="nb-dv-card-title nb-dv-card-title-plain">{item.title}</div>
        )}
        {item.summary && <p className="nb-dv-card-summary">{item.summary}</p>}
      </div>

      {(hasMetrics || item.url) && (
        <div className="nb-dv-card-foot">
          {hasMetrics && (
            <div className="nb-dv-metrics">
              {item.points != null && (
                <span className="nb-dv-metric"><Icons.trend size={12} /> {item.points}</span>
              )}
              {item.comments != null && (
                <span className="nb-dv-metric"><Icons.chat size={12} /> {item.comments}</span>
              )}
              {time && <span className="nb-dv-metric"><Icons.clock size={12} /> {time}</span>}
            </div>
          )}
          {item.url && (
            <a className="nb-dv-card-link" href={item.url} target="_blank" rel="noreferrer">
              阅读原文 <Icons.arrowRight size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
