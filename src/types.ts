// Shared domain types for the NanoBee app.
import type { ArtifactRef } from './artifacts/types';

/** A topic ("话题") groups conversations and tasks around one user concern. */
export interface Topic {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  /** Soft tint background paired with `color` for badges. */
  soft: string;
}

export type TriggerType = 'condition' | 'schedule';
/** Enabled state of a task (the row toggle). Execution state is separate, see `runState`. */
export type TaskStatus = 'active' | 'paused';
export type ResultTone = 'up' | 'down' | 'info';

/** Higher-level kind used for the type badge and grouping. Optional &
 *  backward-compatible: when absent it is derived from `triggerType`
 *  (see taskKind() in src/components/tasks/taskMeta.ts). */
export type TaskKind = 'oneoff' | 'schedule' | 'condition' | 'batch';

/** Transient execution state, layered on top of the enabled `status`:
 *  a batch mid-run is 'running', a crashed run 'failed', a finished one-off
 *  'done'. Absent → idle (just enabled / monitoring). */
export type RunState = 'running' | 'failed' | 'done';

export type SubTaskStatus = 'queued' | 'running' | 'success' | 'failed';

/** One row of a batch task: a single input run through the same action. */
export interface SubTask {
  id: string;
  /** The per-row input (a company name, a URL, a keyword…). */
  input: string;
  status: SubTaskStatus;
  /** Short readable output, or the failure reason when status is 'failed'. */
  result?: string;
}

/** Progress + child rows of a batch task ("100 companies · funding monitor"). */
export interface TaskBatch {
  total: number;
  done: number;
  failed: number;
  subtasks: SubTask[];
}

export type RunStatus = 'success' | 'failed';

/** One past execution, shown as a row in the detail-drawer run timeline. */
export interface RunRecord {
  /** Human-readable run time. */
  time: string;
  status: RunStatus;
  summary: string;
  /** Wall-clock duration in milliseconds, when known. */
  durationMs?: number;
}

/** A chip describing one piece of task configuration (kept collapsed by default). */
export interface TaskConfigChip {
  icon: 'clock' | 'bolt';
  label: string;
}

/** An automated task NanoBee runs on the user's behalf. */
export interface Task {
  id: string;
  topicId: string;
  title: string;
  iconColor: string;
  triggerType: TriggerType;
  trigger: string;
  status: TaskStatus;
  /** Last run time, human-readable. */
  last: string;
  /** Next run / current monitoring state, human-readable. */
  next: string;
  result?: string;
  resultTone?: ResultTone;
  desc?: string;
  config?: TaskConfigChip[];
  /** Higher-level kind for the type badge. Optional; derived from triggerType when absent. */
  kind?: TaskKind;
  /** Transient execution state (running / failed / done); absent → idle. */
  runState?: RunState;
  /** Present only on batch tasks: progress + child rows. */
  batch?: TaskBatch;
  /** Recent executions, newest first (detail-drawer timeline). */
  history?: RunRecord[];
  /** Structured declarative trigger specification (optional; present when the task
   *  was created with a triggerSpec and the server includes it in the payload). */
  triggerSpec?: TriggerSpec;

  // ── Optional presentation/enrichment fields ─────────────────────────────
  // All optional and carried verbatim in the task JSON payload (rowToTask
  // spreads it), so they round-trip without a schema/migration change. The
  // Tasks page derives sensible fallbacks when they are absent.
  /** Surface this task as a "重点盯梢" featured card at the top of the page. */
  featured?: boolean;
  /** The one-sentence natural-language spec shown in the drawer ("对话即配置"). */
  nlSpec?: string;
  /** Human-readable cooldown between firings (condition tasks). */
  cooldown?: string;
  /** Notification channel label (e.g. "事项页 · 推送"). */
  channel?: string;
  /** Data source label (e.g. "NanoBee data-hub"). */
  source?: string;
  /** Total successful/attempted run count (denormalized for display). */
  runs?: number;
  /** Success-rate label (e.g. "98%"). */
  successRate?: string;
  /** When the task needs attention: why it failed + the suggested fix. */
  failure?: { reason: string; fix: string };
  /** Render the featured card as a dark live-monitor with a metric + sparkline. */
  monitor?: boolean;
  /** Live metric for a monitor featured card. */
  metric?: { label: string; value: string; dir: 'up' | 'down'; delta: string };
  /** Sparkline series for a monitor featured card. */
  spark?: number[];
}

/** A proactive update — one readable item on the Today page / notifications. */
export interface UpdateItem {
  id: string;
  topicId: string;
  icon: IconName;
  color: string;
  tone: ResultTone;
  title: string;
  time: string;
  group: '今天' | '本周';
  summary: string;
  body: BodySegment[];
  source?: string;
}

/** Rich body content: paragraphs interleaved with bullet lists. */
export type BodySegment = string | { list: string[] };

/** Sidebar chat-history entry. */
export interface ChatMeta {
  id: string;
  topicId: string;
  title: string;
  sub: string;
  group: string;
  pinned?: boolean;
}

/** Lightweight metadata for chats created during this session. */
export interface SessionMeta {
  id: string;
  title: string;
  topicId: string;
}

/** Inline rich-text segment inside an AI paragraph. */
export type InlineSegment =
  | string
  | { b: string }
  | { num: string };

export type Paragraph = InlineSegment[];

/** Task proposal (e.g. from the selection toolbar) — confirmed by the user with one click. */
export interface TaskSuggestion extends Omit<Task, 'status'> {
  desc: string;
  config: TaskConfigChip[];
}

/**
 * An in-chat task suggestion card produced by the NL→TriggerSpec compiler.
 * Attached to an AiMessage and rendered inline; the user confirms it with one
 * click which calls POST /api/tasks with the embedded triggerSpec.
 */
export interface InlineSuggestion {
  /** Unique id for the task that would be created (pre-generated client-side
   *  so the create call is idempotent on retry). */
  taskId: string;
  title: string;
  topic: string;
  /** Human-readable description of when/how the task fires. */
  triggerLabel: string;
  /** Notification copy delivered when the trigger fires. */
  message: string;
  /** Structured cron/condition spec for the engine. */
  triggerSpec: TriggerSpec;
}

export interface UserMessage {
  id: string;
  role: 'user';
  text: string;
}

export interface AiMessage {
  id: string;
  /** 'proactive' marks AI-initiated messages (rendered with amber framing). */
  role: 'ai' | 'proactive';
  /**
   * Raw markdown body, preferred by MessageView when present (LLM replies are
   * markdown). When absent, `paras` is serialized to markdown as a fallback.
   */
  md?: string;
  paras: Paragraph[];
  icon?: IconName;
  title?: string;
  time?: string;
  model?: string;
  /** Artifacts (card decks) the agent generated while producing this reply. */
  artifacts?: ArtifactRef[];
  /**
   * Inline task suggestion produced by the NL→TriggerSpec compiler. When
   * present, MessageView renders a confirmation card below the reply text.
   * The card lets the user accept (POST /api/tasks) or dismiss it.
   */
  taskSuggestion?: InlineSuggestion;
  /**
   * Client-only, transient: true while the reply is still streaming in token
   * by token. Drives the live typewriter (Markdown `streaming` prop). The
   * authoritative message that replaces this placeholder on the `final` event
   * never carries it, and it is never persisted.
   */
  streaming?: boolean;
}

export type ChatMessage = UserMessage | AiMessage;

export interface Toast {
  id: string;
  text: string;
}

/** What the user is currently viewing on the Today page (quick-chat context). */
export interface ViewingContext {
  id: string;
  title: string;
  topicId: string;
}

// ---------------------------------------------------------------------------
// TriggerSpec — declarative task trigger contract.
// Stored as JSON in tasks.trigger_spec. The cron handler evaluates these
// server-side with NO LLM and NO user API key.
// ---------------------------------------------------------------------------

/**
 * A schedule-kind trigger: fires at a fixed daily time (UTC hour + minute).
 * The cron handler computes next_run_at from this on every successful run.
 */
export interface ScheduleTrigger {
  kind: 'schedule';
  /** UTC hour (0–23) */
  hour: number;
  /** UTC minute (0–59) */
  minute: number;
  /**
   * Human-readable label stored on the task for display (e.g. "Daily at 09:00 UTC").
   * The cron handler does NOT use this; it uses hour/minute directly.
   */
  label: string;
  /** Optional fixed message to write to the feed when this schedule fires. */
  message?: string;
}

/**
 * Comparison operators the condition evaluator supports.
 * 'gt' / 'lt' / 'gte' / 'lte' compare a numeric metric against threshold.
 * 'changed' fires whenever the metric value changes (no threshold needed).
 */
export type ConditionOp = 'gt' | 'lt' | 'gte' | 'lte' | 'changed';

/**
 * A condition-kind trigger: polls a data-hub source, extracts a numeric metric
 * from the result, and fires when the condition is met.
 *
 * Cooldown prevents repeated firings when the condition stays true over
 * multiple cron ticks. A new feed row is only written if last_run_at is
 * more than cooldownSeconds ago (or the task has never fired).
 */
export interface ConditionTrigger {
  kind: 'condition';
  /** Data-hub source id (e.g. 'gold', 'hackernews'). */
  sourceId: string;
  /**
   * Dot-path to the numeric value to extract from the DataSourceResult.
   * If the path points to a string the evaluator attempts Number() coercion.
   * Use 'items[0].price' style notation for nested/array paths.
   * Special value '__count__' uses items.length.
   */
  metric: string;
  op: ConditionOp;
  /** Numeric threshold for gt/lt/gte/lte. Ignored for 'changed'. */
  threshold?: number;
  /** Minimum seconds between successive feed rows for this task. Default 3600. */
  cooldownSeconds: number;
  /**
   * Mustache-style message template rendered when the condition fires.
   * Variables available: {{value}}, {{threshold}}, {{source}}, {{title}}.
   * Example: "Gold is now {{value}}, above your alert of {{threshold}}."
   */
  messageTemplate: string;
  /**
   * Optional static params passed to the data-hub source invocation.
   * Secret params (injected server-side) must NOT appear here.
   */
  params?: Record<string, string | number | boolean>;
}

/** Union of the two supported trigger specifications. */
export type TriggerSpec = ScheduleTrigger | ConditionTrigger;

/** Names of the inline icon set (see src/icons/icons.tsx). */
export type IconName =
  | 'plus' | 'search' | 'bell' | 'chevR' | 'chevD' | 'chat' | 'star' | 'clock'
  | 'bolt' | 'trend' | 'trendDown' | 'bars' | 'coins' | 'book' | 'news' | 'heart'
  | 'send' | 'attach' | 'mic' | 'slash' | 'at' | 'copy' | 'up' | 'redo' | 'more'
  | 'check' | 'bee' | 'panelRight' | 'panelLeft' | 'list' | 'grid' | 'feed'
  | 'eye' | 'arrowRight' | 'pause' | 'play' | 'calendar' | 'globe' | 'spark'
  | 'x' | 'bookmark' | 'doc' | 'filter' | 'logout' | 'download' | 'smartphone'
  | 'monitor' | 'gear' | 'table' | 'stop';
