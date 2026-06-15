// The body under the Artifacts tab bar. Picks what to show for the active tab:
//   mine       — your generated decks; empty → an empty state + a "为你推荐" strip
//   favorites  — your favorited decks; empty → an empty state + the same strip
//   <category> — that category's recommended one-click templates
// It owns the store wiring (open / favorite / delete / generate); the tiles
// (ArtifactCard / RecommendedCard) stay pure.
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import type { IconName } from '../../types';
import {
  ARTIFACT_CATEGORIES,
  recommendedForYou,
  templatesForCategory,
  type RecommendedTemplate,
} from '../../artifacts/recommended';
import { ArtifactCard } from './ArtifactCard';
import { RecommendedCard } from './RecommendedCard';

/** Resolve a category id to its tab icon (fallback: a generic spark). */
function categoryIcon(categoryId: string): IconName {
  return ARTIFACT_CATEGORIES.find((c) => c.id === categoryId)?.icon ?? 'spark';
}

interface Props {
  tab: string;
}

export function ArtifactGallery({ tab }: Props) {
  const artifacts = useAppStore((s) => s.artifacts);
  const generating = useAppStore((s) => s.artifactGenerating);
  const selectArtifact = useAppStore((s) => s.selectArtifact);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);
  const runArtifactShortcut = useAppStore((s) => s.runArtifactShortcut);

  const isCategory = ARTIFACT_CATEGORIES.some((c) => c.id === tab);

  /** A grid of recommended templates (used by categories + empty states). */
  const renderTemplates = (templates: RecommendedTemplate[]): ReactNode => (
    <div className="nb-arti-grid" data-testid="recommended-grid">
      {templates.map((t) => (
        <RecommendedCard
          key={t.id}
          template={t}
          icon={categoryIcon(t.categoryId)}
          onRun={(prompt) => void runArtifactShortcut(prompt)}
          disabled={generating}
        />
      ))}
    </div>
  );

  /** A grid of owned artifacts. */
  const renderOwned = (list: typeof artifacts): ReactNode => (
    <div className="nb-arti-grid" data-testid="owned-grid">
      {list.map((a) => (
        <ArtifactCard
          key={a.id}
          artifact={a}
          onOpen={selectArtifact}
          onToggleFavorite={toggleFavorite}
          onDelete={deleteArtifact}
        />
      ))}
    </div>
  );

  /** The "为你推荐" strip shown below an empty personal tab. */
  const recommendedStrip = (
    <div className="nb-arti-section" data-testid="recommended-section">
      <div className="nb-arti-section-label">
        <Icons.spark size={14} /> 为你推荐 · 热门项目
      </div>
      {renderTemplates(recommendedForYou())}
    </div>
  );

  let body: ReactNode;
  if (isCategory) {
    body = renderTemplates(templatesForCategory(tab));
  } else if (tab === 'favorites') {
    const fav = artifacts.filter((a) => a.favorited);
    body = fav.length ? (
      renderOwned(fav)
    ) : (
      <>
        <div className="nb-arti-empty-block" data-testid="favorites-empty">
          <Icons.star size={28} />
          <p>还没有收藏的卡片</p>
          <p className="nb-arti-empty-sub">在「你创建的」里点 ☆ 收藏喜欢的卡片</p>
        </div>
        {recommendedStrip}
      </>
    );
  } else {
    // 'mine' (default)
    body = artifacts.length ? (
      renderOwned(artifacts)
    ) : (
      <>
        <div className="nb-arti-empty-block" data-testid="mine-empty">
          <Icons.grid size={28} />
          <p>还没有你创建的卡片</p>
          <p className="nb-arti-empty-sub">
            在对话里对 AI 说「每天教我 10 个单词」，或从下面的推荐一键生成
          </p>
        </div>
        {recommendedStrip}
      </>
    );
  }

  return (
    <div className="nb-arti-gallery" data-testid="artifacts-gallery">
      {generating && (
        <div className="nb-arti-generating" data-testid="artifact-generating">
          <Icons.spark size={16} />
          <span>AI 正在生成卡片…</span>
        </div>
      )}
      {body}
    </div>
  );
}
