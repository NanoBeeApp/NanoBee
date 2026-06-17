// ArtifactsView.tsx — the Artifacts (数据视图) page, rebuilt to the NanoBee
// design. The orchestrator only: it owns the URL↔store sync (active tab + open
// artifact + the detail's card/list view mode) and switches between the tabbed
// card gallery and a single artifact's detail. The pieces — ArtifactsTabs /
// ArtifactGallery / DataViewDetail (data views) / ArtifactDetail (legacy word
// decks) — are separate. Data views are created in chat (the create_data_view
// agent tool) or by clicking a recommended template; this page kicks off
// generation (新建 / 一键创建) but never owns it.
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { useArtifactsUrlSync } from './useArtifactsUrlSync';
import { ArtifactsTabs } from './ArtifactsTabs';
import { ArtifactGallery } from './ArtifactGallery';
import { DataViewDetail } from './DataViewDetail';
import { ArtifactDetail } from './ArtifactDetail';
import '../../styles/artifacts.css';

export function ArtifactsView() {
  const { tab, setTab, viewMode, setViewMode } = useArtifactsUrlSync();
  const artifacts = useAppStore((s) => s.artifacts);
  const selectedId = useAppStore((s) => s.selectedArtifactId);
  const selectArtifact = useAppStore((s) => s.selectArtifact);
  const loadArtifacts = useAppStore((s) => s.loadArtifacts);
  const generating = useAppStore((s) => s.artifactGenerating);
  const newArtifact = useAppStore((s) => s.newArtifact);

  // Refresh on first open so a just-generated artifact is present.
  useEffect(() => { void loadArtifacts(); }, [loadArtifacts]);

  const selected = artifacts.find((a) => a.id === selectedId) ?? null;

  return (
    <section className="af" data-testid="artifacts-view">
      {generating && (
        <div className="af-banner" data-testid="artifact-generating">
          <span className="af-spin" /> 正在创建数据视图 · 已在对话中生成视图卡片，后台拉取中…
        </div>
      )}

      {selected ? (
        <div className="af-scroll">
          {selected.kind === 'data_view' ? (
            <DataViewDetail
              artifact={selected}
              onBack={() => selectArtifact(null)}
              vm={viewMode}
              setVm={setViewMode}
            />
          ) : (
            <ArtifactDetail artifact={selected} />
          )}
        </div>
      ) : (
        <>
          <div className="af-top">
            <div className="af-top-row">
              <h1 className="af-h1">数据视图</h1>
              <button className="af-newbtn" onClick={newArtifact} disabled={generating} data-testid="artifact-new">
                <Icons.plus size={15} /> 新建数据视图 <span className="kbd-hint">⌘N</span>
              </button>
            </div>
            <ArtifactsTabs activeTab={tab} onSelect={setTab} />
          </div>
          <div className="af-scroll">
            <ArtifactGallery tab={tab} />
          </div>
        </>
      )}
    </section>
  );
}
