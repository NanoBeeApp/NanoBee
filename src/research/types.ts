// Shared domain types for the Research Canvas feature, ported and trimmed from
// WindSeed Curve's `core/research` + `core/ai` modules. These types are
// platform-agnostic and shared by both the worker (generation/persistence) and
// the client (canvas rendering + store).
//
// The product idea: the user names a research direction, the AI generates a
// two-level outline of knowledge nodes, and each node can grow children by
// following one of its three follow-up questions or by deep-diving a bold term.

/** AI generation mode: an outline tree, or one node's full article. */
export type ResearchGenerationMode = "outline" | "content";

/** Input to one AI generation call. */
export interface ResearchGenerationInput {
  /** The overall research direction (root topic), always present. */
  topic: string;
  /** The specific follow-up question being expanded (content mode only). */
  question?: string;
  /** Upstream context: parent node summary / path, fed to the model. */
  context?: string;
  /** Output language; defaults to zh-CN. */
  locale?: string;
  /** Forced mode; otherwise inferred from `question` presence. */
  generationMode?: ResearchGenerationMode;
  /**
   * Deep-dive anchor: the exact bold phrase the user clicked inside an article.
   * When present the model grows a new node around this anchor instead of
   * treating it as a generic question.
   */
  focusTerm?: string;
  /**
   * The paragraph of article text that surrounded the deep-dive anchor (the
   * `focusTerm` / selected phrase). Sent so the model grows the child around the
   * reader's actual point of interest in context, not the bare phrase.
   */
  focusParagraph?: string;
}

/** One item in the generated outline tree (title + optional brief + children). */
export interface ResearchOutlineItem {
  title: string;
  brief?: string;
  children?: ResearchOutlineItem[];
  tags?: string[];
}

/** The validated, contract-conforming result of one AI generation call. */
export interface ResearchGenerationResult {
  /** Article body (Markdown-lite). Empty string in outline mode. */
  content: string;
  /** Exactly three follow-up questions (product invariant). */
  questions: string[];
  /** ≤120-char card summary, emitted in content mode. */
  summary?: string;
  /** Outline tree, emitted in outline mode. */
  outline?: ResearchOutlineItem[];
  /** 1–4 short topic tags. */
  tags?: string[];
  /** Provider/model metadata for display + audit (no prompt text). */
  metadata: {
    provider: string;
    model?: string;
  };
}

/** Status of a node on the canvas. */
export type ResearchNodeStatus = "idle" | "loading" | "ready" | "failed";

/**
 * One in-place Q&A turn appended below a node's article. The reader's own
 * custom follow-up questions are answered inline (chat-style) rather than
 * growing a new child node, so they stay attached to the article they were
 * asked about.
 */
export interface ResearchQnaTurn {
  id: string;
  question: string;
  /** The streamed/final answer markdown ("" until the first token lands). */
  answer: string;
  status: ResearchNodeStatus;
}

/**
 * One knowledge node on the canvas. The root node carries the research topic;
 * concept nodes carry generated articles. The canvas renders nodes as a nested
 * outline (hierarchical view), so structure comes entirely from `parentId` +
 * `depth` + the snapshot `order` — there are no per-node layout coordinates.
 */
export interface ResearchNode {
  id: string;
  parentId: string | null;
  depth: number;
  title: string;
  /** One-line card subtitle (brief in outline mode, summary in content mode). */
  brief?: string;
  /** ≤120-char card summary emitted alongside the article (content mode). */
  summary?: string;
  /** Full article body once the node has been read/expanded. */
  content?: string;
  /** This node's three follow-up questions. */
  questions?: string[];
  tags?: string[];
  status: ResearchNodeStatus;
  isRoot?: boolean;
  /** Whether the node still needs its full content filled in (outline stubs). */
  needsContent?: boolean;
  /** The follow-up question / focus term this node grew from. */
  sourceQuestion?: string;
  /** The reader's own custom follow-up questions, answered inline (chat-style). */
  userQuestionTurns?: ResearchQnaTurn[];
}

/** A full research project snapshot — what gets saved to / loaded from D1. */
export interface ResearchSnapshot {
  projectId: string;
  title: string;
  topic: string;
  nodes: Record<string, ResearchNode>;
  /** Node id render order (root first); fixes sibling order in the outline. */
  order: string[];
  updatedAt: string;
}

/** Sidebar list entry for a saved research project. */
export interface ResearchProjectMeta {
  id: string;
  title: string;
  topic: string;
  updatedAt: string;
  nodeCount: number;
}
