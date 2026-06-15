// Research Canvas state — a dedicated zustand store for the research view, kept
// separate from useAppStore so the (large) canvas state doesn't bloat the main
// app store. Owns: the current project's node map, generation lifecycle, the
// reading overlay selection, and snapshot persistence through the typed RPC.
//
// Data flow mirrors useAppStore: optimistic node creation on the canvas, AI
// fills content in the background, snapshots persist (debounced) to D1.

import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { nextId } from "../data/ids";
import { extractStreamingContent } from "../research/streaming";
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
  closeReading: () => void;
  /** Load a project; optionally open `openNodeId`'s reading overlay (deep link). */
  loadProject: (id: string, openNodeId?: string) => Promise<void>;
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

export const useResearchStore = create<ResearchState>((set, get) => {
  /** Debounced snapshot save. */
  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => void persistNow(), 800);
  }
  async function persistNow() {
    const s = get();
    if (!s.projectId) return;
    const snapshot: ResearchSnapshot = {
      projectId: s.projectId,
      title: s.title,
      topic: s.topic,
      nodes: s.nodes,
      order: s.order,
      updatedAt: new Date().toISOString(),
    };
    try {
      const res = await apiClient.research.snapshots.$post({ json: snapshot });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error("[research] persist failed:", String(error));
    }
  }

  /**
   * Call the (non-streamed) generation endpoint. Returns the validated result
   * (null on failure) AND the execution trace when present — the failure path
   * still carries a trace (in the error body) so the UI can debug a failed run.
   */
  async function generate(body: {
    topic: string;
    question?: string;
    context?: string;
    focusTerm?: string;
    generationMode?: "outline" | "content";
  }): Promise<{ result: ResearchGenerationResult | null; trace: ResearchGenerationTrace | null }> {
    try {
      const res = await apiClient.research.generate.$post({ json: body });
      if (!res.ok) {
        // The 502 error body may still carry a failure trace for debugging.
        const body = (await res.json().catch(() => null)) as
          | { trace?: ResearchGenerationTrace | null }
          | null;
        console.error("[research] generate failed: HTTP", String(res.status));
        return { result: null, trace: body?.trace ?? null };
      }
      const result = (await res.json()) as ResearchGenerationResult;
      return { result, trace: result.trace ?? null };
    } catch (error) {
      console.error("[research] generate failed:", String(error));
      return { result: null, trace: null };
    }
  }

  /**
   * Stream a content-mode generation. Calls `onContent` with the article body
   * decoded so far on every token (drives the reading overlay's typewriter), and
   * resolves with the authoritative validated result once the `final` event
   * arrives. Returns null on transport/stream error. The non-streamed `generate`
   * above still backs outline mode (a tree, not a typed-out body).
   */
  async function generateContentStream(
    body: {
      topic: string;
      question?: string;
      context?: string;
      focusTerm?: string;
      focusParagraph?: string;
    },
    onContent: (partial: string) => void,
  ): Promise<{ result: ResearchGenerationResult | null; trace: ResearchGenerationTrace | null }> {
    try {
      const res = await fetch("/api/research/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...body, generationMode: "content" }),
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
        if (event === "token") {
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
      return { result, trace: result?.trace ?? null };
    } catch (error) {
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
    projectHighlighted: false,
    highlightedNodeId: null,
    traces: {},

    listProjects: async () => {
      try {
        const res = await apiClient.research.projects.$get();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { projects: ResearchProjectMeta[] };
        set({ projects: data.projects });
      } catch (error) {
        console.error("[research] listProjects failed:", String(error));
      }
    },

    startResearch: async (topicRaw) => {
      const topic = topicRaw.trim();
      if (!topic) return;
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
        projectHighlighted: false,
        highlightedNodeId: null,
        traces: {},
      });

      const { result, trace } = await generate({ topic, generationMode: "outline" });
      // Stash the outline-generation trace under the root node id (even on
      // failure) so the canvas can open the "生成过程" debug modal.
      if (trace) set((s) => ({ traces: { ...s.traces, [rootId]: trace } }));
      if (!result || !result.outline?.length) {
        set((s) => ({
          generating: false,
          error: result ? "AI 未能生成大纲，请重试" : "生成失败，请检查 AI 配置后重试",
          nodes: { ...s.nodes, [rootId]: { ...s.nodes[rootId], status: "failed" } },
        }));
        return;
      }

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
      set({ nodes, order, generating: false });
      schedulePersist();
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

    closeReading: () => set({ activeNodeId: null }),

    loadProject: async (id, openNodeId) => {
      try {
        const res = await apiClient.research.snapshots[":id"].$get({ param: { id } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { snapshot: ResearchSnapshot };
        const snap = data.snapshot;
        // Open the deep-linked node up front (single set → no URL flicker);
        // ignore a stale id that isn't in this snapshot.
        const willOpen = openNodeId && snap.nodes[openNodeId] ? openNodeId : null;
        set({
          phase: "canvas",
          projectId: snap.projectId,
          title: snap.title,
          topic: snap.topic,
          nodes: snap.nodes,
          order: snap.order,
          activeNodeId: willOpen,
          generating: false,
          error: null,
          // Programmatic / deep-link load starts unhighlighted; the sidebar
          // click handler re-enables the highlight after this resolves.
          projectHighlighted: false,
          // Deep-link opens a node → light it; a bare project load lights nothing.
          highlightedNodeId: willOpen,
          // Traces aren't persisted; a loaded project starts with none until a
          // node is (re)generated this session.
          traces: {},
        });
        // A bookmarked node that was never filled in still needs its article.
        if (willOpen) void get().openNode(willOpen);
      } catch (error) {
        console.error("[research] loadProject failed:", String(error));
      }
    },

    newResearch: () => {
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
