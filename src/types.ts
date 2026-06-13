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
export type TaskStatus = 'active' | 'paused';
export type ResultTone = 'up' | 'down' | 'info';

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

/** Names of the inline icon set (see src/icons/icons.tsx). */
export type IconName =
  | 'plus' | 'search' | 'bell' | 'chevR' | 'chevD' | 'chat' | 'star' | 'clock'
  | 'bolt' | 'trend' | 'trendDown' | 'bars' | 'coins' | 'book' | 'news' | 'heart'
  | 'send' | 'attach' | 'mic' | 'slash' | 'at' | 'copy' | 'up' | 'redo' | 'more'
  | 'check' | 'bee' | 'panelRight' | 'panelLeft' | 'list' | 'grid' | 'feed'
  | 'eye' | 'arrowRight' | 'pause' | 'play' | 'calendar' | 'globe' | 'spark'
  | 'x' | 'bookmark' | 'doc' | 'filter' | 'logout' | 'download' | 'smartphone'
  | 'monitor' | 'gear';
