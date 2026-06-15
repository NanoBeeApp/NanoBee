# src/components/chat/Composer.tsx

## Responsibility
Main chat composer: auto-growing textarea, slash (/任务 /提醒 /盯盘 /早报) popover, toolbar (attach / slash / voice / model) and send button. The `@` mention popover was removed along with the hardcoded watchlist.

## Dependencies
- Upstream: icons, `lib/useImeComposition`
- Downstream: ChatView

## Key notes
- Popover triggers: exact "/" opens slash; Escape closes. The `@` mention trigger was removed (see 2026-06-15 entry).
- Enter sends, Shift+Enter adds a newline — but Enter while an IME composition is active confirms the candidate (it does not send), via the shared `useImeComposition` guard.

## Change history

### 2026-06-15 — remove hardcoded @ mention popover (MENTION_ITEMS watchlist)
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; `MENTION_ITEMS` was a hardcoded watchlist (`黄金 XAU/USD · 已关注` etc.) posing as real user data.
- Deleted the `MENTION_ITEMS` const, the `@` trigger logic in `onChange`, the mention popover JSX, and the `'mention'` branch from the `Popover` type (now `'slash' | null`).
- The placeholder text no longer mentions "@ 引用关注" since that feature is gone.
- Only the `/` slash-command popover remains; the overall composer interface is unchanged.

### 2026-06-15 — remove the quick-suggestion chip row entirely
- **Motivation**: user asked to drop the chip block ("设一个提醒" / "帮我盯着这个" / "每天给我摘要" in a topic, and the welcome-state variant). The chips duplicated actions already reachable via slash commands and added visual noise above the composer.
- **Change**: deleted the `nb-suggest-row` JSX, the `quick` variant array, and the `.nb-suggest-row` CSS. With the chips gone, the `showQuick` and `topic` props became dead, so both were removed from `ComposerProps` (and the now-unused `Topic` import dropped). `ChatView` no longer computes `topic` / subscribes to `activeTopicId` / imports `topicById`, since they only fed the chip variant.
- **Key decision**: full removal rather than hiding behind a flag — there was no remaining caller that wanted the chips, so keeping the prop would have been dead code.
- **Motivation**: under a Chinese IME, pressing Enter to confirm a pinyin
  candidate was captured as "send", firing the message before the word was even
  committed. This composer's `onKeyDown` checked only `Enter && !Shift`, with no
  composition guard.
- **Fix**: route Enter through the new shared `useImeComposition` hook —
  `isSubmitEnter(e)` is false while composing, and `compositionProps` is spread
  onto the textarea. Same guard now used by QuickChat and ResearchWelcome.

### 2026-06-14 — consume the one-shot composer seed
- **Motivation**: the sidebar's page-aware "新建任务" / "新建 Artifact" actions
  open a fresh chat that should land pre-filled with a starter prompt the user
  finishes typing (tasks/artifacts are created by talking to the AI).
- **Change**: the seed actions set `composerSeed` in the store *before*
  navigating here, so the composer always mounts fresh with the seed already
  present. We read it once into the initial `val` (lazy `useState` + a
  `seededRef`) rather than mirroring store → state through an effect; the mount
  effect only clears the one-shot seed (`clearComposerSeed`), focuses, places the
  caret at the end and grows the textarea. Plain "新建对话" leaves the seed null,
  so an un-seeded new chat behaves exactly as before. (Reading at mount, not via
  a `setState`-in-effect, also keeps `react-hooks/set-state-in-effect` happy.)

### 2026-06-12 — created
- **Motivation**: PRD requires full ChatGPT-style chat plus task creation entry points in the composer.

### 2026-06-12 — add `showQuick` prop to suppress chip row
- **Motivation**: the three quick-suggestion chips on the welcome/empty state ("帮我关注金价" / "盯着孩子的作业" / "每天来份早报") duplicate the four guide cards above, creating visual redundancy and diluting focus.
- **Goal**: let callers hide the chip row without deleting it — chips are still useful in an active conversation where no guide cards are present.
- **Key decision**: introduce an opt-in `showQuick?: boolean` prop (default `true`) instead of deleting the chip row outright. This preserves the chip UX for ongoing conversations; only the empty-state branch passes `showQuick={false}`.

### 2026-06-12 — focus & popover interaction fixes
- **Motivation**: user feedback — clicking "新对话" left the input unfocused; small interaction papercuts surfaced during a UI-detail review.
- **Changes**: auto-focus the textarea on mount and whenever `activeChatId` changes; refocus after clicking the send button; the toolbar "/" button now toggles the popover and focuses the input; the slash popover only stays open while the text still looks like a command being typed (starts with "/", no space) instead of whenever "/" appears anywhere.
