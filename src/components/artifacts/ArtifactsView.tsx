// Artifacts page — renders the card deck the AI generated from chat. The deck
// list now lives in the left sidebar (ArtifactsNavList), so this page is
// detail-only and fills the whole center surface: the selected deck via the
// shared CardDeckRenderer, or an empty-state nudge when nothing is selected.
//
// Artifacts are created in chat (the create_card_artifact agent tool); this
// page never generates — it only renders what chat produced.
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { CardDeckRenderer } from '../cards/CardDeckRenderer';

export function ArtifactsView() {
  const artifacts = useAppStore((s) => s.artifacts);
  const selectedId = useAppStore((s) => s.selectedArtifactId);
  const loadArtifacts = useAppStore((s) => s.loadArtifacts);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);

  // Refresh on first open so a just-generated artifact is present.
  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  const selected = artifacts.find((a) => a.id === selectedId) ?? null;

  return (
    <section className="nb-arti-detail" data-testid="artifacts-view">
      {selected ? (
        <div className="nb-arti-detail-scroll">
          <div className="nb-arti-detail-head">
            <div>
              <h2 className="nb-deck-title">{selected.deck.title}</h2>
              {selected.deck.subtitle && (
                <p className="nb-deck-subtitle">{selected.deck.subtitle}</p>
              )}
            </div>
            <button
              className="nb-arti-delete"
              onClick={() => deleteArtifact(selected.id)}
              title="删除此卡片"
              data-testid="artifact-delete-button">
              <Icons.x size={15} />
            </button>
          </div>
          <CardDeckRenderer deck={selected.deck} />
        </div>
      ) : (
        <div className="nb-arti-empty" data-testid="artifact-detail-empty">
          <Icons.grid size={30} />
          <p>在对话中对 AI 说「每天教我 10 个单词」试试</p>
          <p className="nb-arti-empty-sub">生成的卡片会出现在这里，可在左侧边栏切换</p>
        </div>
      )}
    </section>
  );
}
