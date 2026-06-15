// Artifacts page — a tabbed browse gallery for the decks the AI generates from
// chat. The top tab bar has two personal tabs (你创建的 / 你收藏的) plus the
// browse categories (金融 / 科技 / 开发者 …); a new user lands on 你创建的, which
// is empty, so the gallery shows a "为你推荐 · 热门项目" strip underneath.
//
// This component is the orchestrator only: it owns the URL↔store sync (tab +
// open deck) and switches between the tabbed gallery and a single deck's detail.
// The pieces — ArtifactsTabs / ArtifactGallery / ArtifactDetail — are separate.
// Decks are created in chat (the create_card_artifact agent tool) or by clicking
// a recommended template; this page kicks off generation but never owns it.
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useArtifactsUrlSync } from './useArtifactsUrlSync';
import { ArtifactsTabs } from './ArtifactsTabs';
import { ArtifactGallery } from './ArtifactGallery';
import { ArtifactDetail } from './ArtifactDetail';

export function ArtifactsView() {
  const { tab, setTab, viewMode, setViewMode } = useArtifactsUrlSync();
  const artifacts = useAppStore((s) => s.artifacts);
  const selectedId = useAppStore((s) => s.selectedArtifactId);
  const loadArtifacts = useAppStore((s) => s.loadArtifacts);

  // Refresh on first open so a just-generated artifact is present.
  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  const selected = artifacts.find((a) => a.id === selectedId) ?? null;

  return (
    <section className="nb-arti-page" data-testid="artifacts-view">
      {selected ? (
        <ArtifactDetail artifact={selected} />
      ) : (
        <>
          <ArtifactsTabs activeTab={tab} onSelect={setTab} />
          <ArtifactGallery tab={tab} viewMode={viewMode} onViewModeChange={setViewMode} />
        </>
      )}
    </section>
  );
}
