// Global app state — the single source of truth for navigation, conversations,
// tasks, proactive updates, the quick chat and toasts.
//
// Design defaults locked in from the prototype's tweak exploration:
// sidebar opens on "聊天记录", proactive messages render as emphasized amber
// cards, the live monitor card is shown for the gold topic.
import { create } from 'zustand';
import type {
  ChatMessage, SessionMeta, Task, TaskSuggestion, Toast, UpdateItem, ViewingContext,
} from '../types';
import { CHATS } from '../data/chats';
import { CONVERSATIONS } from '../data/conversations';
import { INITIAL_TASKS } from '../data/tasks';
import { INITIAL_UPDATES, UPDATE_TO_CHAT } from '../data/updates';
import { genReply } from '../data/reply';
import { nextId } from '../data/ids';

const REPLY_DELAY_MS = 950;
const TOAST_DURATION_MS = 3600;
const JUST_ADDED_FLASH_MS = 700;
const TITLE_MAX_CHARS = 22;

export type View = 'chat' | 'today';
export type SidebarMode = 'history' | 'topics';

interface AppState {
  view: View;
  sidebarMode: SidebarMode;
  activeChatId: string | null;
  activeTopicId: string | null;
  convos: Record<string, ChatMessage[]>;
  sessionMeta: Record<string, SessionMeta>;
  tasks: Task[];
  createdTaskIds: string[];
  updates: UpdateItem[];
  openTopics: string[];
  notifOpen: boolean;
  railCollapsed: boolean;
  sideCollapsed: boolean;
  pending: boolean;
  toasts: Toast[];
  justAddedTaskId: string | null;
  // global quick chat
  quickChatId: string | null;
  quickOpen: boolean;
  quickPending: boolean;
  quickCtx: ViewingContext | null;

  // navigation
  setSidebarMode: (m: SidebarMode) => void;
  setSideCollapsed: (v: boolean) => void;
  setRailCollapsed: (v: boolean) => void;
  setNotifOpen: (v: boolean) => void;
  toggleTopic: (id: string) => void;
  selectChat: (id: string) => void;
  newChat: () => void;
  openToday: () => void;
  backToChat: () => void;
  openUpdateInChat: (u: UpdateItem) => void;

  // chat
  send: (text: string) => void;

  // quick chat
  sendQuick: (text: string) => void;
  setQuickOpen: (v: boolean) => void;
  setQuickCtx: (ctx: ViewingContext | null) => void;
  openQuickInChat: () => void;

  // tasks
  createTask: (data: TaskSuggestion) => void;
  toggleTask: (id: string) => void;

  // read state
  markRead: (id: string, read?: boolean) => void;
  markAllRead: () => void;

  // toasts
  toast: (text: string) => void;
}

function truncateTitle(text: string): string {
  return text.length > TITLE_MAX_CHARS ? `${text.slice(0, TITLE_MAX_CHARS)}…` : text;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'chat',
  sidebarMode: 'history',
  activeChatId: 'c_gold_today',
  activeTopicId: 'gold',
  convos: structuredClone(CONVERSATIONS),
  sessionMeta: {},
  tasks: INITIAL_TASKS.map((t) => ({ ...t })),
  createdTaskIds: [],
  updates: INITIAL_UPDATES.map((u) => ({ ...u })),
  openTopics: ['gold'],
  notifOpen: false,
  railCollapsed: false,
  sideCollapsed: false,
  pending: false,
  toasts: [],
  justAddedTaskId: null,
  quickChatId: null,
  quickOpen: false,
  quickPending: false,
  quickCtx: null,

  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  setSideCollapsed: (sideCollapsed) => set({ sideCollapsed }),
  setRailCollapsed: (railCollapsed) => set({ railCollapsed }),
  setNotifOpen: (notifOpen) => set({ notifOpen }),

  toggleTopic: (id) => set((s) => ({
    openTopics: s.openTopics.includes(id)
      ? s.openTopics.filter((x) => x !== id)
      : [...s.openTopics, id],
  })),

  selectChat: (id) => {
    const c = CHATS.find((x) => x.id === id);
    set((s) => ({
      activeChatId: id,
      activeTopicId: c ? c.topicId : (s.sessionMeta[id]?.topicId ?? 'gold'),
      view: 'chat',
      notifOpen: false,
      quickCtx: null,
    }));
  },

  newChat: () => set({ activeChatId: null, activeTopicId: null, view: 'chat', notifOpen: false, quickCtx: null }),

  openToday: () => set({ view: 'today', notifOpen: false }),

  // Leaving the Today page clears the "viewing" context.
  backToChat: () => set({ view: 'chat', quickCtx: null }),

  openUpdateInChat: (u) => {
    set((s) => ({
      updates: s.updates.map((x) => (x.id === u.id ? { ...x, unread: false } : x)),
      notifOpen: false,
      quickCtx: null,
    }));
    get().selectChat(UPDATE_TO_CHAT[u.topicId] ?? 'c_gold_today');
  },

  send: (text) => {
    if (!text.trim()) return;
    const s = get();
    let chatId = s.activeChatId;
    const patch: Partial<AppState> = { view: 'chat', notifOpen: false, pending: true };

    // Free-typed message in a brand-new chat: create session metadata for it.
    if (!chatId || !s.convos[chatId]) {
      chatId = nextId('c');
      patch.sessionMeta = {
        ...s.sessionMeta,
        [chatId]: { id: chatId, title: truncateTitle(text), topicId: 'gold' },
      };
      patch.activeChatId = chatId;
    }
    patch.convos = {
      ...s.convos,
      [chatId]: [...(s.convos[chatId] ?? []), { id: nextId(), role: 'user', text }],
    };
    set(patch);

    setTimeout(() => {
      const { topicId, msg } = genReply(text);
      set((st) => ({
        activeTopicId: topicId,
        sessionMeta: st.sessionMeta[chatId!]
          ? { ...st.sessionMeta, [chatId!]: { ...st.sessionMeta[chatId!], topicId } }
          : st.sessionMeta,
        convos: { ...st.convos, [chatId!]: [...(st.convos[chatId!] ?? []), msg] },
        pending: false,
      }));
    }, REPLY_DELAY_MS);
  },

  sendQuick: (text) => {
    if (!text.trim()) return;
    const s = get();
    let id = s.quickChatId;
    const patch: Partial<AppState> = { quickOpen: true, quickPending: true };
    if (!id) {
      id = nextId('c');
      patch.quickChatId = id;
      patch.sessionMeta = {
        ...s.sessionMeta,
        [id]: { id, title: truncateTitle(text), topicId: s.quickCtx?.topicId ?? 'gold' },
      };
    }
    patch.convos = {
      ...s.convos,
      [id]: [...(s.convos[id] ?? []), { id: nextId(), role: 'user', text }],
    };
    set(patch);

    const ctx = s.quickCtx;
    setTimeout(() => {
      const { topicId, msg } = genReply(text, ctx?.title ?? null);
      set((st) => ({
        sessionMeta: st.sessionMeta[id!]
          ? { ...st.sessionMeta, [id!]: { ...st.sessionMeta[id!], topicId: ctx?.topicId ?? topicId } }
          : st.sessionMeta,
        convos: { ...st.convos, [id!]: [...(st.convos[id!] ?? []), msg] },
        quickPending: false,
      }));
    }, REPLY_DELAY_MS);
  },

  setQuickOpen: (quickOpen) => set({ quickOpen }),
  setQuickCtx: (quickCtx) => set({ quickCtx }),

  openQuickInChat: () => {
    const s = get();
    if (!s.quickChatId) return;
    set({
      activeChatId: s.quickChatId,
      activeTopicId: s.sessionMeta[s.quickChatId]?.topicId ?? s.quickCtx?.topicId ?? 'gold',
      view: 'chat',
      quickOpen: false,
      notifOpen: false,
      quickCtx: null,
    });
  },

  createTask: (data) => {
    set((s) => {
      if (s.tasks.some((x) => x.id === data.id)) {
        return { createdTaskIds: s.createdTaskIds.includes(data.id) ? s.createdTaskIds : [...s.createdTaskIds, data.id] };
      }
      return {
        tasks: [{ ...data, status: 'active' as const }, ...s.tasks],
        createdTaskIds: s.createdTaskIds.includes(data.id) ? s.createdTaskIds : [...s.createdTaskIds, data.id],
        railCollapsed: false,
        justAddedTaskId: data.id,
      };
    });
    get().toast(`已创建任务 · ${data.title}`);
    setTimeout(() => set({ justAddedTaskId: null }), JUST_ADDED_FLASH_MS);
  },

  toggleTask: (id) => set((s) => ({
    tasks: s.tasks.map((k) => k.id === id
      ? {
          ...k,
          status: k.status === 'active' ? 'paused' : 'active',
          next: k.status === 'active' ? '已暂停' : (k.triggerType === 'schedule' ? '明天' : '监控中'),
        }
      : k),
  })),

  markRead: (id, read = true) => set((s) => ({
    updates: s.updates.map((u) => (u.id === id ? { ...u, unread: !read } : u)),
  })),

  markAllRead: () => {
    set((s) => ({ updates: s.updates.map((u) => ({ ...u, unread: false })) }));
    get().toast('已全部标为已读');
  },

  toast: (text) => {
    const id = nextId('toast');
    set((s) => ({ toasts: [...s.toasts, { id, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), TOAST_DURATION_MS);
  },
}));

/** Number of unread proactive updates (drives badges across the UI). */
export function selectUnreadCount(s: { updates: UpdateItem[] }): number {
  return s.updates.filter((u) => u.unread).length;
}
