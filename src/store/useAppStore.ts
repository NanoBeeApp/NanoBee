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
import { useResearchStore } from './useResearchStore';

/** Minimum visible duration of the thinking indicator while awaiting the API. */
const MIN_THINKING_MS = 600;
const TOAST_DURATION_MS = 3600;
const JUST_ADDED_FLASH_MS = 700;
const TITLE_MAX_CHARS = 22;

/** Starter prompts the page-specific "new" actions drop into the chat composer.
 *  They are seeds the user finishes typing, not auto-sent messages — tasks and
 *  artifacts are born from the conversation, so we prime the chat instead of
 *  offering a standalone form. */
const TASK_SEED = '帮我盯着 ';
const ARTIFACT_SEED = '帮我做一组卡片：';

export type View = 'chat' | 'today' | 'tasks' | 'artifacts' | 'research' | 'settings';
export type SidebarMode = 'history' | 'topics';

/** URL path for each view. The router is the source of truth for navigation;
 *  `view` in the store is a cache kept in sync with the active route. */
export const VIEW_PATH: Record<View, string> = {
  chat: '/',
  today: '/today',
  tasks: '/tasks',
  artifacts: '/artifacts',
  research: '/research',
  settings: '/settings',
};

/** Label + test id for the sidebar's page-aware "new" button. Today / Settings
 *  have no "new" entity of their own, so they fall back to "new chat". */
export const NEW_ACTION: Record<View, { label: string; testid: string }> = {
  chat: { label: '新建对话', testid: 'new-chat-button' },
  today: { label: '新建对话', testid: 'new-chat-button' },
  tasks: { label: '新建任务', testid: 'new-task-button' },
  artifacts: { label: '新建 Artifact', testid: 'new-artifact-button' },
  research: { label: '新建研究', testid: 'new-research-button' },
  settings: { label: '新建对话', testid: 'new-chat-button' },
};

/** Resolve a pathname back to its view (unknown paths fall back to chat). */
export function viewFromPath(pathname: string): View {
  switch (pathname) {
    case '/today': return 'today';
    case '/tasks': return 'tasks';
    case '/artifacts': return 'artifacts';
    case '/research': return 'research';
    case '/settings': return 'settings';
    default: return 'chat';
  }
}

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
  /** Folded state of the QuickChat widget (a customer-service-style launcher
   *  bubble + popup). Folded by default: only the bubble shows; clicking it
   *  opens the popup, which then stays open until the bubble (or its close
   *  button) is clicked again — there is no auto-close on mouse leave. */
  rightCollapsed: boolean;
  pending: boolean;
  toasts: Toast[];
  justAddedTaskId: string | null;
  // global quick chat
  quickChatId: string | null;
  quickPending: boolean;
  quickCtx: ViewingContext | null;
  /** One-shot starter text injected into the chat composer by a page-specific
   *  "new" action (新建任务 / 新建 Artifact); the composer consumes and clears it. */
  composerSeed: string | null;
  /** Bridge to the router's navigate(), bound once by the app layout so store
   *  actions can change the URL — the source of truth for the current view. */
  _navigate: ((to: string) => void) | null;
  // artifacts (card decks generated from chat)
  artifacts: Artifact[];
  selectedArtifactId: string | null;
  artifactsLoading: boolean;
  /** A quick-launch shortcut is generating a deck (keeps the Artifacts page busy). */
  artifactGenerating: boolean;

  // server sync
  bootstrap: () => Promise<void>;

  // navigation
  /** Bind the router's navigate() (called once by the app layout). */
  bindNavigate: (fn: (to: string) => void) => void;
  /** Sync the cached `view` from the active route (called by the layout). */
  syncView: (view: View) => void;
  /** Open the settings page (its own route now, no longer a dialog). */
  openSettings: () => void;
  setSidebarMode: (m: SidebarMode) => void;
  setSideCollapsed: (v: boolean) => void;
  /** Open the sidebar temporarily (overlay peek) without changing the
   *  persistent collapse state. No-op when already pinned open. */
  peekSidebar: () => void;
  /** End a temporary peek (called when the pointer leaves the sidebar). */
  endPeek: () => void;
  /** Collapse / expand the docked right chat panel. */
  setRightCollapsed: (v: boolean) => void;
  setNotifOpen: (v: boolean) => void;
  toggleTopic: (id: string) => void;
  selectChat: (id: string) => void;
  newChat: () => void;
  /** Start a fresh chat seeded toward task creation (sidebar "新建任务"). */
  newTask: () => void;
  /** Start a fresh chat seeded toward artifact creation (sidebar "新建 Artifact"). */
  newArtifact: () => void;
  /** Page-aware "new" dispatch bound to the sidebar button + ⌘N: chat → new
   *  chat, tasks → new task, artifacts → new artifact, research → new research. */
  newForView: () => void;
  /** Clear the one-shot composer seed once the composer has consumed it. */
  clearComposerSeed: () => void;
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
  setQuickCtx: (ctx: ViewingContext | null) => void;
  openQuickInChat: () => void;

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
  rightCollapsed: true,
  pending: false,
  toasts: [],
  justAddedTaskId: null,
  quickChatId: null,
  quickPending: false,
  quickCtx: null,
  composerSeed: null,
  _navigate: null,
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

  bindNavigate: (fn) => set({ _navigate: fn }),
  syncView: (view) => { if (get().view !== view) set({ view }); },
  openSettings: () => { set({ notifOpen: false }); get()._navigate?.(VIEW_PATH.settings); },

  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  // Pinning or collapsing always ends any temporary peek.
  setSideCollapsed: (sideCollapsed) => set({ sideCollapsed, sidePeek: false }),
  peekSidebar: () => { if (get().sideCollapsed) set({ sidePeek: true }); },
  endPeek: () => { if (get().sidePeek) set({ sidePeek: false }); },
  setRightCollapsed: (rightCollapsed) => set({ rightCollapsed }),
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
      notifOpen: false,
      quickCtx: null,
    }));
    get()._navigate?.(VIEW_PATH.chat);
  },

  newChat: () => {
    set({ activeChatId: null, activeTopicId: null, notifOpen: false, quickCtx: null, composerSeed: null });
    get()._navigate?.(VIEW_PATH.chat);
  },

  // "新建任务" / "新建 Artifact" reuse the new-chat reset but seed the composer
  // with a starter prompt, dropping the user into a fresh chat already primed to
  // create that entity (both are produced by the chat agent's tools, not a form).
  newTask: () => {
    set({ activeChatId: null, activeTopicId: null, notifOpen: false, quickCtx: null, composerSeed: TASK_SEED });
    get()._navigate?.(VIEW_PATH.chat);
  },

  newArtifact: () => {
    set({ activeChatId: null, activeTopicId: null, notifOpen: false, quickCtx: null, composerSeed: ARTIFACT_SEED });
    get()._navigate?.(VIEW_PATH.chat);
  },

  clearComposerSeed: () => { if (get().composerSeed !== null) set({ composerSeed: null }); },

  // The sidebar "new" button and ⌘N adapt to the current page. Research keeps
  // its own welcome screen in a separate store, so we reset that directly; the
  // other entities all funnel through a seeded chat.
  newForView: () => {
    switch (get().view) {
      case 'tasks': get().newTask(); break;
      case 'artifacts': get().newArtifact(); break;
      case 'research': useResearchStore.getState().newResearch(); break;
      default: get().newChat(); break;
    }
  },

  // The sidebar "聊天" tile: just switch back to the chat view, keeping whatever
  // conversation is active (unlike newChat, which clears it).
  openChat: () => { set({ notifOpen: false }); get()._navigate?.(VIEW_PATH.chat); },

  openToday: () => { set({ notifOpen: false }); get()._navigate?.(VIEW_PATH.today); },

  openTasks: () => { set({ notifOpen: false }); get()._navigate?.(VIEW_PATH.tasks); },

  openResearch: () => { set({ notifOpen: false }); get()._navigate?.(VIEW_PATH.research); },

  focusItem: (id) => set((s) => ({ focusItemId: id, focusItemTick: s.focusItemTick + 1 })),

  // Open the Artifacts page; optionally focus a specific artifact. Always
  // refreshes the list so a just-created artifact shows up.
  openArtifacts: (id) => {
    set((s) => ({
      notifOpen: false,
      selectedArtifactId: id ?? s.selectedArtifactId,
    }));
    get()._navigate?.(VIEW_PATH.artifacts);
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
    set({ artifactGenerating: true, notifOpen: false });
    get()._navigate?.(VIEW_PATH.artifacts);
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
  backToChat: () => { set({ quickCtx: null }); get()._navigate?.(VIEW_PATH.chat); },

  openUpdateInChat: (u) => {
    set({ notifOpen: false, quickCtx: null });
    get().selectChat(UPDATE_TO_CHAT[u.topicId] ?? 'c_gold_today');
  },

  send: async (text) => {
    if (!text.trim()) return;
    const s = get();
    let chatId = s.activeChatId;
    const userMessageId = nextId();
    const patch: Partial<AppState> = { notifOpen: false, pending: true };

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
    get()._navigate?.(VIEW_PATH.chat);

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
    const patch: Partial<AppState> = { quickPending: true };
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

  setQuickCtx: (quickCtx) => set({ quickCtx }),

  openQuickInChat: () => {
    const s = get();
    if (!s.quickChatId) return;
    set({
      activeChatId: s.quickChatId,
      activeTopicId: s.sessionMeta[s.quickChatId]?.topicId ?? s.quickCtx?.topicId ?? 'gold',
      notifOpen: false,
      quickCtx: null,
    });
    get()._navigate?.(VIEW_PATH.chat);
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
