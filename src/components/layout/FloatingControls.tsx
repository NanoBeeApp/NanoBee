// Floating corner controls — the design intentionally has no fixed header to
// maximize the content area. Top-left (only when the sidebar is collapsed):
// expand sidebar, plus back-to-chat while reading the Today page;
// top-right: a single account avatar whose dropdown gathers everything else.
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { AccountFoot } from '../sidebar/AccountFoot';

export function FloatingControls() {
  const view = useAppStore((s) => s.view);
  const sideCollapsed = useAppStore((s) => s.sideCollapsed);
  const setSideCollapsed = useAppStore((s) => s.setSideCollapsed);
  const peekSidebar = useAppStore((s) => s.peekSidebar);
  const backToChat = useAppStore((s) => s.backToChat);
  const rightCollapsed = useAppStore((s) => s.rightCollapsed);
  const setRightCollapsed = useAppStore((s) => s.setRightCollapsed);

  // The docked right chat panel only exists off the chat view; only then can it
  // be collapsed, and only then do we surface a control to bring it back.
  const showExpandRight = view !== 'chat' && rightCollapsed;

  return (
    <>
      {sideCollapsed && (
        <>
          {/* Left-edge reveal zone: hovering the screen's left edge surfaces a
              soft glow; clicking anywhere in the (intentionally wide) hit area
              *peeks* the sidebar open temporarily (it overlays the content and
              auto-closes when the pointer leaves). To pin it open persistently,
              use the panel-toggle icon below instead. */}
          <button
            className="nb-edge-reveal"
            title="临时展开边栏"
            aria-label="临时展开边栏"
            onClick={peekSidebar}
            data-testid="edge-reveal-sidebar"
          >
            <span className="nb-edge-glow" />
          </button>
          <div className="nb-float tl">
            <button className="fbtn" title="固定展开边栏" onClick={() => setSideCollapsed(false)} data-testid="expand-sidebar">
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
        {showExpandRight && (
          <button className="fbtn" title="展开快速对话" onClick={() => setRightCollapsed(false)} data-testid="expand-right-chat">
            <Icons.panelRight size={16} />
          </button>
        )}
        <AccountFoot />
      </div>
    </>
  );
}
