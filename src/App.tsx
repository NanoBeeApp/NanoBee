// App shell: two-column grid (sidebar | center) with a collapsible sidebar,
// view routing (chat / today / tasks), and the global overlay layers
// (notifications, quick chat, selection float, toasts).
//
// The sidebar stays on every view and remains user-collapsible for an
// immersive mode; navigation then moves to the floating corner controls.
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatView } from './components/chat/ChatView';
import { TodayView } from './components/today/TodayView';
import { TasksView } from './components/tasks/TasksView';
import { FloatingControls } from './components/layout/FloatingControls';
import { NotificationDropdown } from './components/notifications/NotificationDropdown';
import { QuickChat } from './components/quickchat/QuickChat';
import { SelectionFloat } from './components/selection/SelectionFloat';
import { ToastStack } from './components/feedback/ToastStack';
import { AiProviderSetupDialog } from './components/onboarding/AiProviderSetupDialog';

export default function App() {
  const view = useAppStore((s) => s.view);
  const sideCollapsed = useAppStore((s) => s.sideCollapsed);
  const notifOpen = useAppStore((s) => s.notifOpen);
  const newChat = useAppStore((s) => s.newChat);
  const bootstrap = useAppStore((s) => s.bootstrap);

  // Load the persisted server state from D1 into the (initially empty) store.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

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
      className={`nb-app${sideCollapsed ? ' side-collapsed' : ''}`}
      data-testid="nanobee-app">
      <Sidebar />

      <section className="nb-chat" data-testid="center-surface">
        <FloatingControls />
        {view === 'today' ? <TodayView /> : view === 'tasks' ? <TasksView /> : <ChatView />}
        {notifOpen && <NotificationDropdown />}
      </section>

      <QuickChat />
      <SelectionFloat />
      <ToastStack />
      {/* First-login AI provider setup (also opened from the account menu) */}
      <AiProviderSetupDialog />
    </div>
  );
}
