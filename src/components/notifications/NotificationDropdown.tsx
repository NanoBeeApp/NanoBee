// Bell dropdown with the most recent proactive updates and a link to the
// full Today page.
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../icons/icons';

const MAX_ITEMS = 4;
const SUMMARY_MAX_CHARS = 48;

export function NotificationDropdown() {
  const updates = useAppStore((s) => s.updates);
  const openUpdateInChat = useAppStore((s) => s.openUpdateInChat);
  const setNotifOpen = useAppStore((s) => s.setNotifOpen);
  const openToday = useAppStore((s) => s.openToday);

  return (
    <>
      <div className="nb-scrim" onClick={() => setNotifOpen(false)} />
      <div className="nb-notif-pop" data-testid="notification-dropdown">
        <div className="nb-notif-head">
          <span className="nh">最近动态</span>
          <button className="btn btn-ghost btn-sm" onClick={openToday} data-testid="see-all-notifications">查看全部</button>
        </div>
        <div className="nb-notif-list">
          {updates.slice(0, MAX_ITEMS).map((u) => (
            <div key={u.id} className="nb-notif-item" onClick={() => openUpdateInChat(u)}
              data-testid={`notification-item-${u.id}`}>
              <div className="ni" style={{ background: u.color }}><Icon name={u.icon} size={15} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nt">{u.title}</div>
                <div className="ns">{u.summary.length > SUMMARY_MAX_CHARS ? `${u.summary.slice(0, SUMMARY_MAX_CHARS)}…` : u.summary}</div>
                <div className="nm">{u.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
