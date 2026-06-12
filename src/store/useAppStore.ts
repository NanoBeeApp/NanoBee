// Global app state — the single source of truth for navigation, conversations,
// tasks, proactive updates, the quick chat and toasts.
//
// Data flow: the store starts empty (new-user state), then bootstrap()
// fills it with the server state from D1. Mutations apply optimistically
// and persist through the typed Hono RPC client; failures roll back and
// surface a toast.
//
// Design defaults locked in from the prototype's tweak exploration:
// sidebar opens on "聊天记录", proactive messages render as emphasized amber
// cards, the live monitor card is shown for the gold topic.
import { create } from 'zustand';
import type {
  AiMessage, ChatMessage, ChatMeta, SessionMeta, Task, TaskSuggestion, Toast,
  UpdateItem, ViewingContext,
} from '../types';
import { apiClient } from '../lib/api-client';
import { UPDATE_TO_CHAT } from '../data/updates';
import { nextId } from '../data/ids';

/** Minimum visible duration of the thinking indicator while awaiting the API. */
const MIN_THINKING_MS = 600;
const TOAST_DURATION_MS = 3600;
const JUST_ADDED_FLASH_MS = 700;
const TITLE_MAX_CHARS = 22;

export type View = 'chat' | 'today';
export type SidebarMode = 'history' | 'topics';

/** Server payload of GET /api/bootstrap. */
interface BootstrapData {
  chats: ChatMeta[];
  conversations: Record<string, ChatMessage[]>;
  tasks: Task[];
  updates: UpdateItem[];
}

interface AppState {
  view: View;
  sidebarMode: SidebarMode;
  activeChatId: string | null;
  activeTopicId: string | null;
  chats: ChatMeta[];
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

  // server sync
  bootstrap: () => Promise<void>;

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends one user message to POST /api/messages and appends the AI reply.
 * Shared by the main chat and the quick chat; the caller has already
 * appended the user message optimistically.
 */
async function deliverMessage(
  set: (fn: (s: AppState) => Partial<AppState>) => void,
  args: {
    chatId: string; userMessageId: string; title?: string;
    text: string; ctxTitle?: string | null; ctxTopicId?: string | null;
  },
): Promise<{ topicId: string } | null> {
  const [res] = await Promise.all([
    apiClient.messages.$post({ json: args }),
    delay(MIN_THINKING_MS),
  ]);
  if (!res.ok) {
    console.error('[send] POST /api/messages failed, status:', res.status);
    return null;
  }
  const data = (await res.json()) as { topicId: string; aiMessage: AiMessage };
  set((st) => ({
    sessionMeta: st.sessionMeta[args.chatId]
      ? { ...st.sessionMeta, [args.chatId]: { ...st.sessionMeta[args.chatId], topicId: data.topicId } }
      : st.sessionMeta,
    convos: { ...st.convos, [args.chatId]: [...(st.convos[args.chatId] ?? []), data.aiMessage] },
  }));
  return { topicId: data.topicId };
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'chat',
  sidebarMode: 'history',
  activeChatId: null,
  activeTopicId: null,
  chats: [],
  convos: {},
  sessionMeta: {},
  tasks: [],
  createdTaskIds: [],
  updates: [],
  openTopics: [],
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

  bootstrap: async () => {
    try {
      const res = await apiClient.bootstrap.$get();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BootstrapData;
      console.log(
        '[bootstrap] loaded from D1:',
        `${data.chats.length} chats, ${data.tasks.length} tasks, ${data.updates.length} updates`,
      );
      set({
        chats: data.chats,
        convos: data.conversations,
        tasks: data.tasks,
        updates: data.updates,
      });
    } catch (error) {
      // The store stays empty; the user can retry by reloading.
      console.error('[bootstrap] failed:', String(error));
      get().toast('服务器连接失败，请稍后重试');
    }
  },

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
    const c = get().chats.find((x) => x.id === id);
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
    get().markRead(u.id);
    set({ notifOpen: false, quickCtx: null });
    get().selectChat(UPDATE_TO_CHAT[u.topicId] ?? 'c_gold_today');
  },

  send: async (text) => {
    if (!text.trim()) return;
    const s = get();
    let chatId = s.activeChatId;
    const userMessageId = nextId();
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
      [chatId]: [...(s.convos[chatId] ?? []), { id: userMessageId, role: 'user', text }],
    };
    set(patch);

    const result = await deliverMessage(set, {
      chatId, userMessageId, title: truncateTitle(text), text,
    }).catch((error) => {
      console.error('[send] network error:', String(error));
      return null;
    });
    if (result) {
      set({ activeTopicId: result.topicId, pending: false });
    } else {
      set({ pending: false });
      get().toast('发送失败，请稍后重试');
    }
  },

  sendQuick: async (text) => {
    if (!text.trim()) return;
    const s = get();
    let id = s.quickChatId;
    const userMessageId = nextId();
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
      [id]: [...(s.convos[id] ?? []), { id: userMessageId, role: 'user', text }],
    };
    set(patch);

    const ctx = s.quickCtx;
    const result = await deliverMessage(set, {
      chatId: id, userMessageId, title: truncateTitle(text), text,
      ctxTitle: ctx?.title ?? null, ctxTopicId: ctx?.topicId ?? null,
    }).catch((error) => {
      console.error('[sendQuick] network error:', String(error));
      return null;
    });
    set({ quickPending: false });
    if (!result) get().toast('发送失败，请稍后重试');
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

  createTask: async (data) => {
    const existed = get().tasks.some((x) => x.id === data.id);
    set((s) => {
      if (existed) {
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
    if (existed) return;

    try {
      const res = await apiClient.tasks.$post({ json: data });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error('[createTask] persist failed:', String(error));
      set((s) => ({
        tasks: s.tasks.filter((t) => t.id !== data.id),
        createdTaskIds: s.createdTaskIds.filter((x) => x !== data.id),
      }));
      get().toast('任务保存失败，请重试');
    }
  },

  toggleTask: async (id) => {
    const prevTasks = get().tasks;
    set((s) => ({
      tasks: s.tasks.map((k) => k.id === id
        ? {
            ...k,
            status: k.status === 'active' ? 'paused' : 'active',
            next: k.status === 'active' ? '已暂停' : (k.triggerType === 'schedule' ? '明天' : '监控中'),
          }
        : k),
    }));
    try {
      const res = await apiClient.tasks[':id'].toggle.$post({ param: { id } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error('[toggleTask] persist failed:', String(error));
      set({ tasks: prevTasks });
      get().toast('操作失败，请重试');
    }
  },

  markRead: async (id, read = true) => {
    const prevUpdates = get().updates;
    set((s) => ({
      updates: s.updates.map((u) => (u.id === id ? { ...u, unread: !read } : u)),
    }));
    try {
      const res = await apiClient.updates[':id'].read.$post({ param: { id }, json: { read } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error('[markRead] persist failed:', String(error));
      set({ updates: prevUpdates });
      get().toast('同步已读状态失败');
    }
  },

  markAllRead: async () => {
    const prevUpdates = get().updates;
    set((s) => ({ updates: s.updates.map((u) => ({ ...u, unread: false })) }));
    get().toast('已全部标为已读');
    try {
      const res = await apiClient.updates['read-all'].$post();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error('[markAllRead] persist failed:', String(error));
      set({ updates: prevUpdates });
      get().toast('同步已读状态失败');
    }
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
