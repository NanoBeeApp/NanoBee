// Floating corner controls — the design intentionally has no fixed header to
// maximize the content area. Top-left (only when the sidebar is collapsed):
// expand sidebar, plus back-to-chat while reading the Today page;
// top-right: notification bell.
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';

export function FloatingControls() {
  const view = useAppStore((s) => s.view);
  const sideCollapsed = useAppStore((s) => s.sideCollapsed);
  const setSideCollapsed = useAppStore((s) => s.setSideCollapsed);
  const notifOpen = useAppStore((s) => s.notifOpen);
  const setNotifOpen = useAppStore((s) => s.setNotifOpen);
  const backToChat = useAppStore((s) => s.backToChat);

  return (
    <>
      {sideCollapsed && (
        <>
          {/* Left-edge reveal zone: hovering the screen's left edge surfaces a
              soft glow; clicking anywhere in the (intentionally wide) hit area
              expands the sidebar — no need to aim for the small toggle button. */}
          <button
            className="nb-edge-reveal"
            title="展开边栏"
            aria-label="展开边栏"
            onClick={() => setSideCollapsed(false)}
            data-testid="edge-reveal-sidebar"
          >
            <span className="nb-edge-glow" />
          </button>
          <div className="nb-float tl">
            <button className="fbtn" title="展开边栏" onClick={() => setSideCollapsed(false)} data-testid="expand-sidebar">
              <Icons.panelLeft size={16} />
            </button>
            {view === 'today' && (
              <button className="fbtn" title="返回聊天" onClick={backToChat} data-testid="back-to-chat">
                <Icons.chat size={16} />
              </button>
            )}
          </div>
        </>
      )}
      <div className="nb-float tr">
        <button className="fbtn" title="通知" onClick={() => setNotifOpen(!notifOpen)} data-testid="notification-bell">
          <Icons.bell size={16} />
        </button>
      </div>
    </>
  );
}
