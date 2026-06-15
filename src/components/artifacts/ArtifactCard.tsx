// One owned-artifact tile in the gallery grid (你创建的 / 你收藏的). Clicking the
// body opens the deck detail; the corner buttons favorite or delete it without
// opening. Pure render — all actions are passed in from the gallery.
import type { Artifact } from '../../artifacts/types';
import { artifactMeta, pipelineStatusLabel } from '../../artifacts/format';
import { Icons } from '../../icons/icons';

interface Props {
  artifact: Artifact;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ArtifactCard({ artifact, onOpen, onToggleFavorite, onDelete }: Props) {
  const meta = artifactMeta(artifact);
  return (
    <div
      className="nb-arti-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(artifact.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(artifact.id);
        }
      }}
      data-testid={`artifact-card-${artifact.id}`}>
      <span className="nb-arti-card-ic"><Icons.grid size={18} /></span>
      <div className="nb-arti-card-main">
        <div className="nb-arti-card-title">{artifact.title}</div>
        <div className="nb-arti-card-meta">
          {meta}
          {artifact.kind === 'data_view' && artifact.pipelineStatus !== 'ready' && (
            <span className={`nb-dv-pill nb-dv-pill-${artifact.pipelineStatus}`}>
              {pipelineStatusLabel(artifact.pipelineStatus)}
            </span>
          )}
        </div>
      </div>

      <div className="nb-arti-card-actions">
        <button
          className={`nb-arti-card-fav${artifact.favorited ? ' on' : ''}`}
          title={artifact.favorited ? '取消收藏' : '收藏'}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(artifact.id); }}
          data-testid={`artifact-favorite-${artifact.id}`}>
          <Icons.star size={15} />
        </button>
        <button
          className="nb-arti-card-del"
          title="删除"
          onClick={(e) => { e.stopPropagation(); onDelete(artifact.id); }}
          data-testid={`artifact-card-delete-${artifact.id}`}>
          <Icons.x size={14} />
        </button>
      </div>
    </div>
  );
}
