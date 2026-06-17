// Detail surface for a legacy word-deck artifact (English vocabulary): the deck
// title/subtitle, favorite + delete actions, and the CardDeckRenderer. Kept so
// old decks still open. Data views are the core path and are routed straight to
// DataViewDetail by ArtifactsView; this component only handles the `word` kind.
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import type { WordDeckArtifact } from '../../artifacts/types';
import { CardDeckRenderer } from '../cards/CardDeckRenderer';

interface Props {
  artifact: WordDeckArtifact;
}

export function ArtifactDetail({ artifact }: Props) {
  const selectArtifact = useAppStore((s) => s.selectArtifact);
  const deleteArtifact = useAppStore((s) => s.deleteArtifact);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const back = () => selectArtifact(null);

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
