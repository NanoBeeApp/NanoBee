// Artifacts page — renders the card deck the AI generated from chat. The deck
// list now lives in the left sidebar (ArtifactsNavList), so this page is
// detail-only and fills the whole center surface: a row of quick-launch
// shortcuts on top, then the selected deck via the shared CardDeckRenderer (or
// an empty-state nudge when nothing is selected).
//
// Decks are created in chat (the create_card_artifact agent tool); the quick
// shortcuts run the same pipeline with a canned prompt, so this page can kick
// off a generation but never owns generation logic itself.
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { CardDeckRenderer } from '../cards/CardDeckRenderer';
import { ArtifactShortcuts } from './ArtifactShortcuts';

export function ArtifactsView() {
  const artifacts = useAppStore((s) => s.artifacts);
  const selectedId = useAppStore((s) => s.selectedArtifactId);
  const generating = useAppStore((s) => s.artifactGenerating);
  const loadArtifacts = useAppStore((s) => s.loadArtifacts);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);

  // Refresh on first open so a just-generated artifact is present.
  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  const selected = artifacts.find((a) => a.id === selectedId) ?? null;

  return (
    <section className="nb-arti-detail" data-testid="artifacts-view">
      <div className="nb-arti-detail-scroll">
        <ArtifactShortcuts />

        {generating && (
          <div className="nb-arti-generating" data-testid="artifact-generating">
            <Icons.spark size={16} />
            <span>AI 正在生成卡片…</span>
          </div>
        )}

        {selected ? (
          <>
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
          </>
        ) : (
          !generating && (
            <div className="nb-arti-empty" data-testid="artifact-detail-empty">
              <Icons.grid size={30} />
              <p>点上方「快捷生成」一键出卡片</p>
              <p className="nb-arti-empty-sub">也可以在对话里对 AI 说「每天教我 10 个单词」</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
