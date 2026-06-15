// The body under the Artifacts tab bar. Picks what to show for the active tab
// and renders it in the active view mode (list / table / card):
//   mine       — your generated decks; empty → an empty state + a "为你推荐" strip
//   favorites  — your favorited decks; empty → an empty state + the same strip
//   <category> — that category's recommended one-click templates
// A view switch sits top-right whenever there is a switchable list. It owns the
// store wiring (open / favorite / delete / generate); the row/tile components
// (ArtifactRow / ArtifactCard / RecommendedRow / RecommendedCard) stay pure.
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import type { IconName } from '../../types';
import type { ArtifactsViewMode } from '../../routes/_app/artifacts';
import type { Artifact } from '../../artifacts/types';
import {
  ARTIFACT_CATEGORIES,
  categoryLabel,
  recommendedForYou,
  templatesForCategory,
  type RecommendedTemplate,
} from '../../artifacts/recommended';
import { kindLabel, artifactCount } from '../../artifacts/format';
import { ArtifactCard } from './ArtifactCard';
import { ArtifactRow } from './ArtifactRow';
import { RecommendedCard } from './RecommendedCard';
import { RecommendedRow } from './RecommendedRow';
import { ArtifactsViewSwitch } from './ArtifactsViewSwitch';

/** Resolve a category id to its icon (fallback: a generic spark). */
function categoryIcon(categoryId: string): IconName {
  return ARTIFACT_CATEGORIES.find((c) => c.id === categoryId)?.icon ?? 'spark';
}

interface Props {
  tab: string;
  viewMode: ArtifactsViewMode;
  onViewModeChange: (vm: ArtifactsViewMode) => void;
}

export function ArtifactGallery({ tab, viewMode, onViewModeChange }: Props) {
  const artifacts = useAppStore((s) => s.artifacts);
  const generating = useAppStore((s) => s.artifactGenerating);
  const selectArtifact = useAppStore((s) => s.selectArtifact);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);
  const runArtifactShortcut = useAppStore((s) => s.runArtifactShortcut);

  const run = (prompt: string) => { if (!generating) void runArtifactShortcut(prompt); };
  const isCategory = ARTIFACT_CATEGORIES.some((c) => c.id === tab);

  // ---- owned artifacts (你创建的 / 你收藏的) in the active view mode ----
  const renderOwned = (list: Artifact[]): ReactNode => {
    if (viewMode === 'card') {
      return (
        <div className="nb-arti-grid" data-testid="owned-grid">
          {list.map((a) => (
            <ArtifactCard key={a.id} artifact={a} onOpen={selectArtifact}
              onToggleFavorite={toggleFavorite} onDelete={deleteArtifact} />
          ))}
        </div>
      );
    }
    if (viewMode === 'table') {
      return (
        <table className="nb-arti-table" data-testid="owned-table">
          <thead>
            <tr><th>名称</th><th>类型</th><th>数量</th><th className="nb-arti-th-r">操作</th></tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="nb-arti-trow" onClick={() => selectArtifact(a.id)}
                data-testid={`artifact-row-${a.id}`}>
                <td>
                  <span className="nb-arti-tcell-title">
                    <span className="nb-arti-row-ic"><Icons.grid size={15} /></span>{a.title}
                  </span>
                </td>
                <td className="nb-arti-td-dim">{kindLabel(a.kind)}</td>
                <td className="nb-arti-td-dim">{artifactCount(a)}</td>
                <td className="nb-arti-th-r">
                  <div className="nb-arti-row-actions">
                    <button className={`nb-arti-card-fav${a.favorited ? ' on' : ''}`}
                      title={a.favorited ? '取消收藏' : '收藏'}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(a.id); }}
                      data-testid={`artifact-favorite-${a.id}`}>
                      <Icons.star size={15} />
                    </button>
                    <button className="nb-arti-card-del" title="删除"
                      onClick={(e) => { e.stopPropagation(); deleteArtifact(a.id); }}
                      data-testid={`artifact-card-delete-${a.id}`}>
                      <Icons.x size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    // list (default)
    return (
      <div className="nb-arti-list" data-testid="owned-list">
        {list.map((a) => (
          <ArtifactRow key={a.id} artifact={a} onOpen={selectArtifact}
            onToggleFavorite={toggleFavorite} onDelete={deleteArtifact} />
        ))}
      </div>
    );
  };

  // ---- recommended templates (categories + empty-state strip) ----
  const renderTemplates = (templates: RecommendedTemplate[]): ReactNode => {
    if (viewMode === 'card') {
      return (
        <div className="nb-arti-grid" data-testid="recommended-grid">
          {templates.map((t) => (
            <RecommendedCard key={t.id} template={t} icon={categoryIcon(t.categoryId)}
              onRun={run} disabled={generating} />
          ))}
        </div>
      );
    }
    if (viewMode === 'table') {
      return (
        <table className="nb-arti-table" data-testid="recommended-table">
          <thead>
            <tr><th>模板</th><th>分类</th><th>说明</th><th className="nb-arti-th-r">操作</th></tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const Icon = Icons[categoryIcon(t.categoryId)];
              return (
                <tr key={t.id} className={`nb-arti-trow${generating ? ' is-disabled' : ''}`}
                  onClick={() => run(t.prompt)} data-testid={`recommended-row-${t.id}`}>
                  <td>
                    <span className="nb-arti-tcell-title">
                      <span className="nb-rec-row-ic"><Icon size={15} /></span>{t.title}
                      {t.badge && <span className="nb-rec-card-badge">{t.badge}</span>}
                    </span>
                  </td>
                  <td className="nb-arti-td-dim">{categoryLabel(t.categoryId)}</td>
                  <td className="nb-arti-td-dim">{t.subtitle}</td>
                  <td className="nb-arti-th-r"><span className="nb-rec-row-go"><Icons.plus size={14} /> 生成</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    // list (default)
    return (
      <div className="nb-arti-list" data-testid="recommended-list">
        {templates.map((t) => (
          <RecommendedRow key={t.id} template={t} icon={categoryIcon(t.categoryId)}
            onRun={run} disabled={generating} />
        ))}
      </div>
    );
  };

  /** The "为你推荐" strip shown below an empty personal tab. */
  const recommendedStrip = (
    <div className="nb-arti-section" data-testid="recommended-section">
      <div className="nb-arti-section-label">
        <Icons.spark size={14} /> 为你推荐 · 热门项目
      </div>
      {renderTemplates(recommendedForYou())}
    </div>
  );

  // Decide body + whether the view switch is shown (only when there is a
  // switchable list — not on a bare empty state).
  let body: ReactNode;
  let showSwitch = false;
  if (isCategory) {
    const templates = templatesForCategory(tab);
    showSwitch = templates.length > 0;
    body = renderTemplates(templates);
  } else {
    const owned = tab === 'favorites' ? artifacts.filter((a) => a.favorited) : artifacts;
    if (owned.length) {
      showSwitch = true;
      body = renderOwned(owned);
    } else if (tab === 'favorites') {
      body = (
        <>
          <div className="nb-arti-empty-block" data-testid="favorites-empty">
            <Icons.star size={28} />
            <p>还没有收藏的数据视图</p>
            <p className="nb-arti-empty-sub">在「你创建的」里点 ☆ 收藏喜欢的数据视图</p>
          </div>
          {recommendedStrip}
        </>
      );
    } else {
      body = (
        <>
          <div className="nb-arti-empty-block" data-testid="mine-empty">
            <Icons.grid size={28} />
            <p>还没有你创建的数据视图</p>
            <p className="nb-arti-empty-sub">
              从下方推荐模板一键生成，或在聊天里描述你想持续关注什么
            </p>
          </div>
          {recommendedStrip}
        </>
      );
    }
  }

  return (
    <div className="nb-arti-gallery" data-testid="artifacts-gallery">
      {generating && (
        <div className="nb-arti-generating" data-testid="artifact-generating">
          <Icons.spark size={16} />
          <span>AI 正在创建数据视图…</span>
        </div>
      )}
      {showSwitch && (
        <div className="nb-arti-toolbar">
          <ArtifactsViewSwitch value={viewMode} onChange={onViewModeChange} />
        </div>
      )}
      {body}
    </div>
  );
}
