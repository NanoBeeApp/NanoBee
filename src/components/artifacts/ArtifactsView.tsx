// Artifacts page — collects every card deck the AI generated from chat. Each
// artifact is one dynamically generated dataset (today: a word deck). The page
// is a master/detail: a list of artifacts on the left, the selected deck
// rendered on the right via the shared CardDeckRenderer. Display-only for now.
//
// Artifacts are created in chat (the create_card_artifact agent tool); this
// page never generates — it only lists and renders what chat produced.
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { CardDeckRenderer } from '../cards/CardDeckRenderer';

/** Map a card kind to a short human label for the list badge. */
const KIND_LABEL: Record<string, string> = { word: '单词' };

export function ArtifactsView() {
  const artifacts = useAppStore((s) => s.artifacts);
  const selectedId = useAppStore((s) => s.selectedArtifactId);
  const loading = useAppStore((s) => s.artifactsLoading);
  const loadArtifacts = useAppStore((s) => s.loadArtifacts);
  const selectArtifact = useAppStore((s) => s.selectArtifact);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);

  // Refresh on first open so a just-generated artifact is present.
  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  const selected = artifacts.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="nb-artifacts" data-testid="artifacts-view">
      {/* Left: artifact list */}
      <aside className="nb-arti-list" data-testid="artifact-list">
        <div className="nb-arti-list-head">
          <h1 className="nb-arti-title">Artifacts</h1>
          <span className="nb-arti-count">{artifacts.length}</span>
        </div>
        <p className="nb-arti-hint">在对话里让 AI 生成的卡片数据都收集在这里</p>

        {artifacts.length === 0 && !loading && (
          <div className="nb-arti-empty-list" data-testid="artifact-list-empty">
            还没有生成卡片
          </div>
        )}

        <div className="nb-arti-items">
          {artifacts.map((a) => (
            <button
              key={a.id}
              className={`nb-arti-item${a.id === selectedId ? ' active' : ''}`}
              onClick={() => selectArtifact(a.id)}
              data-testid={`artifact-item-${a.id}`}>
              <span className="nb-arti-item-icon"><Icons.grid size={15} /></span>
              <span className="nb-arti-item-main">
                <span className="nb-arti-item-title">{a.title}</span>
                <span className="nb-arti-item-meta">
                  {KIND_LABEL[a.kind] ?? a.kind} · {a.cardCount} 张
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Right: selected deck */}
      <section className="nb-arti-detail" data-testid="artifact-detail">
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
            <p className="nb-arti-empty-sub">生成的卡片会出现在这里</p>
          </div>
        )}
      </section>
    </div>
  );
}
