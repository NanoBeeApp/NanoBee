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
import type {
  ResearchGenerationResult,
  ResearchNode,
  ResearchOutlineItem,
  ResearchProjectMeta,
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

  listProjects: () => Promise<void>;
  startResearch: (topic: string) => Promise<void>;
  openNode: (id: string) => Promise<void>;
  growChild: (parentId: string, opts: { question?: string; focusTerm?: string }) => Promise<void>;
  closeReading: () => void;
  loadProject: (id: string) => Promise<void>;
  newResearch: () => void;
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

  /** Call the generation endpoint; returns null on failure. */
  async function generate(body: {
    topic: string;
    question?: string;
    context?: string;
    focusTerm?: string;
    generationMode?: "outline" | "content";
  }): Promise<ResearchGenerationResult | null> {
    try {
      const res = await apiClient.research.generate.$post({ json: body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as ResearchGenerationResult;
    } catch (error) {
      console.error("[research] generate failed:", String(error));
      return null;
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
      });

      const result = await generate({ topic, generationMode: "outline" });
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
      set({ activeNodeId: id });
      // Already has content (or is the empty root) → just open it.
      if (!node.needsContent || node.content || node.isRoot) return;

      set((s) => ({ nodes: { ...s.nodes, [id]: { ...s.nodes[id], status: "loading" } } }));
      const parent = node.parentId ? get().nodes[node.parentId] : null;
      const context = [get().topic, parent?.brief, parent?.summary].filter(Boolean).join(" / ");
      const result = await generate({
        topic: get().topic,
        question: node.title,
        context: context || undefined,
        generationMode: "content",
      });
      set((s) => {
        const prev = s.nodes[id];
        if (!prev) return {};
        if (!result) {
          return { nodes: { ...s.nodes, [id]: { ...prev, status: "failed" } } };
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
      }));

      const context = [get().topic, parent.brief, parent.summary, parent.content?.slice(0, 1200)]
        .filter(Boolean)
        .join(" / ");
      const result = await generate({
        topic: get().topic,
        question: opts.question,
        focusTerm: opts.focusTerm,
        context: context || undefined,
        generationMode: "content",
      });
      set((s) => {
        const prev = s.nodes[childId];
        if (!prev) return {};
        if (!result) {
          return { nodes: { ...s.nodes, [childId]: { ...prev, status: "failed" } } };
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

    closeReading: () => set({ activeNodeId: null }),

    loadProject: async (id) => {
      try {
        const res = await apiClient.research.snapshots[":id"].$get({ param: { id } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { snapshot: ResearchSnapshot };
        const snap = data.snapshot;
        set({
          phase: "canvas",
          projectId: snap.projectId,
          title: snap.title,
          topic: snap.topic,
          nodes: snap.nodes,
          order: snap.order,
          activeNodeId: null,
          generating: false,
          error: null,
        });
      } catch (error) {
        console.error("[research] loadProject failed:", String(error));
      }
    },

    newResearch: () =>
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
      }),
  };
});
