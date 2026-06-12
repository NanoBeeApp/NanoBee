// Today-page sidebar navigation: reading progress card, unread/topic filters
// (with per-topic unread badges) and quick actions (mark all read, back to
// chat). Replaces the chat lists in the sidebar scroll area while reading.
import { useAppStore, selectUnreadCount } from '../../store/useAppStore';
import { TOPICS, topicShortName } from '../../data/topics';
import { Icon, Icons } from '../../icons/icons';

export function TodayNav() {
  const updates = useAppStore((s) => s.updates);
  const todayFilter = useAppStore((s) => s.todayFilter);
  const setTodayFilter = useAppStore((s) => s.setTodayFilter);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const backToChat = useAppStore((s) => s.backToChat);
  const unreadCount = useAppStore(selectUnreadCount);

  const readCount = updates.length - unreadCount;
  const pct = updates.length ? Math.round((readCount / updates.length) * 100) : 100;

  return (
    <div className="nb-tnav" data-testid="today-sidebar-nav">
      <div className="nb-tnav-progress" data-testid="today-nav-progress">
        <div className="row">
          <span className="label">阅读进度</span>
          <span className="nums">{readCount}/{updates.length}</span>
        </div>
        <div className="nb-progress"><div className="fill" style={{ width: `${pct}%` }} /></div>
        <div className="hint">{unreadCount > 0 ? `还有 ${unreadCount} 件未读` : '全部读完了'}</div>
      </div>

      <div className="nb-grp">筛选</div>
      <button className={`nb-tnav-row${todayFilter === 'all' ? ' active' : ''}`}
        onClick={() => setTodayFilter('all')} data-testid="today-nav-filter-all">
        <span className="ic"><Icons.feed size={14} /></span>
        <span className="lbl">全部</span>
        <span className="n">{updates.length}</span>
      </button>
      <button className={`nb-tnav-row${todayFilter === 'unread' ? ' active' : ''}`}
        onClick={() => setTodayFilter('unread')} data-testid="today-nav-filter-unread">
        <span className="ic"><Icons.eye size={14} /></span>
        <span className="lbl">未读</span>
        {unreadCount > 0 ? <span className="unread">{unreadCount}</span> : <span className="n">0</span>}
      </button>

      <div className="nb-grp">话题</div>
      {TOPICS.map((t) => {
        const topicUnread = updates.filter((u) => u.topicId === t.id && u.unread).length;
        const topicTotal = updates.filter((u) => u.topicId === t.id).length;
        return (
          <button key={t.id} className={`nb-tnav-row${todayFilter === t.id ? ' active' : ''}`}
            onClick={() => setTodayFilter(todayFilter === t.id ? 'all' : t.id)}
            data-testid={`today-nav-topic-${t.id}`}>
            <span className="tic" style={{ background: t.color }}><Icon name={t.icon} size={13} /></span>
            <span className="lbl">{topicShortName(t)}</span>
            {topicUnread > 0 ? <span className="unread">{topicUnread}</span> : <span className="n">{topicTotal}</span>}
          </button>
        );
      })}

      <div className="nb-grp">操作</div>
      <button className={`nb-tnav-row${unreadCount === 0 ? ' off' : ''}`} disabled={unreadCount === 0}
        onClick={markAllRead} data-testid="today-nav-mark-all-read">
        <span className="ic"><Icons.check size={14} /></span>
        <span className="lbl">全部标为已读</span>
      </button>
      <button className="nb-tnav-row" onClick={backToChat} data-testid="today-nav-back-to-chat">
        <span className="ic"><Icons.chat size={14} /></span>
        <span className="lbl">返回聊天</span>
      </button>
    </div>
  );
}
