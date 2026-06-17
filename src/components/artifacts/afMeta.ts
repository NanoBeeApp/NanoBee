// afMeta.ts — display metadata + small adapters for the Artifacts (数据视图)
// surface: per-source badge/icon/colour, the card-template kind a source maps
// to, and helpers that turn a generic DataViewItem into the fields the
// generative card templates render. Centralized so the gallery card, the detail
// header and every card template read source styling from one place.
import type { DataViewItem } from '../../artifacts/types';
import type { IconName } from '../../types';

export interface AfSource {
  label: string;
  icon: IconName;
  /** Solid colour for the badge text + card icon. */
  color: string;
  /** Soft tint paired with `color`. */
  soft: string;
}

/** Data-hub source id → display styling. */
export const AF_SOURCES: Record<string, AfSource> = {
  hackernews: { label: 'Hacker News', icon: 'news', color: '#ff6a3d', soft: '#fff0e8' },
  news: { label: '财经新闻', icon: 'globe', color: '#635bff', soft: '#efeefe' },
  websearch: { label: '网络搜索', icon: 'search', color: '#2563b3', soft: '#e3edf9' },
  gold: { label: '黄金', icon: 'coins', color: '#d4a64a', soft: '#f9efd6' },
  stocks: { label: '行情数据', icon: 'bars', color: '#1a7f55', soft: '#e2f3eb' },
  crypto: { label: '加密货币', icon: 'coins', color: '#b6791e', soft: '#fbf0d9' },
  forex: { label: '外汇', icon: 'trend', color: '#2563b3', soft: '#e3edf9' },
  treasury: { label: '美债', icon: 'bars', color: '#5a5e6b', soft: '#eceef2' },
  'econ-calendar': { label: '经济日历', icon: 'calendar', color: '#635bff', soft: '#efeefe' },
  webpage: { label: '网页', icon: 'globe', color: '#5a5e6b', soft: '#eceef2' },
  twitter: { label: 'X / Twitter', icon: 'at', color: '#0f1117', soft: '#eceef2' },
};

/** Source styling with a safe fallback for unknown ids. */
export function afSource(id: string): AfSource {
  return AF_SOURCES[id] ?? { label: id, icon: 'grid', color: '#5a5e6b', soft: '#eceef2' };
}

/** The card-template kind a source's items render with. Real DataViewItems are
 *  generic (title + summary + meta), so we only map to the two templates that
 *  fit that shape; quote/tweet exist for richer source-specific payloads. */
export type AfTpl = 'hn' | 'news' | 'quote' | 'tweet';
export function tplForSource(id: string): AfTpl {
  return id === 'hackernews' ? 'hn' : 'news';
}

/** Best-effort relative-time label from an ISO/string timestamp. */
export function relTime(ts?: string): string | null {
  if (!ts) return null;
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  return `${Math.round(hrs / 24)} 天前`;
}

/** Bare hostname from a URL, for the HN-card domain line. */
export function domainOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** The one-line meta for the uniform list row, per template kind. */
export function itemMetaLine(tpl: AfTpl, item: DataViewItem, sourceLabel: string): string {
  const time = relTime(item.itemCreatedAt);
  if (tpl === 'hn') {
    return [
      item.points != null ? `${item.points} 分` : null,
      item.comments != null ? `${item.comments} 评论` : null,
      domainOf(item.url),
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return [sourceLabel, time].filter(Boolean).join(' · ');
}
