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
// cards.
import { create } from 'zustand';
import type {
  AiMessage, ChatMessage, ChatMeta, SessionMeta, Task, TaskSuggestion, Toast,
  UpdateItem, ViewingContext,
} from '../types';
import type { Artifact, ArtifactRef } from '../artifacts/types';
import { apiClient } from '../lib/api-client';
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

/** The quick-chat context the user always has on each surface: `label` is the
 *  always-present page name shown in the "正在看 · …" chip, and `agent` is the
 *  phrasing sent to the model so it knows which page the user is on. `null` for
 *  surfaces where the quick chat isn't rendered (chat / settings). On Today the
 *  in-view article (`quickCtx`) layers on top of this page baseline. */
export const VIEW_CONTEXT: Record<View, { label: string; agent: string } | null> = {
  chat: null,
  settings: null,
  today: { label: '今日事项', agent: '「今日事项」阅读页（资讯 / 更新列表）' },
  tasks: { label: '任务', agent: '「任务」页（用户正在盯的事项列表）' },
  artifacts: { label: 'Artifacts', agent: '「Artifacts」卡片库页（已生成的卡片合集）' },
  research: { label: '研究画布', agent: '「研究画布」页（研究项目 / 大纲）' },
};

/** Resolve a pathname back to its view (unknown paths fall back to chat).
 *  Note: the multi-model compare surface lives at `/?compare=1` (same path as
 *  chat) — it is a feature of the chat page, so it resolves to `'chat'` here. */
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

/** Per-chat pagination metadata from the bootstrap response. */
interface ChatPagination {
  hasMore: boolean;
  /** Opaque cursor string (format: "<created_at>_<id>") for the oldest loaded message. */
  oldestCursor: string | null;
}

/** Server payload of GET /api/bootstrap. */
interface BootstrapData {
  chats: ChatMeta[];
  conversations: Record<string, ChatMessage[]>;
  /** Per-chat pagination flags (hasMore + oldestCursor). Present from bootstrap v2. */
  pagination?: Record<string, ChatPagination>;
  tasks: Task[];
  updates: UpdateItem[];
  /** Whether the signed-in user has already completed (or skipped) the
   *  first-run onboarding flow. Always true for anon visitors. */
  onboardingDone?: boolean;
}

/** Response of GET /api/chats/:id/messages. */
interface OlderMessagesData {
  messages: ChatMessage[];
  hasMore: boolean;
  oldestCursor: string | null;
}

interface AppState {
  view: View;
  sidebarMode: SidebarMode;
  activeChatId: string | null;
  activeTopicId: string | null;
  chats: ChatMeta[];
  convos: Record<string, ChatMessage[]>;
  /**
   * Per-chat pagination state. `hasMore` indicates earlier messages exist.
   * `oldestCursor` is the opaque cursor to pass as `?before=` to the load-older endpoint.
   * `loading` is true while a load-older request is in flight for that chat.
   */
  convoPagination: Record<string, { hasMore: boolean; oldestCursor: string | null; loading: boolean }>;
  sessionMeta: Record<string, SessionMeta>;
  tasks: Task[];
  createdTaskIds: string[];
  updates: UpdateItem[];
  /** True once the first-run onboarding flow has been completed or skipped.
   *  Initialized from the bootstrap response; persisted via POST /api/onboarding/done. */
  onboardingDone: boolean;
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
  /** Mobile-only: true when the off-canvas sidebar drawer is slid open.
   *  Drives the `.mobile-nav-open` class on `.nb-app` (see mobile.css). */
  mobileNavOpen: boolean;
  /** Folded state of the QuickChat widget (a customer-service-style launcher
   *  bubble + popup). Folded by default: only the bubble shows; clicking it
   *  opens the popup, which then stays open until the bubble (or its close
   *  button) is clicked again — there is no auto-close on mouse leave. */
  rightCollapsed: boolean;
  /** The thinking indicator: true only between send and the first reply token. */
  pending: boolean;
  /** A streaming reply is in flight (send → final/error/stop). Drives the
   *  composer's stop button — unlike `pending`, it stays true while tokens
   *  stream, which is exactly when the user wants to interrupt. */
  generating: boolean;
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
  /**
   * Load the previous page of messages for one chat (scroll-to-top trigger).
   * Prepends the older messages to the conversation without jumping the scroll
   * position (the caller preserves scroll offset). No-ops when already loading
   * or when hasMore is false.
   */
  loadOlderMessages: (chatId: string) => Promise<void>;

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
  /** Toggle (or set) the mobile off-canvas drawer. */
  setMobileNavOpen: (v: boolean) => void;
  /** Collapse / expand the docked right chat panel. */
  setRightCollapsed: (v: boolean) => void;
  setNotifOpen: (v: boolean) => void;
  toggleTopic: (id: string) => void;
  selectChat: (id: string) => void;
  newChat: () => void;
  /** Start a fresh chat seeded toward task creation (sidebar "新建任务"). */
  newTask: () => void;
  /** Start a fresh chat seeded with the user's own sentence, ready to compile a
   *  task from it ("对话即配置" — the Tasks-page create bar). */
  composeTask: (text: string) => void;
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
  /** Select an artifact (open its detail), or pass null to clear (back to the
   *  gallery). The Artifacts page mirrors this to the URL `artifact` param. */
  selectArtifact: (id: string | null) => void;
  deleteArtifact: (id: string) => void;
  /** Toggle the favorited flag on one artifact (the "你收藏的" tab). */
  toggleFavorite: (id: string) => void;
  /** Run a canned prompt to generate a deck, staying on the Artifacts page. */
  runArtifactShortcut: (prompt: string) => Promise<void>;
  setTodayFilter: (f: string) => void;
  setTasksFilter: (f: string) => void;
  backToChat: () => void;
  openUpdateInChat: (u: UpdateItem) => void;

  // chat
  send: (text: string) => void;
  /** Stop the in-flight streaming reply: aborts the request (the worker stops
   *  generating too) and keeps whatever has streamed so far as the final bubble. */
  stopGeneration: () => void;

  // quick chat
  sendQuick: (text: string) => void;
  setQuickCtx: (ctx: ViewingContext | null) => void;
  openQuickInChat: () => void;

  // onboarding
  /** Mark the first-run onboarding as complete (persists to the server). */
  markOnboardingDone: () => Promise<void>;

  // tasks
  createTask: (data: TaskSuggestion) => void;
  toggleTask: (id: string) => void;
  /** Permanently delete a task (optimistic, rolls back on failure). */
  deleteTask: (id: string) => void;

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
    ctxPage?: string | null;
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

/** Apply a fn to one chat's message list (immutably). */
function patchConvo(
  set: (fn: (s: AppState) => Partial<AppState>) => void,
  chatId: string,
  fn: (msgs: ChatMessage[]) => ChatMessage[],
): void {
  set((st) => ({ convos: { ...st.convos, [chatId]: fn(st.convos[chatId] ?? []) } }));
}

/** Result of an aborted (user-stopped) stream — distinct from success/failure. */
type StreamAborted = { aborted: true };

/** The controller for the single in-flight main-chat stream, so `stopGeneration`
 *  can cancel it from anywhere. Only the main chat streams, so one slot suffices. */
let activeStreamController: AbortController | null = null;

/**
 * Streaming variant of {@link deliverMessage} for the main chat: POSTs to
 * /api/messages/stream and consumes the SSE response, growing one AI message
 * token by token (live typewriter), then replacing it with the authoritative
 * persisted message on the `final` event. Clears `pending` as soon as the
 * first token (or the final reply) arrives. Returns null on transport/stream
 * failure (the placeholder is removed so a failed turn leaves no empty bubble),
 * or `{ aborted: true }` when the user pressed stop — in which case whatever has
 * streamed so far is kept as a finalized bubble (not discarded).
 */
async function deliverMessageStream(
  set: (fn: (s: AppState) => Partial<AppState>) => void,
  args: {
    chatId: string; userMessageId: string; title?: string;
    text: string; ctxTitle?: string | null; ctxTopicId?: string | null;
  },
): Promise<{ topicId: string; artifacts?: ArtifactRef[] } | StreamAborted | null> {
  // The placeholder is created lazily on the first token so the thinking
  // indicator (pending) stays up until the reply actually starts.
  let placeholderId: string | null = null;
  let acc = '';

  // Coalesce token updates to one render per frame: tokens can arrive faster
  // than the browser paints, and each update reflows the markdown.
  const canRaf = typeof requestAnimationFrame === 'function';
  let rafQueued = false;
  const flush = () => {
    rafQueued = false;
    if (!placeholderId) return;
    patchConvo(set, args.chatId, (msgs) =>
      msgs.map((m) => (m.id === placeholderId ? { ...(m as AiMessage), md: acc } : m)),
    );
  };
  const scheduleFlush = () => {
    if (!canRaf) { flush(); return; }
    if (!rafQueued) { rafQueued = true; requestAnimationFrame(flush); }
  };

  // One controller per stream; `stopGeneration` aborts it. Aborting the fetch
  // closes the connection, which the worker observes (via the request signal) to
  // stop generating server-side too.
  const controller = new AbortController();
  activeStreamController = controller;

  try {
    const res = await fetch('/api/messages/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(args),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalData: { topicId: string; aiMessage: AiMessage } | null = null;
    let streamError: string | null = null;

    const handleFrame = (frame: string) => {
      let event = 'message';
      const dataParts: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataParts.push(line.slice(5).trim());
      }
      const data = dataParts.join('');
      if (!data) return;
      if (event === 'token') {
        try {
          acc += JSON.parse(data) as string;
        } catch { return; }
        if (!placeholderId) {
          // First token: drop the thinking indicator and insert the bubble.
          placeholderId = nextId('m');
          const placeholder: AiMessage = {
            id: placeholderId, role: 'ai', md: acc, paras: [], streaming: true,
          };
          set((st) => ({
            pending: false,
            convos: {
              ...st.convos,
              [args.chatId]: [...(st.convos[args.chatId] ?? []), placeholder],
            },
          }));
        } else {
          scheduleFlush();
        }
      } else if (event === 'final') {
        try { finalData = JSON.parse(data) as { topicId: string; aiMessage: AiMessage }; }
        catch { streamError = 'Malformed final payload'; }
      } else if (event === 'error') {
        try { streamError = JSON.parse(data) as string; } catch { streamError = data; }
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        if (frame.trim()) handleFrame(frame);
      }
    }
    if (buffer.trim()) handleFrame(buffer);
    flush(); // land the last partial before the swap-in

    if (streamError) throw new Error(streamError);
    if (!finalData) throw new Error('stream ended without a final reply');
    const final = finalData as { topicId: string; aiMessage: AiMessage };

    set((st) => {
      const msgs = st.convos[args.chatId] ?? [];
      const next = placeholderId
        ? msgs.map((m) => (m.id === placeholderId ? final.aiMessage : m))
        : [...msgs, final.aiMessage];
      return {
        pending: false,
        sessionMeta: st.sessionMeta[args.chatId]
          ? { ...st.sessionMeta, [args.chatId]: { ...st.sessionMeta[args.chatId], topicId: final.topicId } }
          : st.sessionMeta,
        convos: { ...st.convos, [args.chatId]: next },
      };
    });
    return { topicId: final.topicId, artifacts: final.aiMessage.artifacts };
  } catch (error) {
    // User pressed stop: keep whatever streamed so far as a finalized bubble
    // (the worker also persists the partial reply), rather than discarding it.
    if (controller.signal.aborted) {
      if (placeholderId) {
        const id = placeholderId;
        patchConvo(set, args.chatId, (msgs) =>
          msgs.map((m) => (m.id === id ? { ...(m as AiMessage), md: acc, streaming: false } : m)),
        );
      }
      return { aborted: true };
    }
    console.error('[send] stream failed:', String(error));
    if (placeholderId) {
      const id = placeholderId;
      patchConvo(set, args.chatId, (msgs) => msgs.filter((m) => m.id !== id));
    }
    return null;
  } finally {
    // The stream is over (success / error / stop): drop the generating flag so
    // the composer reverts to a send button, and release the controller slot so
    // a later send/stop targets the next stream, not this one.
    set(() => ({ generating: false }));
    if (activeStreamController === controller) activeStreamController = null;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'chat',
  sidebarMode: 'history',
  activeChatId: null,
  activeTopicId: null,
  chats: [],
  convos: {},
  convoPagination: {},
  sessionMeta: {},
  tasks: [],
  createdTaskIds: [],
  updates: [],
  onboardingDone: true, // safe default: don't flash onboarding before bootstrap
  todayFilter: 'all',
  tasksFilter: 'all',
  focusItemId: null,
  focusItemTick: 0,
  openTopics: [],
  notifOpen: false,
  sideCollapsed: false,
  sidePeek: false,
  mobileNavOpen: false,
  rightCollapsed: true,
  pending: false,
  generating: false,
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
        `${data.chats.length} chats, ${data.tasks.length} tasks, ${data.updates.length} updates, onboardingDone=${data.onboardingDone}`,
      );

      // Build convoPagination from the server's per-chat pagination metadata.
      // Adds a `loading: false` sentinel so the type is always complete.
      const convoPagination: AppState['convoPagination'] = {};
      if (data.pagination) {
        for (const [chatId, p] of Object.entries(data.pagination)) {
          convoPagination[chatId] = { hasMore: p.hasMore, oldestCursor: p.oldestCursor, loading: false };
        }
      }

      set({
        chats: data.chats,
        convos: data.conversations,
        convoPagination,
        tasks: data.tasks,
        updates: data.updates,
        // Fall back to true (don't show onboarding) when the field is absent
        // (e.g. before migration 0017 is applied to the deployed database).
        onboardingDone: data.onboardingDone ?? true,
      });
    } catch (error) {
      // The store stays empty; the user can retry by reloading.
      console.error('[bootstrap] failed:', String(error));
      get().toast('服务器连接失败，请稍后重试');
    }
  },

  loadOlderMessages: async (chatId) => {
    const pag = get().convoPagination[chatId];
    // Guard: nothing to load, or already in flight.
    if (!pag || !pag.hasMore || pag.loading || pag.oldestCursor === null) return;

    // Mark loading for this chat.
    set((s) => ({
      convoPagination: {
        ...s.convoPagination,
        [chatId]: { ...s.convoPagination[chatId], loading: true },
      },
    }));

    try {
      const url = `/api/chats/${encodeURIComponent(chatId)}/messages?before=${encodeURIComponent(pag.oldestCursor)}`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as OlderMessagesData;

      set((s) => {
        const existing = s.convos[chatId] ?? [];
        // Deduplicate: older messages should never overlap, but guard anyway.
        const existingIds = new Set(existing.map((m) => m.id));
        const fresh = data.messages.filter((m) => !existingIds.has(m.id));
        return {
          convos: {
            ...s.convos,
            [chatId]: [...fresh, ...existing],
          },
          convoPagination: {
            ...s.convoPagination,
            [chatId]: {
              hasMore: data.hasMore,
              oldestCursor: data.oldestCursor,
              loading: false,
            },
          },
        };
      });
    } catch (error) {
      console.error('[loadOlderMessages] failed:', String(error));
      // Clear loading flag; preserve hasMore so the user can retry.
      set((s) => ({
        convoPagination: {
          ...s.convoPagination,
          [chatId]: { ...s.convoPagination[chatId], loading: false },
        },
      }));
    }
  },

  bindNavigate: (fn) => set({ _navigate: fn }),
  syncView: (view) => { if (get().view !== view) set({ view }); },
  openSettings: () => { set({ notifOpen: false, mobileNavOpen: false }); get()._navigate?.(VIEW_PATH.settings); },

  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  // Pinning or collapsing always ends any temporary peek.
  setSideCollapsed: (sideCollapsed) => set({ sideCollapsed, sidePeek: false }),
  peekSidebar: () => { if (get().sideCollapsed) set({ sidePeek: true }); },
  endPeek: () => { if (get().sidePeek) set({ sidePeek: false }); },
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
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
      mobileNavOpen: false,
    }));
    get()._navigate?.(VIEW_PATH.chat);
  },

  newChat: () => {
    set({ activeChatId: null, activeTopicId: null, notifOpen: false, quickCtx: null, composerSeed: null, mobileNavOpen: false });
    get()._navigate?.(VIEW_PATH.chat);
  },

  // "新建任务" / "新建 Artifact" reuse the new-chat reset but seed the composer
  // with a starter prompt, dropping the user into a fresh chat already primed to
  // create that entity (both are produced by the chat agent's tools, not a form).
  newTask: () => {
    set({ activeChatId: null, activeTopicId: null, notifOpen: false, quickCtx: null, composerSeed: TASK_SEED, mobileNavOpen: false });
    get()._navigate?.(VIEW_PATH.chat);
  },

  newArtifact: () => {
    set({ activeChatId: null, activeTopicId: null, notifOpen: false, quickCtx: null, composerSeed: ARTIFACT_SEED, mobileNavOpen: false });
    get()._navigate?.(VIEW_PATH.chat);
  },

  // The Tasks-page create bar: drop the user into a fresh chat with their own
  // sentence prefilled, so the agent compiles the trigger rule from it. Falls
  // back to the generic task seed when the text is blank.
  composeTask: (text) => {
    const seed = text.trim() ? text.trim() : TASK_SEED;
    set({ activeChatId: null, activeTopicId: null, notifOpen: false, quickCtx: null, composerSeed: seed, mobileNavOpen: false });
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
  openChat: () => { set({ notifOpen: false, mobileNavOpen: false }); get()._navigate?.(VIEW_PATH.chat); },

  openToday: () => { set({ notifOpen: false, mobileNavOpen: false }); get()._navigate?.(VIEW_PATH.today); },

  openTasks: () => { set({ notifOpen: false, mobileNavOpen: false }); get()._navigate?.(VIEW_PATH.tasks); },

  openResearch: () => { set({ notifOpen: false, mobileNavOpen: false }); get()._navigate?.(VIEW_PATH.research); },

  focusItem: (id) => set((s) => ({ focusItemId: id, focusItemTick: s.focusItemTick + 1 })),

  // Open the Artifacts page. With an id (e.g. a chat artifact-ref click), focus
  // that artifact's detail; without one (the sidebar nav tile), land on the
  // gallery by clearing any prior selection. Always refreshes the list so a
  // just-created artifact shows up.
  openArtifacts: (id) => {
    set({ notifOpen: false, selectedArtifactId: id ?? null, mobileNavOpen: false });
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
        // Keep an existing selection only if it still exists; otherwise stay on
        // the gallery (no auto-open of a detail — the page lands on the tabs).
        selectedArtifactId:
          s.selectedArtifactId && data.artifacts.some((a) => a.id === s.selectedArtifactId)
            ? s.selectedArtifactId
            : null,
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

  // Optimistically flip the favorite flag, then persist the desired value (the
  // endpoint is idempotent, so we send the target state, not a toggle command).
  toggleFavorite: async (id) => {
    const prev = get().artifacts;
    const target = prev.find((a) => a.id === id);
    if (!target) return;
    const next = !target.favorited;
    set((s) => ({
      artifacts: s.artifacts.map((a) => (a.id === id ? { ...a, favorited: next } : a)),
    }));
    try {
      const res = await apiClient.artifacts[':id'].favorite.$post({
        param: { id },
        json: { favorited: next },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error('[artifacts] favorite failed:', String(error));
      set({ artifacts: prev });
      get().toast('操作失败，请重试');
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
        get().toast(`已创建 · ${created.title}`);
      } else {
        set({ artifactGenerating: false });
        get().toast('这次没有创建数据视图，换个说法再试试');
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

  // Open the conversation behind a Today/notification update: jump to the most
  // recent chat on the same topic, or start a fresh chat if none exists yet.
  openUpdateInChat: (u) => {
    set({ notifOpen: false, quickCtx: null });
    const chat = get().chats.find((c) => c.topicId === u.topicId);
    if (chat) get().selectChat(chat.id);
    else get().newChat();
  },

  send: async (text) => {
    if (!text.trim()) return;
    const s = get();
    let chatId = s.activeChatId;
    const userMessageId = nextId();
    const patch: Partial<AppState> = { notifOpen: false, pending: true, generating: true };

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

    const result = await deliverMessageStream(set, {
      chatId, userMessageId, title: truncateTitle(text), text,
    }).catch((error) => {
      console.error('[send] network error:', String(error));
      return null;
    });
    if (result && 'topicId' in result) {
      set({ activeTopicId: result.topicId, pending: false });
      // A reply that produced card artifacts: refresh the Artifacts page list
      // so the new deck is there, and nudge the user toward it.
      if (result.artifacts?.length) {
        void get().loadArtifacts();
        get().toast(`已生成卡片 · ${result.artifacts[0].title}`);
      }
    } else if (result && 'aborted' in result) {
      // User stopped: pending was already cleared by stopGeneration and the
      // partial reply is kept — nothing more to do, and no failure toast.
    } else {
      set({ pending: false });
      get().toast('发送失败，请稍后重试');
    }
  },

  stopGeneration: () => {
    if (!activeStreamController) return;
    activeStreamController.abort();
    // Revert the composer + drop the thinking indicator immediately;
    // deliverMessageStream's abort path finalizes any partial bubble.
    set({ pending: false, generating: false });
  },

  sendQuick: async (text) => {
    if (!text.trim()) return;
    const s = get();

    // On the research canvas (with an open project) the quick chat is research-
    // aware: the question becomes a new node at the very TOP of the canvas +
    // sidebar outline, its article streams as the answer, and the SAME answer is
    // mirrored here into the popup bubble. The node carries the grounding (it
    // reads whatever node the user is currently viewing) — see askOnCanvas.
    // While the initial outline is still generating we fall back to the generic
    // quick chat: startResearch replaces nodes/order wholesale when the outline
    // lands, which would otherwise clobber a node added mid-generation.
    const research = useResearchStore.getState();
    if (
      s.view === 'research' &&
      research.phase === 'canvas' &&
      !research.generating &&
      research.order.length > 0
    ) {
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
      const chatId = id;

      // Mirror the node's streamed article into a popup bubble, created lazily on
      // the first token so the thinking indicator stays up until the answer
      // actually starts (matches the main chat stream).
      let placeholderId: string | null = null;
      const onContent = (partial: string) => {
        if (!placeholderId) {
          placeholderId = nextId('m');
          const ph: AiMessage = { id: placeholderId, role: 'ai', md: partial, paras: [], streaming: true };
          set((st) => ({
            quickPending: false,
            convos: { ...st.convos, [chatId]: [...(st.convos[chatId] ?? []), ph] },
          }));
        } else {
          patchConvo(set, chatId, (msgs) =>
            msgs.map((m) => (m.id === placeholderId ? { ...(m as AiMessage), md: partial } : m)),
          );
        }
      };

      const res = await useResearchStore.getState().askOnCanvas(text.trim(), onContent);
      set({ quickPending: false });
      if (res && placeholderId) {
        patchConvo(set, chatId, (msgs) =>
          msgs.map((m) => (m.id === placeholderId ? { ...(m as AiMessage), md: res.content, streaming: false } : m)),
        );
      } else if (!res) {
        const failMd = '抱歉，这条没能生成出来，请稍后再试。';
        if (placeholderId) {
          patchConvo(set, chatId, (msgs) =>
            msgs.map((m) => (m.id === placeholderId ? { ...(m as AiMessage), md: failMd, streaming: false } : m)),
          );
        } else {
          patchConvo(set, chatId, (msgs) => [
            ...msgs,
            { id: nextId('m'), role: 'ai', md: failMd, paras: [] } as AiMessage,
          ]);
        }
        get().toast('生成失败，请稍后重试');
      }
      return;
    }

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
      // The page the user is on always travels with the message — so the model
      // knows the surface (today / tasks / research / …), not just the article.
      ctxPage: VIEW_CONTEXT[s.view]?.agent ?? null,
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

  deleteTask: async (id) => {
    const prevTasks = get().tasks;
    const removed = prevTasks.find((t) => t.id === id);
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      createdTaskIds: s.createdTaskIds.filter((x) => x !== id),
    }));
    get().toast(removed ? `已删除 · ${removed.title}` : '任务已删除');
    try {
      const res = await apiClient.tasks[':id'].$delete({ param: { id } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error('[deleteTask] persist failed:', String(error));
      set({ tasks: prevTasks });
      get().toast('删除失败，请重试');
    }
  },

  markOnboardingDone: async () => {
    // Optimistically flip the flag so the UI hides immediately.
    set({ onboardingDone: true });
    try {
      // Hono RPC does not expose the onboarding route in the typed client yet;
      // use a plain fetch so we don't need to restart the dev server.
      await fetch('/api/onboarding/done', { method: 'POST', credentials: 'same-origin' });
    } catch (error) {
      // Non-critical: the flag will be restored to true from the server on the
      // next bootstrap, so no rollback is needed — just log the failure.
      console.error('[onboarding] persist failed:', String(error));
    }
  },

  toast: (text) => {
    const id = nextId('toast');
    set((s) => ({ toasts: [...s.toasts, { id, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), TOAST_DURATION_MS);
  },
}));
