// Detail surface for a data view (the core Artifacts feature). Header (title +
// refresh / favorite / delete) + source/filter sub-header + a non-blocking
// pipeline status strip + a view switch (list / card / table / timeline) over
// the fetched item stream. While the pipeline is in progress it polls the store
// (loadArtifacts) every 2s and re-fetches items as they land — staged on-screen.
//
// P1 implements the list and card views; table / timeline show a placeholder.
// The detail's view mode is local state (seeded from the view's defaultView);
// the gallery's URL `vm` is separate.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../lib/api-client';
import { Icons } from '../../icons/icons';
import type { DataViewArtifact, DataViewItem } from '../../artifacts/types';
import type { DataViewMode } from '../../artifacts/feed-query';
import { sourceLabel } from '../../artifacts/format';
import { PipelineStatusBar } from './PipelineStatusBar';
import { DataViewListPane } from './DataViewListPane';
import { DataViewCard } from './DataViewCard';

interface Props {
  artifact: DataViewArtifact;
  onBack: () => void;
}

const VIEW_TABS: { mode: DataViewMode; label: string; icon: keyof typeof Icons }[] = [
  { mode: 'list', label: '列表', icon: 'list' },
  { mode: 'card', label: '卡片', icon: 'grid' },
  { mode: 'table', label: '表格', icon: 'table' },
  { mode: 'timeline', label: '时间线', icon: 'feed' },
];

export function DataViewDetail({ artifact, onBack }: Props) {
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);
  const loadArtifacts = useAppStore((s) => s.loadArtifacts);
  const toast = useAppStore((s) => s.toast);

  const [vm, setVm] = useState<DataViewMode>(artifact.defaultView ?? 'card');
  const [items, setItems] = useState<DataViewItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const inProgress =
    artifact.pipelineStatus === 'pending' || artifact.pipelineStatus === 'fetching';

  // Poll the artifact list while the pipeline runs so status/itemCount update.
  useEffect(() => {
    if (!inProgress) return;
    const t = setInterval(() => { void loadArtifacts(); }, 2000);
    return () => clearInterval(t);
  }, [inProgress, loadArtifacts]);

  // (Re)fetch items when the view opens, status changes, or new items land.
  useEffect(() => {
    let cancelled = false;
    async function load() {
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
    }
    void load();
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

  const ready = artifact.pipelineStatus === 'ready';
  const empty = ready && items.length === 0 && !itemsLoading;

  return (
    <div className="nb-arti-detail-scroll" data-testid="data-view-detail">
      <button className="nb-arti-back" onClick={onBack} data-testid="artifact-back">
        <Icons.chevR size={15} style={{ transform: 'rotate(180deg)' }} /> 返回
      </button>

      <div className="nb-dv-head">
        <h2 className="nb-dv-title">{artifact.title}</h2>
        <div className="nb-arti-detail-actions">
          <button className="nb-dv-icon-btn" onClick={onRefresh} title="刷新" data-testid="data-view-refresh">
            <Icons.redo size={15} />
          </button>
          <button
            className={`nb-arti-card-fav${artifact.favorited ? ' on' : ''}`}
            onClick={() => toggleFavorite(artifact.id)}
            title={artifact.favorited ? '取消收藏' : '收藏'}
            data-testid="artifact-detail-favorite">
            <Icons.star size={16} />
          </button>
          <button
            className="nb-arti-delete"
            onClick={() => { deleteArtifact(artifact.id); onBack(); }}
            title="删除此数据视图"
            data-testid="artifact-delete-button">
            <Icons.x size={15} />
          </button>
        </div>
      </div>

      <div className="nb-dv-subhead">
        <span className="nb-dv-source-badge">{sourceLabel(artifact.source)}</span>
        {artifact.query?.filter?.topic && (
          <span className="nb-dv-chip">主题：{artifact.query.filter.topic}</span>
        )}
        <span className="nb-dv-dot">·</span>
        <span className="nb-dv-meta">{artifact.itemCount} 条</span>
      </div>

      <PipelineStatusBar status={artifact.pipelineStatus} errorText={artifact.errorText} />

      <div className="nb-dv-switch" role="tablist" data-testid="data-view-switch">
        {VIEW_TABS.map((t) => {
          const Icon = Icons[t.icon];
          return (
            <button
              key={t.mode}
              role="tab"
              aria-selected={vm === t.mode}
              className={`nb-dv-switch-btn${vm === t.mode ? ' active' : ''}`}
              onClick={() => setVm(t.mode)}
              data-testid={`data-view-switch-${t.mode}`}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {empty ? (
        <div className="nb-arti-empty-block" data-testid="data-view-empty">
          <Icons.feed size={26} />
          <p>这个数据视图暂时没有内容</p>
          <p className="nb-arti-empty-sub">点右上角刷新按钮再试一次，或换个更宽的主题</p>
        </div>
      ) : vm === 'list' ? (
        <DataViewListPane items={items} />
      ) : vm === 'card' ? (
        <div className="nb-dv-grid" data-testid="data-view-cards">
          {items.map((item) => <DataViewCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="nb-arti-empty-block" data-testid="data-view-soon">
          <Icons.spark size={24} />
          <p>{vm === 'table' ? '表格' : '时间线'}视图即将上线</p>
          <p className="nb-arti-empty-sub">先用列表或卡片视图查看内容</p>
        </div>
      )}
    </div>
  );
}
