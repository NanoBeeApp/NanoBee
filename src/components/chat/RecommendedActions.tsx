// "Suggested actions" list card inside an AI reply.
import type { RecActionItem } from '../../types';

interface RecommendedActionsProps {
  items: RecActionItem[];
}

const TONE_CLASS: Record<RecActionItem['tone'], string> = {
  ok: 'badge-success', info: 'badge-info', warn: 'badge-warning',
};
const TONE_MARK: Record<RecActionItem['tone'], string> = {
  ok: '✓', info: 'i', warn: '!',
};

export function RecommendedActions({ items }: RecommendedActionsProps) {
  return (
    <div className="nb-ai-card" data-testid="recommended-actions-card">
      <div className="head">
        <div>
          <div className="t">建议的操作</div>
          <div className="s">根据你的关注与当前行情生成</div>
        </div>
        <span className="badge badge-accent">{items.length} 项</span>
      </div>
      <div className="col" style={{ gap: 8 }}>
        {items.map((it, i) => (
          <div className="row" key={i} style={{ padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 9, gap: 11 }}>
            <span className={`badge ${TONE_CLASS[it.tone]}`} style={{ fontSize: 10, width: 18, justifyContent: 'center' }}>{TONE_MARK[it.tone]}</span>
            <div style={{ flex: 1, fontSize: 13 }}>{it.label}</div>
            <button className="btn btn-secondary btn-sm">{it.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
