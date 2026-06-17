// ArtifactViewCard.tsx — one owned card in the gallery grid ("你创建的" /
// "你收藏的"). Renders a data view (source badge + filter口径 + item count /
// pipeline status) or a legacy word deck (card count). The whole card opens the
// detail; the star toggles favorite and the × deletes (both stop propagation).
import type { Artifact } from '../../artifacts/types';
import { Icons } from '../../icons/icons';
import { afSource, relTime } from './afMeta';
import { AFSourceBadge } from './AFCards';

interface Props {
  artifact: Artifact;
  onOpen: (id: string) => void;
  onFav: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Map a data view's pipeline stage to the in-card status chip. */
function statusChip(a: Artifact) {
  if (a.kind !== 'data_view') return null;
  const s = a.pipelineStatus;
  if (s === 'pending' || s === 'fetching') {
    return <span className="af-statchip building"><span className="af-spin" />创建中</span>;
  }
  if (s === 'filtering' || s === 'extracting' || s === 'templating') {
    return <span className="af-statchip refreshing"><span className="af-spin" />整理中</span>;
  }
  if (s === 'error') {
    return <span className="af-statchip error"><Icons.x size={11} />出错</span>;
  }
  return null;
}

export function ArtifactViewCard({ artifact, onOpen, onFav, onDelete }: Props) {
  const isDataView = artifact.kind === 'data_view';
  const source = isDataView ? artifact.source : 'webpage';
  const s = afSource(source);
  const Icon = isDataView ? Icons[s.icon] ?? Icons.grid : Icons.book;
  const building = isDataView && (artifact.pipelineStatus === 'pending' || artifact.pipelineStatus === 'fetching');
  const chip = statusChip(artifact);

  const filter = isDataView
    ? artifact.query?.filter?.topic || artifact.query?.title || '全部'
    : '单词卡片';
  const meta = isDataView
    ? `${artifact.itemCount} 条${artifact.lastFetchedAt ? ` · ${relTime(artifact.lastFetchedAt)}` : ''}`
    : `${artifact.cardCount} 张`;

  return (
    <button
      className="af-vcard"
      onClick={() => onOpen(artifact.id)}
      disabled={building}
      data-testid={`artifact-card-${artifact.id}`}
    >
      <div className="af-vcard-top">
        <span className="af-vcard-ic" style={{ background: s.soft, color: s.color }}>
          <Icon size={18} />
        </span>
        <span className="af-vcard-stars" onClick={(e) => { e.stopPropagation(); onFav(artifact.id); }}>
          <span
            className={'af-star' + (artifact.favorited ? ' on' : '')}
            title={artifact.favorited ? '取消收藏' : '收藏'}
            data-testid={`artifact-favorite-${artifact.id}`}
          >
            <Icons.star size={15} />
          </span>
        </span>
        <span
          className="af-vcard-del"
          onClick={(e) => { e.stopPropagation(); onDelete(artifact.id); }}
          title="删除"
          data-testid={`artifact-card-delete-${artifact.id}`}
        >
          <Icons.x size={14} />
        </span>
      </div>
      <div className="af-vcard-title">{artifact.title}</div>
      <div className="af-vcard-filter">{filter}</div>
      <div className="af-vcard-foot">
        {isDataView ? <AFSourceBadge source={source} /> : <span className="af-srcbadge" style={{ background: s.soft, color: s.color }}><Icons.book size={12} />单词</span>}
        {chip ?? <span className="af-vcard-meta">{meta}</span>}
      </div>
    </button>
  );
}
