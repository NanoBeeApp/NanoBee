// DataViewDetail.tsx — the detail surface for one data view, rebuilt to the
// NanoBee design: header (back + source icon + title + source/filter + favorite/
// refresh/delete), a derived "概览" block, a non-blocking pipeline stepper while
// the async fetch runs, a count + card/list toolbar, and the item stream
// rendered with the generative card templates (or a uniform list). While the
// pipeline runs it polls the store and re-fetches items as they land (staged
// on-screen: skeleton → items).
//
// The overview / pipeline are derived from the real pipelineStatus + items (the
// backend does not store an AI overview), so the surface stays honest while
// matching the design. Card vs list is the URL `vm` so it survives a refresh.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../lib/api-client';
import { Icons } from '../../icons/icons';
import type { DataViewArtifact, DataViewItem, PipelineStatus } from '../../artifacts/types';
import type { ArtifactsViewMode } from '../../routes/_app/artifacts';
import { afSource, relTime, tplForSource } from './afMeta';
import { AFCard, AFListRow, AFSkeletonCard, AFSourceBadge } from './AFCards';

interface Props {
  artifact: DataViewArtifact;
  onBack: () => void;
  vm: ArtifactsViewMode;
  setVm: (vm: ArtifactsViewMode) => void;
}

/** The five visible pipeline stages, matching the design's stepper. */
const PIPELINE = [
  { id: 'fetch', label: '拉取数据' },
  { id: 'filter', label: '相关性过滤' },
  { id: 'extract', label: 'AI 抽取增强' },
  { id: 'template', label: '生成卡片模板' },
  { id: 'ready', label: '就绪' },
];

const STAGE_INDEX: Record<PipelineStatus, number> = {
  pending: 0, fetching: 0, filtering: 1, extracting: 2, templating: 3, ready: 4, error: 4,
};

function isLoading(s: PipelineStatus): boolean {
  return s === 'pending' || s === 'fetching' || s === 'filtering' || s === 'extracting' || s === 'templating';
}

function Pipeline({ stageIdx }: { stageIdx: number }) {
  return (
    <div className="af-pipe">
      {PIPELINE.map((st, i) => {
        const state = i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'todo';
        return (
          <span key={st.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span className={'af-pipe-step ' + state}>
              <span className="af-pipe-dot">
                {state === 'done' ? <Icons.check size={11} /> : state === 'active' ? <span className="af-spin sm" /> : i + 1}
              </span>
              <span className="af-pipe-lbl">{st.label}</span>
            </span>
            {i < PIPELINE.length - 1 && <span className={'af-pipe-line ' + (i < stageIdx ? 'done' : '')} />}
          </span>
        );
      })}
    </div>
  );
}

export function DataViewDetail({ artifact, onBack, vm, setVm }: Props) {
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);
  const loadArtifacts = useAppStore((s) => s.loadArtifacts);
  const toast = useAppStore((s) => s.toast);

  const [items, setItems] = useState<DataViewItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const s = afSource(artifact.source);
  const SrcIcon = Icons[s.icon] ?? Icons.grid;
  const tpl = tplForSource(artifact.source);
  const loading = isLoading(artifact.pipelineStatus);
  const stageIdx = STAGE_INDEX[artifact.pipelineStatus] ?? 0;
  const filter = artifact.query?.filter?.topic || artifact.query?.title || '全部';
  // Card vs list (drop 'table' — the design's item view is binary).
  const itemVm: 'card' | 'list' = vm === 'list' ? 'list' : 'card';

  // Poll the artifact list while the pipeline runs so status/itemCount update.
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => { void loadArtifacts(); }, 2000);
    return () => clearInterval(t);
  }, [loading, loadArtifacts]);

  // (Re)fetch items when the view opens, status changes, or new items land.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItemsLoading(true);
      try {
        const res = await apiClient.artifacts[':id'].items.$get({ param: { id: artifact.id } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items: DataViewItem[] };
        if (!cancelled) setItems(data.items);
      } catch (error) {
        console.error('[data-view] items load failed:', String(error));
      } finally {
        if (!cancelled) setItemsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [artifact.id, artifact.pipelineStatus, artifact.itemCount]);

  const refreshing = useRef(false);
  const onRefresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const res = await apiClient.artifacts[':id'].refresh.$post({ param: { id: artifact.id } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      void loadArtifacts();
    } catch (error) {
      console.error('[data-view] refresh failed:', String(error));
      toast('刷新失败，请重试');
    } finally {
      refreshing.current = false;
    }
  }, [artifact.id, loadArtifacts, toast]);

  const showSkeleton = loading && items.length === 0;
  const empty = !loading && items.length === 0 && !itemsLoading;
  const lastRefresh = artifact.lastFetchedAt ? relTime(artifact.lastFetchedAt) : null;
  const overview = loading
    ? '正在拉取与整理这个数据视图的内容…'
    : items.length
      ? `本数据视图已收录 ${artifact.itemCount} 条来自「${s.label}」的内容，并按「${filter}」整理。`
      : `数据视图已就绪，按「${filter}」从「${s.label}」拉取，暂未匹配到内容。`;

  return (
    <div className="af-detail" data-testid="data-view-detail">
      <button className="af-back" onClick={onBack} data-testid="artifact-back">
        <Icons.chevR size={15} style={{ transform: 'rotate(180deg)' }} /> 返回
      </button>

      <div className="af-dh-title-row">
        <span className="af-dh-ic" style={{ background: s.soft, color: s.color }}><SrcIcon size={19} /></span>
        <div className="af-dh-titles">
          <h1>{artifact.title}</h1>
          <div className="af-dh-sub">
            <AFSourceBadge source={artifact.source} />
            <span className="af-dh-filter">口径：{filter}</span>
          </div>
        </div>
        <div className="af-dh-actions">
          <button
            className={'af-iconbtn' + (artifact.favorited ? ' on' : '')}
            title={artifact.favorited ? '取消收藏' : '收藏'}
            onClick={() => toggleFavorite(artifact.id)}
            data-testid="artifact-detail-favorite"
          >
            <Icons.star size={16} />
          </button>
          <button className="af-iconbtn" title="刷新" onClick={onRefresh} disabled={loading} data-testid="data-view-refresh">
            <Icons.redo size={15} />
          </button>
          <button
            className="af-iconbtn"
            title="删除此数据视图"
            onClick={() => { deleteArtifact(artifact.id); onBack(); }}
            data-testid="artifact-delete-button"
          >
            <Icons.x size={15} />
          </button>
        </div>
      </div>

      <div className="af-dh-bindings">
        <span className="af-bind"><Icons.clock size={13} />{lastRefresh ? `上次刷新 · ${lastRefresh}` : '尚未刷新'}</span>
        {artifact.topicId && <span className="af-bind"><Icons.news size={13} />新内容汇入今日页</span>}
      </div>

      {/* derived overview */}
      <div className="af-overview">
        <div className="af-ov-head">
          <span className="af-ov-ic"><Icons.bee size={14} /></span>
          <span className="af-ov-label">概览</span>
          {loading ? (
            <span className="af-ov-stat enhancing"><span className="af-spin sm" />整理中</span>
          ) : (
            <span className="af-ov-stat ready"><Icons.check size={12} />已就绪</span>
          )}
          <span className="af-ov-time">{loading ? '正在生成…' : lastRefresh ? `更新于 ${lastRefresh}` : ''}</span>
        </div>
        <p className="af-ov-text">{overview}</p>
        {!loading && items.length > 0 && (
          <div className="af-ov-tags">
            <span className="af-ov-tag">{s.label}<b>{artifact.itemCount}</b></span>
          </div>
        )}
      </div>

      {/* pipeline (only while loading) */}
      {loading && <Pipeline stageIdx={stageIdx} />}

      {/* toolbar */}
      <div className="af-dtoolbar">
        <div className="af-dt-count">
          {loading ? '正在拉取…' : `全部 ${artifact.itemCount} 条`}
          {!loading && items.length > 0 && items.length < artifact.itemCount && (
            <span className="af-dt-more"> · 显示前 {items.length} 条</span>
          )}
        </div>
        <div className="af-viewseg" data-testid="data-view-switch">
          <button className={itemVm === 'card' ? 'active' : ''} onClick={() => setVm('card')} disabled={loading} title="卡片" data-testid="data-view-switch-card">
            <Icons.grid size={15} />
          </button>
          <button className={itemVm === 'list' ? 'active' : ''} onClick={() => setVm('list')} disabled={loading} title="列表" data-testid="data-view-switch-list">
            <Icons.list size={15} />
          </button>
        </div>
      </div>

      {/* items */}
      {showSkeleton ? (
        <div className="af-grid">{[0, 1, 2, 3, 4, 5].map((i) => <AFSkeletonCard key={i} />)}</div>
      ) : empty ? (
        <div className="af-items-empty" data-testid="data-view-empty">
          <div className="af-items-empty-ic"><Icons.feed size={22} /></div>
          <p>这个数据视图暂时没有内容</p>
          <p className="sub">点右上角刷新按钮再试一次，或换个更宽的口径</p>
        </div>
      ) : itemVm === 'card' ? (
        <div className={'af-grid af-grid-' + tpl} data-testid="data-view-cards">
          {items.map((it) => <AFCard key={it.id} tpl={tpl} item={it} source={artifact.source} />)}
        </div>
      ) : (
        <div className="af-list" data-testid="data-view-list">
          {items.map((it) => <AFListRow key={it.id} tpl={tpl} item={it} source={artifact.source} />)}
        </div>
      )}
    </div>
  );
}
