// Keyboard-shortcut definitions and matching helpers.
//
// The app has two kinds of shortcuts:
//   1. Configurable single-key shortcuts (toggle the left / right sidebar) the
//      user can rebind in Settings → Shortcuts. Their live key bindings live in
//      `store/useShortcuts.ts`; this module owns the static definitions, the
//      defaults and the pure helpers (key normalization, display formatting,
//      event matching) shared by the global handler and the settings UI.
//   2. Fixed (non-editable) shortcuts shown read-only for reference (⌘N / ⌘J /
//      Esc) — these stay wired in their own components.
//
// Single-key bindings are deliberately modifier-free ("press S", "press D"):
// the global handler ignores them while the user is typing in a field or an IME
// composition is active, so a bare letter is safe.

/** Ids of the user-configurable shortcuts. */
export type ShortcutId = "toggleLeftSidebar" | "toggleRightSidebar";

export interface ShortcutDef {
  id: ShortcutId;
  /** Action label shown in the settings list. */
  label: string;
  /** One-line description of what the shortcut does. */
  description: string;
  /** Default key (a single uppercase A–Z / 0–9 character). */
  defaultKey: string;
}

/** The configurable shortcuts, in display order. */
export const SHORTCUT_DEFS: ShortcutDef[] = [
  {
    id: "toggleLeftSidebar",
    label: "切换左侧边栏",
    description: "展开 / 收起左侧导航栏",
    defaultKey: "S",
  },
  {
    id: "toggleRightSidebar",
    label: "切换右侧边栏",
    description: "展开 / 收起右侧快速对话栏",
    defaultKey: "D",
  },
];

/** Map of id → default key, derived once from the definitions. */
export const DEFAULT_BINDINGS: Record<ShortcutId, string> = SHORTCUT_DEFS.reduce(
  (acc, def) => {
    acc[def.id] = def.defaultKey;
    return acc;
  },
  {} as Record<ShortcutId, string>,
);

/** A fixed, non-editable shortcut shown for reference only. */
export interface FixedShortcut {
  /** Pre-formatted key combo for display (e.g. "⌘ N"). */
  keys: string;
  label: string;
}

/** Built-in shortcuts wired elsewhere; listed read-only so users can discover
 *  them alongside the editable ones. */
export const FIXED_SHORTCUTS: FixedShortcut[] = [
  { keys: "⌘ N", label: "新建（跟随当前页面：对话 / 任务 / Artifact / 研究）" },
  { keys: "⌘ J", label: "展开 / 收起右侧快速对话" },
  { keys: "Esc", label: "关闭弹层 / 收起面板" },
];

/**
 * Normalize a raw key (a KeyboardEvent.key or user text) to the canonical
 * binding form: a single uppercase letter (A–Z) or digit (0–9). Returns null
 * for anything else (modifiers, whitespace, multi-char keys, punctuation) so the
 * rebind UI can reject it cleanly.
 */
export function normalizeKey(raw: string): string | null {
  if (!raw || raw.length !== 1) return null;
  const up = raw.toUpperCase();
  return /^[A-Z0-9]$/.test(up) ? up : null;
}

/** Display form of a binding key (currently just the uppercase character). */
export function formatKey(key: string): string {
  return key.toUpperCase();
}

/**
 * Whether a keydown event should trigger the shortcut bound to `binding`.
 * Requires a bare key press: no Ctrl/Meta/Alt (Shift is allowed so the
 * shifted form of a letter still matches), and the pressed key must normalize
 * to the same character as the binding.
 */
export function eventMatchesBinding(
  e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">,
  binding: string,
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const pressed = normalizeKey(e.key);
  return pressed != null && pressed === binding.toUpperCase();
}

/**
 * Whether an element is a text-editing target where bare-key shortcuts must
 * stand down (typing "s"/"d" should reach the field, not toggle a sidebar).
 */
export function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}
