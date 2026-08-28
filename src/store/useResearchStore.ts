// Research Canvas state — a dedicated zustand store for the research view, kept
// separate from useAppStore so the (large) canvas state doesn't bloat the main
// app store. Owns: the current project's node map, generation lifecycle, the
// reading overlay selection, and snapshot persistence through the typed RPC.
//
// Data flow mirrors useAppStore: optimistic node creation on the canvas, AI
// fills content in the background, snapshots persist (debounced) to D1 with a
// same-browser localStorage cache so a deep link still opens if the remote
// write has not landed yet.

import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { nextId } from "../data/ids";
import { useResearchPrefs } from "./useResearchPrefs";
import { extractStreamingContent } from "../research/streaming";
import {
  cacheSnapshot,
  isResearchSnapshot,
  listCachedProjects,
  loadCachedSnapshot,
  mergeProjectLists,
  newerSnapshot,
} from "../research/snapshot-cache";
import type { ResearchGenerationTrace } from "../research/generation-trace";
import type {
  ResearchGenerationResult,
  ResearchNode,
  ResearchOutlineItem,
  ResearchProjectMeta,
  ResearchQnaTurn,
  ResearchSnapshot,
} from "../research/types";

type Phase = "welcome" | "canvas";

interface ResearchState {
  phase: Phase;
  projectId: string | null;
  title: string;
  topic: string;
  nodes: Record<string, ResearchNode>;
  order: string[];
  activeNodeId: string | null;
  /** True while the initial outline is being generated. */
  generating: boolean;
  /** Saved projects for the sidebar list. */
  projects: ResearchProjectMeta[];
  error: string | null;
  /** True while a deep-link / sidebar `loadProject` request is in flight. */
  loadingProject: boolean;
  /** Transient purple-border highlight on the canvas project banner. Turned on
   *  ONLY by clicking a project in the sidebar list; any other interaction
   *  (opening a node, loading/creating a project, clicking the canvas) clears it. */
  projectHighlighted: boolean;
  /** Card lit on the canvas. Unlike `activeNodeId` it does NOT clear when the
   *  reading overlay closes — it persists until the user presses blank canvas
   *  (clearNodeHighlight) or opens another node (which moves it). */
  highlightedNodeId: string | null;
  /** In-session generation traces for debugging, keyed by the id of the node
   *  they produced: the root node's id holds the outline-generation trace; a
   *  concept node's id holds its article-generation trace. Not persisted in the
   *  D1 snapshot (it would bloat it); cleared when the project changes. */
  traces: Record<string, ResearchGenerationTrace>;

  listProjects: () => Promise<void>;
  startResearch: (topic: string) => Promise<void>;
  openNode: (id: string) => Promise<void>;
  growChild: (
    parentId: string,
    opts: { question?: string; focusTerm?: string; focusParagraph?: string },
  ) => Promise<void>;
  /** Ask a custom follow-up answered inline (chat-style) below the node's article. */
  askInReading: (nodeId: string, question: string) => Promise<void>;
  /**
   * Ask a question from the canvas quick-chat. Spawns a NEW node from the
   * question and inserts it at the very top of the outline (the first child of
   * the root), so it leads both the canvas and the sidebar tree. The answer
   * streams in as that node's article and is mirrored to `onContent` so the
   * quick-chat popup shows the same answer. Grounded in whatever node the user
   * is currently viewing. Returns the final article text (null on failure) so
   * the caller can finalize its popup bubble. No-ops (returns null) when no
   * project is open.
   */
  askOnCanvas: (
    question: string,
    onContent?: (partial: string) => void,
  ) => Promise<{ content: string } | null>;
  closeReading: () => void;
  /**
   * Load a project; optionally open `openNodeId`'s reading overlay (deep link).
   * Returns whether the snapshot actually landed — callers that highlight the
   * canvas banner must not run on a 404 / transport failure.
   */
  loadProject: (id: string, openNodeId?: string) => Promise<boolean>;
  /**
   * Re-run outline generation for the open project. Used when a deep link
   * reopens a stub whose outline never finished, and by the in-place retry
   * control after a failed run. No-ops while an outline run is already in flight.
   */
  retryOutline: () => Promise<void>;
  newResearch: () => void;
  /** Highlight the open project's banner on the canvas (sidebar selection). */
  highlightProject: () => void;
  /** Drop the project-banner highlight. */
  clearProjectHighlight: () => void;
  /** Drop the canvas node highlight (a press on blank canvas). */
  clearNodeHighlight: () => void;
}

/** Recursively flatten an outline tree into canvas nodes under `parentId`. */
function outlineToNodes(
  items: ResearchOutlineItem[],
  parentId: string,
  depth: number,
  nodes: Record<string, ResearchNode>,
  order: string[],
): void {
  for (const item of items) {
    const id = nextId("rn");
    nodes[id] = {
      id,
      parentId,
      depth,
      title: item.title,
      brief: item.brief,
      tags: item.tags,
      status: "ready",
      needsContent: true,
    };
    order.push(id);
    if (item.children?.length) {
      outlineToNodes(item.children, id, depth + 1, nodes, order);
    }
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_RETRY_MS = [0, 1500, 4000];
/** Outline can take one model call + one repair (each up to 150s). Abort a
 *  hung client wait a bit after that so the skeleton cannot last forever. */
const OUTLINE_CLIENT_TIMEOUT_MS = 330_000;
/** Bumped on every outline run so a stale in-flight result cannot land on a
 *  project the user has already left (or on a newer retry of the same one). */
let outlineEpoch = 0;
/** Aborts the in-flight outline stream when the user leaves or retries. */
let outlineAbort: AbortController | null = null;

function bumpOutlineEpoch(): void {
  outlineEpoch += 1;
  outlineAbort?.abort();
  outlineAbort = null;
}

/** True when the snapshot is only a root stub whose outline never landed —
 *  `status: "loading"` mid-generation, or `"failed"` after a dead run. Loading
 *  that stub must resume generation; otherwise the canvas skeleton hangs forever. */
function outlineIsIncomplete(snap: Pick<ResearchSnapshot, "nodes" | "order">): boolean {
  const rootId = snap.order[0];
  const root = rootId ? snap.nodes[rootId] : undefined;
  if (!root) return false;
  const hasChildren = snap.order.some((id) => snap.nodes[id]?.parentId === rootId);
  if (hasChildren) return false;
  return root.status === "loading" || root.status === "failed";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useResearchStore = create<ResearchState>((set, get) => {
  function currentSnapshot(): ResearchSnapshot | null {
    const s = get();
    if (!s.projectId) return null;
    return {
      projectId: s.projectId,
      title: s.title,
      topic: s.topic,
      nodes: s.nodes,
      order: s.order,
      updatedAt: new Date().toISOString(),
    };
  }

  /** Cache immediately, then debounce the D1 POST (with retries). */
  function schedulePersist() {
    const snap = currentSnapshot();
    if (snap) cacheSnapshot(snap);
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => void persistNow(), 800);
  }

  async function persistNow() {
    const snapshot = currentSnapshot();
    if (!snapshot) return;
    cacheSnapshot(snapshot);
    const projectId = snapshot.projectId;
    for (const delay of PERSIST_RETRY_MS) {
      if (delay) await sleep(delay);
      const latest = currentSnapshot();
      if (!latest || latest.projectId !== projectId) return;
      cacheSnapshot(latest);
      try {
        const res = await apiClient.research.snapshots.$post({ json: latest });
        if (res.ok) return;
        throw new Error(`HTTP ${res.status}`);
      } catch (error) {
        console.error("[research] persist failed:", String(error));
      }
    }
  }

  function applyLoadedSnapshot(snap: ResearchSnapshot, openNodeId?: string): void {
    // Drop any in-flight outline for a previous project before hydrating.
    bumpOutlineEpoch();
    const willOpen = openNodeId && snap.nodes[openNodeId] ? openNodeId : null;
    const resumeOutline = outlineIsIncomplete(snap);
    const nodes = resumeOutline
      ? {
          ...snap.nodes,
          [snap.order[0]]: { ...snap.nodes[snap.order[0]], status: "loading" as const },
        }
      : snap.nodes;
    set({
      phase: "canvas",
      projectId: snap.projectId,
      title: snap.title,
      topic: snap.topic,
      nodes,
      order: snap.order,
      activeNodeId: willOpen,
      generating: resumeOutline,
      error: null,
      loadingProject: false,
      projectHighlighted: false,
      highlightedNodeId: willOpen,
      traces: {},
    });
    if (willOpen && !resumeOutline) void get().openNode(willOpen);
    // Resume in-place — do not go through retryOutline, whose in-flight guard
    // would no-op because we just set generating + status:"loading".
    if (resumeOutline) {
      console.error("[research] loadProject: incomplete outline, resuming", snap.projectId);
      void runOutlineGeneration();
    }
  }

  /**
   * Drive one outline run for the currently open project. Streams so the
   * Worker stays alive through a long model call; a stale epoch (user left, or
   * a newer retry started) discards the result instead of writing it back.
   */
  async function runOutlineGeneration(): Promise<void> {
    bumpOutlineEpoch();
    const epoch = outlineEpoch;
    const s = get();
    const rootId = s.order[0];
    const topic = s.topic;
    if (!rootId || !topic) return;

    const controller = new AbortController();
    outlineAbort = controller;
    const timeoutId = setTimeout(() => controller.abort(), OUTLINE_CLIENT_TIMEOUT_MS);
    const { result, trace } = await generateContentStream(
      { topic, generationMode: "outline" },
      () => {},
      controller.signal,
    );
    clearTimeout(timeoutId);
    if (outlineAbort === controller) outlineAbort = null;
    if (epoch !== outlineEpoch || get().projectId !== s.projectId) return;

    if (trace) set((st) => ({ traces: { ...st.traces, [rootId]: trace } }));
    if (!result || !result.outline?.length) {
      const reason = result
        ? "empty outline"
        : controller.signal.aborted
          ? "client timeout"
          : "transport or stream error";
      console.error("[research] outline generation failed:", reason);
      set((st) => {
        const root = st.nodes[rootId];
        if (!root) return { generating: false };
        return {
          generating: false,
          error: null,
          nodes: { ...st.nodes, [rootId]: { ...root, status: "failed" } },
        };
      });
      schedulePersist();
      return;
    }

    const root = get().nodes[rootId];
    if (!root) return;
    const nodes: Record<string, ResearchNode> = {
      [rootId]: {
        ...root,
        status: "ready",
        questions: result.questions,
        tags: result.tags,
      },
    };
    const order = [rootId];
    outlineToNodes(result.outline, rootId, 1, nodes, order);
    set({ nodes, order, generating: false, error: null });
    schedulePersist();
  }

  /**
   * Stream a generation (content or outline). For content mode, `onContent` is
   * called with the article body decoded so far on every token (the reading
   * overlay typewriter). Outline mode ignores tokens and waits for `final` —
   * streaming still keeps the Worker alive through a long model call. Resolves
   * with the validated result once `final` arrives; null on transport/stream
   * error. A `start` SSE frame (no payload the client needs) is ignored.
   */
  async function generateContentStream(
    body: {
      topic: string;
      question?: string;
      context?: string;
      focusTerm?: string;
      focusParagraph?: string;
      generationMode?: "outline" | "content";
    },
    onContent: (partial: string) => void,
    signal?: AbortSignal,
  ): Promise<{ result: ResearchGenerationResult | null; trace: ResearchGenerationTrace | null }> {
    try {
      // Apply the user's chosen reply style (科普 / 专业 / 简练) to every request.
      const style = useResearchPrefs.getState().replyStyle;
      const generationMode = body.generationMode ?? "content";
      const res = await fetch("/api/research/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...body, generationMode, style }),
        signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let raw = ""; // accumulated decoded token text → live content extraction
      let result: ResearchGenerationResult | null = null;
      let errorTrace: ResearchGenerationTrace | null = null;
      let streamError: string | null = null;

      // Coalesce token updates to one render per animation frame: tokens can
      // arrive faster than the browser can paint, and each `onContent` reflows
      // the markdown. We keep only the latest partial and flush it on the next
      // frame (falls back to a direct call where rAF is unavailable).
      const canRaf = typeof requestAnimationFrame === "function";
      let pending: string | null = null;
      let rafQueued = false;
      const flushEmit = () => {
        rafQueued = false;
        if (pending !== null) {
          onContent(pending);
          pending = null;
        }
      };
      const scheduleEmit = (partial: string) => {
        if (!canRaf) {
          onContent(partial);
          return;
        }
        pending = partial;
        if (!rafQueued) {
          rafQueued = true;
          requestAnimationFrame(flushEmit);
        }
      };

      // Parse one SSE frame: `event:` + one or more `data:` lines. Token/final/
      // error data are all JSON-encoded, so a single data line per frame.
      const handleFrame = (frame: string) => {
        let event = "message";
        const dataParts: string[] = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
        }
        const data = dataParts.join("");
        if (!data) return;
        if (event === "start" || event === "ping") return;
        if (event === "token") {
          // Outline JSON is a tree, not a typed-out body — skip live extract.
          if (generationMode !== "content") return;
          try {
            raw += JSON.parse(data) as string;
            scheduleEmit(extractStreamingContent(raw));
          } catch {
            /* ignore a malformed token frame */
          }
        } else if (event === "final") {
          try {
            result = JSON.parse(data) as ResearchGenerationResult;
          } catch {
            streamError = "Malformed final payload";
          }
        } else if (event === "error") {
          // New shape: `{ message, trace }`; legacy shape: a bare JSON string.
          try {
            const parsed = JSON.parse(data) as
              | string
              | { message?: string; trace?: ResearchGenerationTrace | null };
            if (typeof parsed === "string") {
              streamError = parsed;
            } else {
              streamError = parsed.message ?? "Generation failed";
              errorTrace = parsed.trace ?? null;
            }
          } catch {
            streamError = data;
          }
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          if (frame.trim()) handleFrame(frame);
        }
      }
      if (buffer.trim()) handleFrame(buffer);
      flushEmit(); // ensure the last partial lands even if no frame fired

      // A failed stream still returns its trace (carried on the error event) so
      // the caller can surface how the failed run unfolded for debugging.
      if (streamError) {
        console.error("[research] generateContentStream failed:", streamError);
        return { result: null, trace: errorTrace };
      }
      // TS 5.9 control-flow analysis narrows `result` (a closure-mutated let) to
      // `never` here; an explicit cast re-establishes the declared type so the
      // optional `.trace` access type-checks correctly.
      const finalResult = result as ResearchGenerationResult | null;
      return { result: finalResult, trace: finalResult?.trace ?? null };
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        return { result: null, trace: null };
      }
      console.error("[research] generateContentStream failed:", String(error));
      return { result: null, trace: null };
    }
  }

  return {
    phase: "welcome",
    projectId: null,
    title: "",
    topic: "",
    nodes: {},
    order: [],
    activeNodeId: null,
    generating: false,
    projects: [],
    error: null,
    loadingProject: false,
    projectHighlighted: false,
    highlightedNodeId: null,
    traces: {},

    listProjects: async () => {
      const local = listCachedProjects();
      try {
        const res = await apiClient.research.projects.$get();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { projects: ResearchProjectMeta[] };
        set({ projects: mergeProjectLists(data.projects, local) });
      } catch (error) {
        console.error("[research] listProjects failed:", String(error));
        if (local.length) {
          set({ projects: local });
          return;
        }
        // Don't clobber a more specific deep-link load error that raced us.
        if (!get().error) {
          set({ error: "研究项目列表加载失败，请稍后重试。" });
        }
      }
    },

    startResearch: async (topicRaw) => {
      const topic = topicRaw.trim();
      if (!topic) return;
      // Drop any in-flight outline before swapping the open project.
      bumpOutlineEpoch();
      const projectId = nextId("rp");
      const rootId = nextId("rn");
      const root: ResearchNode = {
        id: rootId,
        parentId: null,
        depth: 0,
        title: topic,
        status: "loading",
        isRoot: true,
      };
      set({
        phase: "canvas",
        projectId,
        title: topic.slice(0, 60),
        topic,
        nodes: { [rootId]: root },
        order: [rootId],
        activeNodeId: null,
        generating: true,
        error: null,
        loadingProject: false,
        projectHighlighted: false,
        highlightedNodeId: null,
        traces: {},
      });
      // Cache the stub immediately so a refresh during outline generation still
      // reopens this project instead of 404ing an id that only existed in memory.
      const stub: ResearchSnapshot = {
        projectId,
        title: topic.slice(0, 60),
        topic,
        nodes: { [rootId]: root },
        order: [rootId],
        updatedAt: new Date().toISOString(),
      };
      cacheSnapshot(stub);
      void persistNow();
      await runOutlineGeneration();
    },

    openNode: async (id) => {
      const node = get().nodes[id];
      if (!node) return;
      // Opening any node is "clicking elsewhere" → drop the project highlight,
      // and light this node's card (persists until blank-canvas press / another open).
      set({ activeNodeId: id, projectHighlighted: false, highlightedNodeId: id });
      // Already has content (or is the empty root) → just open it.
      if (!node.needsContent || node.content || node.isRoot) return;

      set((s) => ({ nodes: { ...s.nodes, [id]: { ...s.nodes[id], status: "loading" } } }));
      const parent = node.parentId ? get().nodes[node.parentId] : null;
      const context = [get().topic, parent?.brief, parent?.summary].filter(Boolean).join(" / ");
      const { result, trace } = await generateContentStream(
        { topic: get().topic, question: node.title, context: context || undefined },
        (partial) =>
          set((s) => {
            const prev = s.nodes[id];
            if (!prev) return {};
            return { nodes: { ...s.nodes, [id]: { ...prev, content: partial } } };
          }),
      );
      // Stash the article-generation trace under this node's id (even on
      // failure) so the reading overlay can open the "生成过程" debug modal.
      if (trace) set((s) => ({ traces: { ...s.traces, [id]: trace } }));
      set((s) => {
        const prev = s.nodes[id];
        if (!prev) return {};
        if (!result) {
          // Clear any partial streamed text so the openNode guard
          // (`|| node.content`) doesn't short-circuit a retry.
          return { nodes: { ...s.nodes, [id]: { ...prev, content: undefined, status: "failed" } } };
        }
        return {
          nodes: {
            ...s.nodes,
            [id]: {
              ...prev,
              content: result.content,
              questions: result.questions,
              brief: result.summary ?? prev.brief,
              summary: result.summary,
              tags: result.tags ?? prev.tags,
              status: "ready",
              needsContent: false,
            } as ResearchNode,
          },
        };
      });
      schedulePersist();
    },

    growChild: async (parentId, opts) => {
      const parent = get().nodes[parentId];
      if (!parent) return;
      const childId = nextId("rn");
      const label = (opts.focusTerm || opts.question || "深入研究").trim();
      const child: ResearchNode = {
        id: childId,
        parentId,
        depth: parent.depth + 1,
        title: label,
        status: "loading",
        sourceQuestion: opts.question ?? opts.focusTerm,
      };
      set((s) => ({
        nodes: { ...s.nodes, [childId]: child },
        order: [...s.order, childId],
        activeNodeId: childId,
        highlightedNodeId: childId,
      }));

      const context = [get().topic, parent.brief, parent.summary, parent.content?.slice(0, 1200)]
        .filter(Boolean)
        .join(" / ");
      const { result, trace } = await generateContentStream(
        {
          topic: get().topic,
          question: opts.question,
          focusTerm: opts.focusTerm,
          focusParagraph: opts.focusParagraph,
          context: context || undefined,
        },
        (partial) =>
          set((s) => {
            const prev = s.nodes[childId];
            if (!prev) return {};
            return { nodes: { ...s.nodes, [childId]: { ...prev, content: partial } } };
          }),
      );
      // Stash the child's article-generation trace under its node id (even on
      // failure) so its reading overlay can open the "生成过程" debug modal.
      if (trace) set((s) => ({ traces: { ...s.traces, [childId]: trace } }));
      set((s) => {
        const prev = s.nodes[childId];
        if (!prev) return {};
        if (!result) {
          // Drop partial streamed text so a failed child shows a clean error
          // state rather than half an article.
          return { nodes: { ...s.nodes, [childId]: { ...prev, content: undefined, status: "failed" } } };
        }
        return {
          nodes: {
            ...s.nodes,
            [childId]: {
              ...prev,
              content: result.content,
              questions: result.questions,
              brief: result.summary,
              summary: result.summary,
              tags: result.tags,
              status: "ready",
              needsContent: false,
            } as ResearchNode,
          },
        };
      });
      schedulePersist();
    },

    askInReading: async (nodeId, questionRaw) => {
      const question = questionRaw.trim();
      if (!question) return;
      const node = get().nodes[nodeId];
      if (!node) return;

      // Append a loading turn immediately (optimistic), keyed so streamed
      // partials and the final answer can target just this turn.
      const turnId = nextId("qt");
      const turn: ResearchQnaTurn = { id: turnId, question, answer: "", status: "loading" };
      const patchTurn = (
        patch: (t: ResearchQnaTurn) => ResearchQnaTurn,
      ) =>
        set((s) => {
          const n = s.nodes[nodeId];
          if (!n) return {};
          const turns = (n.userQuestionTurns ?? []).map((t) =>
            t.id === turnId ? patch(t) : t,
          );
          return { nodes: { ...s.nodes, [nodeId]: { ...n, userQuestionTurns: turns } } };
        });

      set((s) => {
        const n = s.nodes[nodeId];
        if (!n) return {};
        return {
          nodes: {
            ...s.nodes,
            [nodeId]: { ...n, userQuestionTurns: [...(n.userQuestionTurns ?? []), turn] },
          },
        };
      });

      // Ground the answer in this node's own article, not a fresh topic search.
      const context = [get().topic, node.title, node.summary, node.content?.slice(0, 2000)]
        .filter(Boolean)
        .join(" / ");
      // Inline Q&A answers a follow-up below the article rather than growing a
      // node, so its trace isn't surfaced (no node to attach a "生成过程" entry to).
      const { result } = await generateContentStream(
        { topic: get().topic, question, context: context || undefined },
        (partial) => patchTurn((t) => ({ ...t, answer: partial })),
      );
      patchTurn((t) =>
        result
          ? { ...t, answer: result.content, status: "ready" }
          : { ...t, status: "failed" },
      );
      schedulePersist();
    },

    askOnCanvas: async (questionRaw, onContent) => {
      const question = questionRaw.trim();
      if (!question) return null;
      const s = get();
      const rootId = s.order[0];
      if (!rootId) return null; // no open project — nothing to attach to

      // Ground the answer in the node the user is currently looking at (the open
      // reading overlay, or the lit card) — captured BEFORE we steal the
      // highlight for the new node below.
      const viewingId = s.activeNodeId ?? s.highlightedNodeId;
      const viewing = viewingId ? s.nodes[viewingId] : null;
      const context = [
        s.topic,
        viewing ? `当前正在看：${viewing.title}` : null,
        viewing?.summary,
        viewing?.content?.slice(0, 1500),
      ]
        .filter(Boolean)
        .join(" / ");

      // The new node leads the root's children: splice it in at `order` index 1
      // (right after the root) so it tops both the canvas outline and the
      // sidebar tree. We only LIGHT it (highlightedNodeId) — we deliberately do
      // NOT set activeNodeId, so the full reading overlay stays closed: the
      // answer already lives in the quick-chat popup, and the canvas just scrolls
      // to the lit card (see ResearchCanvas' scrollTarget). The user can click
      // the card later to read it in the overlay.
      const nodeId = nextId("rn");
      const node: ResearchNode = {
        id: nodeId,
        parentId: rootId,
        depth: 1,
        title: question,
        status: "loading",
        sourceQuestion: question,
        needsContent: true,
      };
      set((st) => {
        const order = [...st.order];
        order.splice(1, 0, nodeId);
        return {
          nodes: { ...st.nodes, [nodeId]: node },
          order,
          highlightedNodeId: nodeId,
          projectHighlighted: false,
        };
      });

      const { result, trace } = await generateContentStream(
        { topic: s.topic, question, context: context || undefined },
        (partial) => {
          set((st) => {
            const prev = st.nodes[nodeId];
            if (!prev) return {};
            return { nodes: { ...st.nodes, [nodeId]: { ...prev, content: partial } } };
          });
          onContent?.(partial);
        },
      );
      // Stash the article-generation trace under this node's id (even on failure)
      // so its reading overlay can open the "生成过程" debug modal.
      if (trace) set((st) => ({ traces: { ...st.traces, [nodeId]: trace } }));
      set((st) => {
        const prev = st.nodes[nodeId];
        if (!prev) return {};
        if (!result) {
          // Drop partial streamed text so the failed node shows a clean error
          // state rather than half an article.
          return { nodes: { ...st.nodes, [nodeId]: { ...prev, content: undefined, status: "failed" } } };
        }
        return {
          nodes: {
            ...st.nodes,
            [nodeId]: {
              ...prev,
              content: result.content,
              questions: result.questions,
              brief: result.summary,
              summary: result.summary,
              tags: result.tags,
              status: "ready",
              needsContent: false,
            } as ResearchNode,
          },
        };
      });
      schedulePersist();
      return result ? { content: result.content } : null;
    },

    closeReading: () => set({ activeNodeId: null }),

    loadProject: async (id, openNodeId) => {
      set({ loadingProject: true, error: null });
      const cached = loadCachedSnapshot(id);
      try {
        const res = await apiClient.research.snapshots[":id"].$get({ param: { id } });
        if (res.status === 404) {
          if (cached) {
            console.error("[research] loadProject: D1 404, opening local cache");
            applyLoadedSnapshot(cached, openNodeId);
            void persistNow();
            return true;
          }
          console.error("[research] loadProject failed: HTTP 404");
          set({
            loadingProject: false,
            error: "找不到这个研究项目，可能已被删除或属于其他账号。",
          });
          return false;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { snapshot: ResearchSnapshot };
        const remote = data.snapshot;
        if (!isResearchSnapshot(remote)) throw new Error("Malformed snapshot");
        const snap = newerSnapshot(remote, cached) ?? remote;
        cacheSnapshot(snap);
        applyLoadedSnapshot(snap, openNodeId);
        if (cached && cached.updatedAt > remote.updatedAt) void persistNow();
        return true;
      } catch (error) {
        if (cached) {
          console.error("[research] loadProject failed, opening local cache:", String(error));
          applyLoadedSnapshot(cached, openNodeId);
          void persistNow();
          return true;
        }
        console.error("[research] loadProject failed:", String(error));
        set({
          loadingProject: false,
          error: "研究项目加载失败，请稍后重试。",
        });
        return false;
      }
    },

    retryOutline: async () => {
      const s = get();
      const rootId = s.order[0];
      const root = rootId ? s.nodes[rootId] : undefined;
      if (!root || !s.topic) return;
      if (s.generating && root.status === "loading") return;
      const hasChildren = s.order.some((id) => s.nodes[id]?.parentId === rootId);
      if (hasChildren && root.status !== "failed") return;

      set({
        generating: true,
        error: null,
        nodes: { ...s.nodes, [rootId]: { ...root, status: "loading" } },
      });
      schedulePersist();
      await runOutlineGeneration();
    },

    newResearch: () => {
      bumpOutlineEpoch();
      set({
        phase: "welcome",
        projectId: null,
        title: "",
        topic: "",
        nodes: {},
        order: [],
        activeNodeId: null,
        generating: false,
        error: null,
        loadingProject: false,
        projectHighlighted: false,
        highlightedNodeId: null,
        traces: {},
      });
    },

    highlightProject: () => set({ projectHighlighted: true }),
    clearProjectHighlight: () => {
      if (get().projectHighlighted) set({ projectHighlighted: false });
    },
    clearNodeHighlight: () => {
      if (get().highlightedNodeId) set({ highlightedNodeId: null });
    },
  };
});
