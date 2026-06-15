// Empty / new-chat state: a headline that invites the user to start a
// conversation, plus a row of scenario starter chips that pre-fill the
// composer with a task-creating prompt so the user lands in the NL loop
// without needing to know what to type.
//
// Chips call onSeedComposer(prompt) which is forwarded to the Composer via
// ChatView — the Composer fills its textarea and focuses it so the user
// edits before sending.
//
// Design: white background, amber chips, no dark elements, Radix tokens.
// Matches the minimal NanoBee aesthetic.
//
// Change history:
//   2026-06-15  Added scenario starter chips (richer empty state).

import { Icons } from '../../icons/icons';

// Representative starter prompts that pre-fill the composer and immediately
// lead into the NL → task suggestion pipeline.
const STARTERS = [
  { icon: 'coins' as const, label: '盯黄金价格', prompt: '帮我盯着黄金价格，超过 3200 美元时通知我' },
  { icon: 'news' as const, label: 'HN 每日热榜', prompt: '帮我每天早上 9 点推送 Hacker News 热门文章' },
  { icon: 'bolt' as const, label: '关键词监控', prompt: '帮我监控"AI 新闻"关键词，有新内容时通知我' },
  { icon: 'bell' as const, label: '每日提醒', prompt: '帮我每天早上 8 点发一条提醒，开始新的一天' },
] as const;

interface EmptyStateProps {
  /** Called with the chosen starter prompt to pre-fill the composer. */
  onSeedComposer?: (prompt: string) => void;
}

export function EmptyState({ onSeedComposer }: EmptyStateProps) {
  return (
    <div className="nb-empty" data-testid="new-chat-empty-state">
      <h1>聊点什么有趣的话题？</h1>
      <p className="nb-empty-sub">或者让 NanoBee 帮你盯一件事，有动态了主动通知你</p>
      <div className="nb-empty-chips" data-testid="chat-starter-chips">
        {STARTERS.map((s) => {
          const Icon = Icons[s.icon];
          return (
            <button
              key={s.prompt}
              className="nb-empty-chip"
              onClick={() => onSeedComposer?.(s.prompt)}
              data-testid={`chat-starter-${s.icon}`}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
