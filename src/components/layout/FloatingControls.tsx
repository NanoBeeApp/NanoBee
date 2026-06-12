// Floating corner controls — the design intentionally has no fixed header to
// maximize the content area. Top-left: back-to-chat (Today page) or expand
// sidebar; top-right: notification bell and expand-task-rail.
import { useAppStore, selectUnreadCount } from '../../store/useAppStore';
import { topicById } from '../../data/topics';
import { Icons } from '../../icons/icons';

export function FloatingControls() {
  const view = useAppStore((s) => s.view);
  const sideCollapsed = useAppStore((s) => s.sideCollapsed);
  const railCollapsed = useAppStore((s) => s.railCollapsed);
  const setSideCollapsed = useAppStore((s) => s.setSideCollapsed);
  const setRailCollapsed = useAppStore((s) => s.setRailCollapsed);
  const notifOpen = useAppStore((s) => s.notifOpen);
  const setNotifOpen = useAppStore((s) => s.setNotifOpen);
  const backToChat = useAppStore((s) => s.backToChat);
  const unread = useAppStore(selectUnreadCount);
  const tasks = useAppStore((s) => s.tasks);
  const activeTopicId = useAppStore((s) => s.activeTopicId);

  const topic = topicById(activeTopicId);
  const taskCount = tasks.filter((k) => !topic || k.topicId === topic.id).length;

  return (
    <>
      {(sideCollapsed || view === 'today') && (
        <div className="nb-float tl">
          {view === 'today' ? (
            <button className="fbtn" title="返回聊天" onClick={backToChat} data-testid="back-to-chat">
              <Icons.chat size={16} />
            </button>
          ) : (
            <button className="fbtn" title="展开边栏" onClick={() => setSideCollapsed(false)} data-testid="expand-sidebar">
              <Icons.panelLeft size={16} />
              {unread > 0 && <span className="dotred" />}
            </button>
          )}
        </div>
      )}
      <div className="nb-float tr">
        <button className="fbtn" title="通知" onClick={() => setNotifOpen(!notifOpen)} data-testid="notification-bell">
          <Icons.bell size={16} />{unread > 0 && <span className="dotred" />}
        </button>
        {view !== 'today' && railCollapsed && (
          <button className="fbtn" title={`展开任务面板（${taskCount}）`}
            onClick={() => setRailCollapsed(false)} data-testid="expand-task-rail">
            <Icons.bolt size={16} />
          </button>
        )}
      </div>
    </>
  );
}
