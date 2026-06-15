# src/components/quickchat/QuickChat.tsx

## Responsibility
Customer-service-style floating quick-chat widget, present on every non-chat surface (today / tasks / artifacts / research). A launcher bubble pinned bottom-right; clicking it opens a popup chat panel above it. Popup, top-to-bottom: header (bee glyph + `"快速对话"` ("Quick chat") + `"在聊天页打开"` ("Open in chat") handoff once there are messages + close ×), context chip (`"正在看 · …"` ("Now viewing · …") with clear button), message feed reusing MessageView (or a centered empty state), composer. Styles live in `styles/quickchat.css` (`.nb-qc-bubble` / `.nb-qc-pop`); panel internals reuse the `.nb-rc-*` / `.nb-qc` styles from app.css.

## Dependencies
- Upstream: store, icons, MessageView, ThinkingIndicator, `lib/useImeComposition`, `styles/quickchat.css`
- Downstream: `_app` layout (rendered as a fixed-position overlay; the layout no longer reserves a grid column for it)

## Key notes
- Returns null on the chat view (centered bottom composer is the quick chat's "full form") and on the settings page (a configuration surface).
- Folded by default (`rightCollapsed` starts `true`): only the bubble shows. Clicking the bubble toggles `rightCollapsed`; while open (`!rightCollapsed`) the popup renders and stays open until the bubble or the header's `×` closes it (no auto-close on mouse leave). The bubble shows the bee icon when folded, `×` when open.
- **⌘J / Ctrl+J toggles the popup, and Escape closes it when open** (the listener is inert on the chat / settings surfaces where the widget isn't rendered). It `preventDefault`s so the browser's own ⌘J (downloads) stays out of the way while the app owns it. The shortcut is surfaced to the user via the bubble's hover tooltip and a `⌘J` kbd chip in the popup header; the close button's tooltip notes `Esc`. Opening the popup (via the shortcut or a bubble click) auto-focuses the composer.
- The popup floats over content (fixed, bottom-right) instead of squeezing a grid column, so opening/closing it never reflows the page.
- The feed pins to the bottom on new messages, on the pending indicator, and whenever the popup (re)opens.
- Quick conversations get session metadata so they appear in the sidebar's `"刚刚"` ("Just now") group.

## Change history

### 2026-06-15 — context chip is always present (page baseline, not just articles)
- **Motivation**: the "正在看 · …" chip only rendered when a specific article was
  reported (Today's scroll listener), so on tasks / artifacts / research / compare
  the user had no signal that NanoBee can read the page they're on.
- **Goal**: whenever the popup is open, the chip tells the user what the
  assistant can see — the current page is the always-present baseline, and the
  in-view article (when reported) is the more specific focus on top of it.
- **Key decisions**: the page label comes from `VIEW_CONTEXT[view]` (derived from
  the active route, so it can never be stale or forgotten by a page); `ctxLabel`
  is the article title when present, else the page label; the chip renders on any
  visible surface (`ctxLabel != null`); the clear `×` shows only when there's a
  specific article to detach from (clearing falls back to the page label rather
  than hiding the chip). Added a tooltip spelling out that NanoBee reads the
  current content as context. The matching page phrasing is sent to the model via
  `ctxPage` (see `useAppStore.sendQuick` / `worker/routes/messages`).

### 2026-06-14 — extract the IME guard into a shared hook
- **Motivation**: the same composition guard was needed in the main chat
  composer and the research entry input, which were still re-sending on an IME
  Enter. Re-implementing it three times invites drift.
- **Change**: moved the inline `composingRef` + compositionStart/End handlers
  into `lib/useImeComposition`. QuickChat now consumes `composingRef` (for its
  window-level keydown listener), `compositionProps` (spread on the textarea)
  and `isSubmitEnter` (for the Enter-to-send guard). Behaviour is unchanged here
  — the logic is now shared rather than duplicated.

### 2026-06-14 — float above the research reading overlay (z-index 28 → 35)
- **Motivation**: while reading a research article (the centered reading overlay, `.rc-reading-scrim` z-index 30), the bubble + popup were hidden behind it, so you couldn't pop open the assistant to ask about what you're reading.
- **Fix**: raised `.nb-qc-bubble` / `.nb-qc-pop` z-index from 28 to 35 (in `styles/quickchat.css`) so they sit above the reading overlay, while staying below the system layers that should fully own the screen (notification scrim 40, image lightbox 60, modal scrims 80, selection float 200, toasts 300).

### 2026-06-14 — open shortcut reverted from Space back to ⌘J
- **Motivation**: the user asked to switch the bottom-right bubble's open shortcut back from Space to ⌘J. A bare Space, even gated on a non-input state, proved too easy to fire by accident.
- **Goal**: restore the ⌘J / Ctrl+J toggle as the single, modifier-guarded way to open/close the popup from the keyboard.
- **Key decisions**: reinstated the `(metaKey || ctrlKey) && key === 'j'` toggle with `preventDefault` (so the browser's ⌘J / downloads stays out of the way); dropped the Space + `document.activeElement === document.body` branch. Kept Escape-to-close and the IME composition guard. The header kbd chip and bubble tooltip read `⌘J` again.

### 2026-06-14 — open shortcut changed from ⌘J to Space (non-input only)
- **Motivation**: the user wanted to open the bubble by simply pressing Space, explicitly only when not in an input state.
- **Goal**: Space opens the popup without ever interfering with typing, focused controls, or scrolling.
- **Key decisions**: dropped the ⌘J toggle; Space opens only when the popup is folded, no modifier is held, and `document.activeElement === document.body` (nothing interactive/editable focused). `preventDefault` runs only when we actually open. Kept Escape-to-close and the IME composition guard. The header kbd chip and bubble tooltip now read `"空格"` ("Space").

### 2026-06-14 — IME-safe Escape / Enter (composition guard)
- **Motivation**: under a Chinese IME the Esc that cancels an in-progress composition was also closing the popup (and Enter while picking a candidate would prematurely send). `KeyboardEvent.isComposing` is unreliable for Escape across browsers.
- **Fix**: track composition state ourselves via `onCompositionStart` / `onCompositionEnd` on the textarea (a `composingRef`); the window keydown handler and the Enter-to-send guard both bail while `composingRef.current` is true (with `isComposing` / keyCode 229 as fallback). So the first Esc only cancels the IME; Esc closes the popup on a single press when not composing, and Enter only sends once a candidate is committed.

### 2026-06-14 — Escape closes the popup
- **Motivation**: the user asked that Escape also dismiss the popup, matching the standard "close overlay" gesture.
- **Change**: the same widget `keydown` listener now closes the popup on `Escape` when it's open; the close button's tooltip notes `Esc`.

### 2026-06-14 — ⌘J keyboard shortcut + discoverability
- **Motivation**: the user asked for a simple keyboard shortcut to open the bottom-right quick-chat bubble, and a place to tell users about it.
- **Goal**: toggle the popup with ⌘J / Ctrl+J without a mouse, and make the binding discoverable rather than hidden.
- **Key decisions**: a `keydown` listener lives in the widget itself (co-located with toggle/focus, auto-guarded by the existing chat/settings `hidden` check) instead of the shell's ⌘N handler in `_app.tsx`; it `preventDefault`s so the browser's ⌘J (downloads) doesn't fire. The shortcut is announced via the bubble tooltip + an `⌘J` kbd chip in the popup header (styled to match the sidebar's existing `⌘N` chip). Opening now auto-focuses the composer.

### 2026-06-14 — customer-service widget (was docked right rail)
- **Motivation**: the user asked for a customer-service-style chat — a folded-by-default bubble that opens a popup which stays open, and re-clicking the bubble closes it.
- **Goal**: replace the docked, grid-column right rail with a floating launcher bubble + popup that overlays content.
- **Key decisions**: `rightCollapsed` now means "widget folded" and defaults to `true`; the bubble toggles it; the popup (`.nb-qc-pop`) and bubble (`.nb-qc-bubble`) are fixed-position (new `quickchat.css`), reusing the existing panel internals; the layout dropped the `with-rightchat` grid column and FloatingControls dropped its re-open button (the bubble replaces it).

### 2026-06-13 — also hidden on the /settings page
- **Motivation**: settings became its own route; the docked quick-chat panel
  should not appear on a configuration page.
- **Change**: the null-return guard now covers `view === 'settings'` too,
  matching the layout's `with-rightchat` condition.

### 2026-06-13 — docked right-hand panel (was floating composer + slide-up overlay)
- **Motivation**: the user asked that only the chat page keep the centered
  bottom composer; every other page should show a right sidebar with both the
  chat messages and the input.
- **Goal**: turn the global floating quick-chat into a persistent right column
  that stacks header → context chip → message feed → composer.
- **Key decisions**: dropped the slide-up overlay, the per-conversation
  expand/collapse chevron and the `quickOpen` store flag (the feed is always
  visible now); added a centered empty state for the pre-first-message panel;
  the "Open in chat" handoff stays (icon-only) and appears once the conversation
  has messages; a `panelRight` header button collapses the entire panel
  (`setRightCollapsed`), re-opened from FloatingControls' top-right control.

### 2026-06-12 — created
- **Motivation**: user requirement that the floating input and chat popup be global (present everywhere), and that the AI know what the user is currently viewing.

### 2026-06-12 — created-state from persisted tasks
- **Motivation**: same reload issue as ChatView — suggestion cards in the
  quick-chat overlay now treat ids present in the persisted task list as
  already created.

### 2026-06-12 — focus & keyboard fixes
- **Motivation**: UI-detail review — focus was lost after clicking send or the expand button, and the overlay had no keyboard way to collapse.
- **Changes**: refocus the input after a button-click send; Escape collapses the overlay; expanding via the chevron keeps focus in the input.

### 2026-06-12 — drop task-card plumbing
- **Motivation**: MessageView became text-only; removed the createdTaskIds/createTask wiring and the knownTaskIds memo.
