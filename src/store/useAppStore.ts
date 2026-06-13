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
import type { Artifact, ArtifactRef } from '../artifacts/types';
import { apiClient } from '../lib/api-client';
import { UPDATE_TO_CHAT } from '../data/updates';
import { nextId } from '../data/ids';

/** Minimum visible duration of the thinking indicator while awaiting the API. */
const MIN_THINKING_MS = 600;
const TOAST_DURATION_MS = 3600;
const JUST_ADDED_FLASH_MS = 700;
const TITLE_MAX_CHARS = 22;

export type View = 'chat' | 'today' | 'tasks' | 'artifacts' | 'research';
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
  /** Today-page filter: 'all' | a topic id. Shared by the sidebar nav and the reading surface. */
  todayFilter: string;
  /** Tasks-page topic filter: 'all' | a topic id. Lifted to the store so the
   *  sidebar can clear it before jumping to a task on another topic. */
  tasksFilter: string;
  /** Id of the center item a sidebar list asked to scroll to (Today / Tasks pages). */
  focusItemId: string | null;
  /** Bumped on every focusItem() call so repeat clicks on the same id re-trigger the scroll. */
  focusItemTick: number;
  openTopics: string[];
  notifOpen: boolean;
  /** Persistent collapse state of the sidebar (toggled by the panel icon). */
  sideCollapsed: boolean;
  /** Temporary "peek": the sidebar is shown as an overlay while collapsed
   *  (triggered by the left-edge reveal) and auto-closes on mouse leave. */
  sidePeek: boolean;
  pending: boolean;
  toasts: Toast[];
  justAddedTaskId: string | null;
  // global quick chat
  quickChatId: string | null;
  quickOpen: boolean;
  quickPending: boolean;
  quickCtx: ViewingContext | null;
  /** AI provider setup dialog opened manually from the account menu. */
  aiSetupOpen: boolean;
  // artifacts (card decks generated from chat)
  artifacts: Artifact[];
  selectedArtifactId: string | null;
  artifactsLoading: boolean;
  /** A quick-launch shortcut is generating a deck (keeps the Artifacts page busy). */
  artifactGenerating: boolean;

  // server sync
  bootstrap: () => Promise<void>;

  // navigation
  setSidebarMode: (m: SidebarMode) => void;
  setSideCollapsed: (v: boolean) => void;
  /** Open the sidebar temporarily (overlay peek) without changing the
   *  persistent collapse state. No-op when already pinned open. */
  peekSidebar: () => void;
  /** End a temporary peek (called when the pointer leaves the sidebar). */
  endPeek: () => void;
  setNotifOpen: (v: boolean) => void;
  toggleTopic: (id: string) => void;
  selectChat: (id: string) => void;
  newChat: () => void;
  /** Return to the chat view keeping the current conversation (the sidebar "聊天" tile). */
  openChat: () => void;
  openToday: () => void;
  openTasks: () => void;
  openResearch: () => void;
  /** Ask the active center page (Today / Tasks) to scroll its matching item into view. */
  focusItem: (id: string) => void;
  // artifacts
  openArtifacts: (id?: string) => void;
  loadArtifacts: () => Promise<void>;
  selectArtifact: (id: string) => void;
  deleteArtifact: (id: string) => void;
  /** Run a canned prompt to generate a deck, staying on the Artifacts page. */
  runArtifactShortcut: (prompt: string) => Promise<void>;
  setTodayFilter: (f: string) => void;
  setTasksFilter: (f: string) => void;
  backToChat: () => void;
  openUpdateInChat: (u: UpdateItem) => void;

  // chat
  send: (text: string) => void;

  // quick chat
  sendQuick: (text: string) => void;
  setQuickOpen: (v: boolean) => void;
  setQuickCtx: (ctx: ViewingContext | null) => void;
  openQuickInChat: () => void;

  // AI provider settings dialog
  setAiSetupOpen: (v: boolean) => void;

  // tasks
  createTask: (data: TaskSuggestion) => void;
  toggleTask: (id: string) => void;

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
): Promise<{ topicId: string; artifacts?: ArtifactRef[] } | null> {
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
  return { topicId: data.topicId, artifacts: data.aiMessage.artifacts };
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
  todayFilter: 'all',
  tasksFilter: 'all',
  focusItemId: null,
  focusItemTick: 0,
  openTopics: [],
  notifOpen: false,
  sideCollapsed: false,
  sidePeek: false,
  pending: false,
  toasts: [],
  justAddedTaskId: null,
  quickChatId: null,
  quickOpen: false,
  quickPending: false,
  quickCtx: null,
  aiSetupOpen: false,
  artifacts: [],
  selectedArtifactId: null,
  artifactsLoading: false,
  artifactGenerating: false,

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
  // Pinning or collapsing always ends any temporary peek.
  setSideCollapsed: (sideCollapsed) => set({ sideCollapsed, sidePeek: false }),
  peekSidebar: () => { if (get().sideCollapsed) set({ sidePeek: true }); },
  endPeek: () => { if (get().sidePeek) set({ sidePeek: false }); },
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

  // The sidebar "聊天" tile: just switch back to the chat view, keeping whatever
  // conversation is active (unlike newChat, which clears it).
  openChat: () => set({ view: 'chat', notifOpen: false }),

  openToday: () => set({ view: 'today', notifOpen: false }),

  openTasks: () => set({ view: 'tasks', notifOpen: false }),

  openResearch: () => set({ view: 'research', notifOpen: false }),

  focusItem: (id) => set((s) => ({ focusItemId: id, focusItemTick: s.focusItemTick + 1 })),

  // Open the Artifacts page; optionally focus a specific artifact. Always
  // refreshes the list so a just-created artifact shows up.
  openArtifacts: (id) => {
    set((s) => ({
      view: 'artifacts',
      notifOpen: false,
      selectedArtifactId: id ?? s.selectedArtifactId,
    }));
    void get().loadArtifacts();
  },

  loadArtifacts: async () => {
    set({ artifactsLoading: true });
    try {
      const res = await apiClient.artifacts.$get();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { artifacts: Artifact[] };
      console.log('[artifacts] loaded:', `${data.artifacts.length} artifacts`);
      set((s) => ({
        artifacts: data.artifacts,
        artifactsLoading: false,
        // Default the selection to the newest artifact when none is chosen.
        selectedArtifactId:
          s.selectedArtifactId && data.artifacts.some((a) => a.id === s.selectedArtifactId)
            ? s.selectedArtifactId
            : (data.artifacts[0]?.id ?? null),
      }));
    } catch (error) {
      console.error('[artifacts] load failed:', String(error));
      set({ artifactsLoading: false });
    }
  },

  selectArtifact: (id) => set({ selectedArtifactId: id }),

  deleteArtifact: async (id) => {
    const prev = get().artifacts;
    set((s) => {
      const remaining = s.artifacts.filter((a) => a.id !== id);
      return {
        artifacts: remaining,
        selectedArtifactId: s.selectedArtifactId === id ? (remaining[0]?.id ?? null) : s.selectedArtifactId,
      };
    });
    try {
      const res = await apiClient.artifacts[':id'].$delete({ param: { id } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error('[artifacts] delete failed:', String(error));
      set({ artifacts: prev });
      get().toast('删除失败，请重试');
    }
  },

  // A quick-launch shortcut: run a canned prompt through the same chat pipeline
  // (so the create_card_artifact agent tool produces the deck), but keep the
  // user on the Artifacts page and surface the new deck there. The message is
  // still recorded to a chat, consistent with the chat-trigger model.
  runArtifactShortcut: async (prompt) => {
    if (get().artifactGenerating) return;
    set({ view: 'artifacts', artifactGenerating: true, notifOpen: false });
    const chatId = nextId('c');
    const userMessageId = nextId();
    try {
      const res = await apiClient.messages.$post({
        json: { chatId, userMessageId, title: truncateTitle(prompt), text: prompt },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { topicId: string; aiMessage: AiMessage };
      // Record the exchange so the chat exists if the user opens it later.
      set((st) => ({
        sessionMeta: { ...st.sessionMeta, [chatId]: { id: chatId, title: truncateTitle(prompt), topicId: data.topicId } },
        convos: { ...st.convos, [chatId]: [{ id: userMessageId, role: 'user', text: prompt }, data.aiMessage] },
      }));
      const created = data.aiMessage.artifacts?.[0];
      await get().loadArtifacts();
      if (created) {
        set({ selectedArtifactId: created.id, artifactGenerating: false });
        get().toast(`已生成 · ${created.title}`);
      } else {
        set({ artifactGenerating: false });
        get().toast('这次没有生成卡片，换个说法再试试');
      }
    } catch (error) {
      console.error('[artifacts] shortcut failed:', String(error));
      set({ artifactGenerating: false });
      get().toast('生成失败，请稍后重试');
    }
  },

  setTodayFilter: (todayFilter) => set({ todayFilter }),

  setTasksFilter: (tasksFilter) => set({ tasksFilter }),

  // Leaving the Today page clears the "viewing" context.
  backToChat: () => set({ view: 'chat', quickCtx: null }),

  openUpdateInChat: (u) => {
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
      // A reply that produced card artifacts: refresh the Artifacts page list
      // so the new deck is there, and nudge the user toward it.
      if (result.artifacts?.length) {
        void get().loadArtifacts();
        get().toast(`已生成卡片 · ${result.artifacts[0].title}`);
      }
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
    if (!result) {
      get().toast('发送失败，请稍后重试');
    } else if (result.artifacts?.length) {
      void get().loadArtifacts();
      get().toast(`已生成卡片 · ${result.artifacts[0].title}`);
    }
  },

  setQuickOpen: (quickOpen) => set({ quickOpen }),
  setQuickCtx: (quickCtx) => set({ quickCtx }),

  setAiSetupOpen: (aiSetupOpen) => set({ aiSetupOpen }),

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

  toast: (text) => {
    const id = nextId('toast');
    set((s) => ({ toasts: [...s.toasts, { id, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), TOAST_DURATION_MS);
  },
}));
