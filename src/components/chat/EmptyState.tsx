// Empty / new-chat state: brand glyph and value proposition that nudge the
// user toward "ask me to watch something for you".
import { Icons } from '../../icons/icons';

export function EmptyState() {
  return (
    <div className="nb-empty" data-testid="new-chat-empty-state">
      <div className="glyph-big"><Icons.bee size={32} sw={1.5} style={{ color: '#fff' }} /></div>
      <h1>今天想让我帮你盯着什么？</h1>
      <p>告诉我你关心的事，重要的时候我会<strong style={{ color: 'var(--nb-amber-ink)' }}>主动找你</strong>。</p>
    </div>
  );
}
