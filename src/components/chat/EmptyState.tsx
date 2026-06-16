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
//   2026-06-15  Wired i18n (Phase 1): heading, subtitle, and starter chip
//               labels now use useT() so they translate when locale switches.
//   2026-06-15  Added scenario starter chips (richer empty state).

import { useT } from '../../lib/i18n/LocaleContext';
import { Icons } from '../../icons/icons';

// Starter prompt prompts — the actual prompt text sent to the model stays in
// Chinese (it is a NL seed to the AI, not a UI label). Only the visible chip
// label is translated via i18n.
const STARTERS = [
  { icon: 'coins' as const, labelKey: 'emptyState.starters.gold' as const, prompt: '帮我盯着黄金价格，超过 3200 美元时通知我' },
  { icon: 'news' as const, labelKey: 'emptyState.starters.hn' as const, prompt: '帮我每天早上 9 点推送 Hacker News 热门文章' },
  { icon: 'bolt' as const, labelKey: 'emptyState.starters.keyword' as const, prompt: '帮我监控"AI 新闻"关键词，有新内容时通知我' },
  { icon: 'bell' as const, labelKey: 'emptyState.starters.reminder' as const, prompt: '帮我每天早上 8 点发一条提醒，开始新的一天' },
] as const;

interface EmptyStateProps {
  /** Called with the chosen starter prompt to pre-fill the composer. */
  onSeedComposer?: (prompt: string) => void;
}

export function EmptyState({ onSeedComposer }: EmptyStateProps) {
  const { t } = useT();
  return (
    <div className="nb-empty" data-testid="new-chat-empty-state">
      <h1>{t('emptyState.heading')}</h1>
      <p className="nb-empty-sub">{t('emptyState.sub')}</p>
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
              {t(s.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
