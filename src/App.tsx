// App shell: three-column grid (sidebar | center | task rail) with collapse
// states, view routing (chat / today), and the global overlay layers
// (notifications, quick chat, selection float, toasts).
//
// On the Today page both side columns collapse for an immersive reading
// surface; navigation moves to the floating corner controls.
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatView } from './components/chat/ChatView';
import { TodayView } from './components/today/TodayView';
import { TaskRail } from './components/tasks/TaskRail';
import { FloatingControls } from './components/layout/FloatingControls';
import { NotificationDropdown } from './components/notifications/NotificationDropdown';
import { QuickChat } from './components/quickchat/QuickChat';
import { SelectionFloat } from './components/selection/SelectionFloat';
import { ToastStack } from './components/feedback/ToastStack';

export default function App() {
  const view = useAppStore((s) => s.view);
  const railCollapsed = useAppStore((s) => s.railCollapsed);
  const sideCollapsed = useAppStore((s) => s.sideCollapsed);
  const notifOpen = useAppStore((s) => s.notifOpen);
  const newChat = useAppStore((s) => s.newChat);

  const isToday = view === 'today';

  // ⌘N / Ctrl+N starts a new chat (shortcut shown on the sidebar button).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        newChat();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [newChat]);

  return (
    <div
      className={`nb-app${railCollapsed || isToday ? ' rail-collapsed' : ''}${sideCollapsed || isToday ? ' side-collapsed' : ''}`}
      data-testid="nanobee-app">
      <Sidebar />

      <section className="nb-chat" data-testid="center-surface">
        <FloatingControls />
        {isToday ? <TodayView /> : <ChatView />}
        {notifOpen && <NotificationDropdown />}
      </section>

      {!isToday && !railCollapsed && <TaskRail />}

      <QuickChat />
      <SelectionFloat />
      <ToastStack />
    </div>
  );
}
