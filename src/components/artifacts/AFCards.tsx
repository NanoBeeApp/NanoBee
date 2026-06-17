// AFCards.tsx — the generative-UI card templates for a data view's item stream
// plus the uniform list row and loading skeleton. Each data SHAPE gets a
// deliberately different card; the list view is one compact row across all
// shapes. Templates read a real DataViewItem with safe fallbacks (the backend
// items are generic title + summary + meta), so the Hacker-News and News
// templates carry the page; quote/tweet are kept for richer source payloads.
import type { DataViewItem } from '../../artifacts/types';
import { Icons } from '../../icons/icons';
import { afSource, domainOf, itemMetaLine, relTime, type AfTpl } from './afMeta';

/** The shared AI-summary annotation line. */
export function AFSummary({ text }: { text: string }) {
  return (
    <div className="af-aisum">
      <span className="af-aisum-ic"><Icons.bee size={12} /></span>
      <span>{text}</span>
    </div>
  );
}

/** A source badge (icon + label, soft-tinted). */
export function AFSourceBadge({ source }: { source: string }) {
  const s = afSource(source);
  const Icon = Icons[s.icon] ?? Icons.grid;
  return (
    <span className="af-srcbadge" style={{ background: s.soft, color: s.color }}>
      <Icon size={12} />
      {s.label}
    </span>
  );
}

/* ============ Template 1 · Hacker News post ============ */
function HNCard({ item }: { item: DataViewItem }) {
  const domain = domainOf(item.url);
  const time = relTime(item.itemCreatedAt);
  const inner = (
    <>
      <div className="af-hn-title">{item.title}</div>
      <div className="af-hn-meta">
        {domain && <span className="dom">{domain}</span>}
        {item.author && <><span className="sep">·</span><span>{item.author}</span></>}
        {time && <><span className="sep">·</span><span>{time}</span></>}
        {item.comments != null && (
          <><span className="sep">·</span><span className="cmts"><Icons.chat size={11} /> {item.comments}</span></>
        )}
      </div>
      {item.summary && <AFSummary text={item.summary} />}
    </>
  );
  return (
    <article className="af-card af-hn">
      <div className="af-hn-score">
        <span className="pts">{item.points ?? 0}</span>
        <span className="up"><Icons.trend size={11} /></span>
      </div>
      <div className="af-hn-main">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{inner}</a>
        ) : (
          inner
        )}
      </div>
    </article>
  );
}

/* ============ Template 4 · News article ============ */
function NewsCard({ item, source }: { item: DataViewItem; source: string }) {
  const s = afSource(source);
  const time = relTime(item.itemCreatedAt);
  const body = (
    <>
      <div className="af-news-tagrow">
        <span className="af-news-cat">{s.label}</span>
        <span className="af-news-sent" style={{ background: 'var(--ink-4)' }} title="来源" />
      </div>
      <div className="af-news-title">{item.title}</div>
      {item.summary && <AFSummary text={item.summary} />}
      <div className="af-news-meta">
        {item.author && <b>{item.author}</b>}
        {item.author && time && <span className="sep">·</span>}
        {time && <span>{time}</span>}
      </div>
    </>
  );
  return (
    <article className="af-card af-news">
      {item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'flex', flexDirection: 'column' }}>
          {body}
        </a>
      ) : (
        body
      )}
    </article>
  );
}

/** Dispatcher — picks the template from the view's data shape. */
export function AFCard({ tpl, item, source }: { tpl: AfTpl; item: DataViewItem; source: string }) {
  if (tpl === 'hn') return <HNCard item={item} />;
  return <NewsCard item={item} source={source} />;
}

/** The uniform compact list row (identical across templates). */
export function AFListRow({ tpl, item, source }: { tpl: AfTpl; item: DataViewItem; source: string }) {
  const s = afSource(source);
  const Icon = Icons[s.icon] ?? Icons.grid;
  return (
    <a
      className="af-row"
      href={item.url || undefined}
      target={item.url ? '_blank' : undefined}
      rel="noreferrer"
      data-testid={`data-view-row-${item.id}`}
    >
      <span className="af-row-ic" style={{ background: s.soft, color: s.color }}>
        <Icon size={13} />
      </span>
      <span className="af-row-title">{item.title}</span>
      <span className="af-row-sum">{item.summary ?? ''}</span>
      <span className="af-row-meta">{itemMetaLine(tpl, item, s.label)}</span>
    </a>
  );
}

/** A loading skeleton card (shown while the pipeline fetches). */
export function AFSkeletonCard() {
  return (
    <div className="af-card af-skel">
      <div className="sk-line w40" />
      <div className="sk-line w90" />
      <div className="sk-line w70" />
      <div className="sk-pill-row"><span className="sk-pill" /><span className="sk-pill" /></div>
    </div>
  );
}
