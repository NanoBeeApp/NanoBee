// One owned-artifact row for the list view (你创建的 / 你收藏的). A flat,
// Twitter-feed-style row — no card border, separated by a hairline and a hover
// tint, not a box. Clicking the row opens the deck; the trailing buttons
// favorite or delete without opening. Pure render.
import type { Artifact } from '../../artifacts/types';
import { artifactMeta, pipelineStatusLabel } from '../../artifacts/format';
import { Icons } from '../../icons/icons';

interface Props {
  artifact: Artifact;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ArtifactRow({ artifact, onOpen, onToggleFavorite, onDelete }: Props) {
  return (
    <div
      className="nb-arti-row"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(artifact.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(artifact.id);
        }
      }}
      data-testid={`artifact-row-${artifact.id}`}>
      <span className="nb-arti-row-ic"><Icons.grid size={16} /></span>
      <span className="nb-arti-row-title">{artifact.title}</span>
      <span className="nb-arti-row-meta">{artifactMeta(artifact)}</span>
      {artifact.kind === 'data_view' && artifact.pipelineStatus !== 'ready' && (
        <span className={`nb-dv-pill nb-dv-pill-${artifact.pipelineStatus}`}>
          {pipelineStatusLabel(artifact.pipelineStatus)}
        </span>
      )}
      <div className="nb-arti-row-actions">
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
