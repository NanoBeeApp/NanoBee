# src/components/quickchat/QuickChat.tsx

## Responsibility
Quick-chat assistant, present on every non-chat surface (today / tasks / artifacts / research). It docks as a **collapsible right sidebar** — a real grid column (`.nb-rightchat`) on today/tasks/artifacts, a fixed overlay floating over the position-stable research canvas. **No header bar.** When open, top-to-bottom: a single top row (`.nb-rc-top`) with the optional context chip (`"正在看 · …"` ("Now viewing · …") with clear button) on the **left** sharing the row with a minimal control cluster (`.nb-rc-tools` — collapse chevron, plus an `"在聊天页打开"` ("Open in chat") handoff once there are messages) pinned **right**; then the message feed reusing MessageView (or a centered empty state), and the composer. When collapsed, the panel is gone and only a small re-open button (`.nb-rc-reopen`) stays pinned to the **top-right corner** — the same fixed spot as the open-state collapse chevron, so the toggle never moves between states. The collapsed-button styles live in `styles/quickchat.css`; the panel internals (`.nb-rightchat` / `.nb-rc-*` / `.nb-qc`) live in app.css.

## Dependencies
- Upstream: store, icons, MessageView, ThinkingIndicator, `lib/useImeComposition`, `styles/quickchat.css`
- Downstream: `_app` layout (renders it as the `.nb-rightchat` grid child; the shell adds the `with-rightchat` / `right-collapsed` classes — keep that condition in sync with this component's `hidden` guard)

## Key notes
- Returns null on the chat view (centered bottom composer is the quick chat's "full form") and on the settings page (a configuration surface). The shell's `withRightChat` flag mirrors this exact condition.
- Collapsed by default (`rightCollapsed` starts `true`): only the top-right re-open button shows, keeping the content area maximal. The button toggles `rightCollapsed`; while open (`!rightCollapsed`) the docked panel renders and stays open until the collapse chevron, Escape or ⌘J folds it. The collapsed button and the open-state collapse chevron occupy the **same top-right position** (both `top:8px/right:8px`, 28×28), so the toggle never jumps when you open/close the panel.
- **⌘J / Ctrl+J toggles the sidebar, and Escape collapses it when open** (the listener is inert on the chat / settings surfaces where the widget isn't rendered). It `preventDefault`s so the browser's own ⌘J (downloads) stays out of the way while the app owns it. The shortcut is surfaced via the tab's and the collapse button's tooltips. Opening (via the shortcut or a tab click) auto-focuses the composer.
- On the research canvas the docked column is lifted into a fixed right-edge overlay (app.css `.research-canvas .nb-rightchat`) so opening/closing it never resizes or shifts the canvas; on the other surfaces it pushes content as the grid's third column.
- The feed pins to the bottom on new messages, on the pending indicator, and whenever the sidebar (re)opens.
- Quick conversations get session metadata so they appear in the sidebar's `"刚刚"` ("Just now") group.

## Change history

### 2026-06-25 — toggle button stays in one fixed top-right spot
- **Motivation**: the expand/collapse control jumped between two positions —
  collapsed, the `.nb-rc-reopen` re-open tab clung to the **vertical centre** of
  the right edge (`top:50%`); open, the collapse chevron sat at the panel's
  **top-right**. Toggling made the button hop. The user asked for it to be fixed
  in one place: the top-right corner, in both states.
- **Change**: re-pinned `.nb-rc-reopen` (in `quickchat.css`) from the centred
  right-edge tab to `top:8px / right:8px`, 28×28 — pixel-aligned with the
  open-state `.nb-rc-tools` collapse chevron (which sits at the same offset via
  `.nb-rc-top`'s padding), so the control occupies one stable top-right position
  across open/collapsed. Restyled it from the slim rounded-left tab into a
  compact square button with the translucent floating-control treatment (matches
  app.css `.fbtn`) so it stays discoverable over the content/canvas behind it.
  Icon size matched to the collapse chevron (17). Behaviour, tooltip and the
  `expand-right-chat` test-id are unchanged.

### 2026-06-25 — context chip shares the top row with the toggle button
- **Motivation**: the `"正在看 · 研究画布"` chip rendered on its own row
  (`.nb-rc-ctx`) below the control cluster, leaving the panel's top-right
  toggle button visually stranded on an empty line above it. The user pointed
  out the chip belongs on the **same row** as the sidebar toggle.
- **Change**: merged `.nb-rc-tools` and the former `.nb-rc-ctx` into one flex
  top row (`.nb-rc-top`): the chip sits on the left, the control cluster keeps
  itself pinned right via `margin-left:auto` (so the toggle stays put whether or
  not the chip is present). Removed the standalone `.nb-rc-ctx` rule from
  app.css. Behaviour, tooltips and test-ids are unchanged.

### 2026-06-18 — panel-toggle icon (match the left rail) + D shortcut
- **Motivation**: the right sidebar's collapse / re-open buttons used `chevR`
  (a chevron), which didn't read as a "panel" the way the left rail's
  `panelLeft` toggle does. The user asked the right popup's icon to match the
  left one.
- **Change**: swapped both the `.nb-rc-tools` collapse button and the
  `.nb-rc-reopen` edge tab from `Icons.chevR` to `Icons.panelRight` (the mirror
  of the rail's `panelLeft`), and dropped the now-unneeded `transform:
  rotate(180deg)` on `.nb-rc-reopen svg` in `quickchat.css`. The global `D`
  shortcut (see `_app.tsx` / `lib/shortcuts.ts`) now also toggles this rail,
  alongside the existing ⌘J / Esc.

### 2026-06-18 — collapsible right sidebar (was bottom-right bubble + popup)
- **Motivation**: on the research canvas the bottom-right launcher bubble + popup
  read as a customer-service widget floating over the work; the user asked for a
  proper right sidebar chat that can collapse, with no header bar and a minimal
  look.
- **Goal**: dock the assistant as a right rail (a grid column on
  today/tasks/artifacts, a fixed overlay over the position-stable research
  canvas), collapsible to a slim edge tab, with the header removed.
- **Key decisions**: reinstated the docked `.nb-rightchat` panel (its styles +
  the `with-rightchat` / `right-collapsed` / research-canvas-overlay rules were
  still in app.css from the pre-bubble era) and re-added the shell classes in
  `_app.tsx` (`withRightChat = view !== 'chat' && 'settings'`, matching the
  component's `hidden` guard). Dropped the `.nb-rc-head` header bar (title / bee
  glyph / ⌘J chip) and the floating bubble + popup; replaced them with a minimal
  `.nb-rc-tools` cluster (collapse chevron + the existing open-in-chat handoff)
  and a `.nb-rc-reopen` edge tab for the collapsed state. Kept `rightCollapsed`
  semantics (still defaults `true` → collapsed, content area stays maximal), the
  ⌘J toggle / Esc collapse, the IME guard, the context chip, the feed and the
  composer unchanged. Removed the now-dead `.nb-qc-bubble` / `.nb-qc-pop` /
  `.nb-rc-head` / `.nb-rc-glyph` CSS and the stale `.nb-qc-launcher`/`.nb-qc-popup`
  mobile rules; mobile now floats `.nb-rightchat` as a full-screen overlay.

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
