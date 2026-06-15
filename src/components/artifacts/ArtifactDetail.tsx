// Detail surface for one open artifact. Branches on kind:
//   - data_view → DataViewDetail (the core: AI overview + multi-view item stream)
//   - word      → the legacy CardDeckRenderer (kept so old decks still open)
// Shown by ArtifactsView when an artifact is selected (URL `?artifact=…`); the
// tabs are hidden so the content gets the full surface.
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import type { Artifact } from '../../artifacts/types';
import { CardDeckRenderer } from '../cards/CardDeckRenderer';
import { DataViewDetail } from './DataViewDetail';

interface Props {
  artifact: Artifact;
}

export function ArtifactDetail({ artifact }: Props) {
  const selectArtifact = useAppStore((s) => s.selectArtifact);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const back = () => selectArtifact(null);

  // The core path: a chat-generated data view.
  if (artifact.kind === 'data_view') {
    return <DataViewDetail artifact={artifact} onBack={back} />;
  }

  // Legacy word deck.
  return (
    <div className="nb-arti-detail-scroll" data-testid="artifact-detail">
      <button className="nb-arti-back" onClick={back} data-testid="artifact-back">
        <Icons.chevR size={15} style={{ transform: 'rotate(180deg)' }} /> 返回
      </button>

      <div className="nb-arti-detail-head">
        <div>
          <h2 className="nb-deck-title">{artifact.deck.title}</h2>
          {artifact.deck.subtitle && (
            <p className="nb-deck-subtitle">{artifact.deck.subtitle}</p>
          )}
        </div>
        <div className="nb-arti-detail-actions">
          <button
            className={`nb-arti-card-fav${artifact.favorited ? ' on' : ''}`}
            onClick={() => toggleFavorite(artifact.id)}
            title={artifact.favorited ? '取消收藏' : '收藏'}
            data-testid="artifact-detail-favorite">
            <Icons.star size={16} />
          </button>
          <button
            className="nb-arti-delete"
            onClick={() => { deleteArtifact(artifact.id); back(); }}
            title="删除此卡片"
            data-testid="artifact-delete-button">
            <Icons.x size={15} />
          </button>
        </div>
      </div>

      <CardDeckRenderer deck={artifact.deck} />
    </div>
  );
}
