// Today-page sidebar navigation: topic filters (with per-topic item counts)
// and quick actions (back to chat). Replaces the chat lists in the sidebar
// scroll area while reading.
import { useAppStore } from '../../store/useAppStore';
import { TOPICS, topicShortName } from '../../data/topics';
import { Icon, Icons } from '../../icons/icons';

export function TodayNav() {
  const updates = useAppStore((s) => s.updates);
  const todayFilter = useAppStore((s) => s.todayFilter);
  const setTodayFilter = useAppStore((s) => s.setTodayFilter);
  const backToChat = useAppStore((s) => s.backToChat);

  return (
    <div className="nb-tnav" data-testid="today-sidebar-nav">
      <div className="nb-grp">筛选</div>
      <button className={`nb-tnav-row${todayFilter === 'all' ? ' active' : ''}`}
        onClick={() => setTodayFilter('all')} data-testid="today-nav-filter-all">
        <span className="ic"><Icons.feed size={14} /></span>
        <span className="lbl">全部</span>
        <span className="n">{updates.length}</span>
      </button>

      <div className="nb-grp">话题</div>
      {TOPICS.map((t) => {
        const topicTotal = updates.filter((u) => u.topicId === t.id).length;
        return (
          <button key={t.id} className={`nb-tnav-row${todayFilter === t.id ? ' active' : ''}`}
            onClick={() => setTodayFilter(todayFilter === t.id ? 'all' : t.id)}
            data-testid={`today-nav-topic-${t.id}`}>
            <span className="tic" style={{ background: t.color }}><Icon name={t.icon} size={13} /></span>
            <span className="lbl">{topicShortName(t)}</span>
            <span className="n">{topicTotal}</span>
          </button>
        );
      })}

      <div className="nb-grp">操作</div>
      <button className="nb-tnav-row" onClick={backToChat} data-testid="today-nav-back-to-chat">
        <span className="ic"><Icons.chat size={14} /></span>
        <span className="lbl">返回聊天</span>
      </button>
    </div>
  );
}
