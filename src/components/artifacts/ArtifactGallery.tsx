// ArtifactGallery.tsx — the body under the Artifacts tab bar. Picks what to show
// for the active tab:
//   mine       — your data views as a card grid; empty → an empty state + a
//                "为你推荐" strip of one-click templates
//   favorites  — your favorited views; empty → an empty state + the same strip
//   <category> — that category's recommended one-click templates
// The gallery is always a card grid (the design has no list/table switch here);
// it owns the store wiring (open / favorite / delete / generate) while the card
// components stay pure.
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import type { IconName } from '../../types';
import type { Artifact } from '../../artifacts/types';
import {
  ARTIFACT_CATEGORIES,
  categoryLabel,
  recommendedForYou,
  templatesForCategory,
  type RecommendedTemplate,
} from '../../artifacts/recommended';
import { ArtifactViewCard } from './ArtifactViewCard';
import { ArtifactRecoCard } from './ArtifactRecoCard';

/** Resolve a category id to its icon (fallback: a generic spark). */
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

  const run = (prompt: string) => { if (!generating) void runArtifactShortcut(prompt); };
  const isCategory = ARTIFACT_CATEGORIES.some((c) => c.id === tab);

  const ownedGrid = (list: Artifact[]): ReactNode => (
    <div className="af-vgrid" data-testid="owned-grid">
      {list.map((a) => (
        <ArtifactViewCard key={a.id} artifact={a} onOpen={selectArtifact} onFav={toggleFavorite} onDelete={deleteArtifact} />
      ))}
    </div>
  );

  const recoGrid = (templates: RecommendedTemplate[]): ReactNode => (
    <div className="af-reco-grid" data-testid="recommended-grid">
      {templates.map((t) => (
        <ArtifactRecoCard key={t.id} template={t} icon={categoryIcon(t.categoryId)} onRun={run} disabled={generating} />
      ))}
    </div>
  );

  /** Empty personal tab: an empty hero + the "为你推荐" strip. */
  const emptyState = (kind: 'mine' | 'fav'): ReactNode => {
    const cfg =
      kind === 'fav'
        ? { icon: 'star' as IconName, title: '还没有收藏的数据视图', desc: '在「你创建的」里点 ☆ 收藏常看的视图，方便随时回来。' }
        : { icon: 'grid' as IconName, title: '还没有你创建的数据视图', desc: '在对话里对 NanoBee 说「只看 AI 相关的 Hacker News」，或从下面一键创建。' };
    const Icon = Icons[cfg.icon];
    return (
      <div className="af-empty-wrap">
        <div className="af-empty" data-testid={kind === 'fav' ? 'favorites-empty' : 'mine-empty'}>
          <div className="af-empty-ic"><Icon size={26} /></div>
          <h2>{cfg.title}</h2>
          <p>{cfg.desc}</p>
        </div>
        <div className="af-reco-head"><span className="af-reco-eyebrow">为你推荐 · 热门数据视图</span></div>
        {recoGrid(recommendedForYou())}
      </div>
    );
  };

  let body: ReactNode;
  if (isCategory) {
    body = (
      <div className="af-cat-wrap">
        <div className="af-reco-head">
          <span className="af-reco-eyebrow">{categoryLabel(tab)} · 推荐数据视图</span>
          <span className="af-reco-note">点击一键创建，AI 自动拉取并整理</span>
        </div>
        {recoGrid(templatesForCategory(tab))}
      </div>
    );
  } else if (tab === 'favorites') {
    const favs = artifacts.filter((a) => a.favorited);
    body = favs.length ? ownedGrid(favs) : emptyState('fav');
  } else {
    body = artifacts.length ? ownedGrid(artifacts) : emptyState('mine');
  }

  return <div data-testid="artifacts-gallery">{body}</div>;
}
