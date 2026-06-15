// Inline chat reference to a generated artifact. Rendered under an AI reply
// when the agent created one or more card decks while answering. Clicking it
// opens the Artifacts page focused on that artifact (the deck is rendered
// there, not inline, to keep the chat stream light).
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import type { ArtifactRef } from '../../artifacts/types';
import { pipelineStatusLabel } from '../../artifacts/format';

interface Props {
  refs: ArtifactRef[];
}

/** The meta line under a ref title, by kind. */
function refMeta(r: ArtifactRef): string {
  if (r.kind === 'data_view') {
    const status = r.pipelineStatus === 'ready' ? `${r.itemCount} 条` : pipelineStatusLabel(r.pipelineStatus);
    return `数据视图 · ${status} · 点击查看`;
  }
  return `单词卡片 · ${r.cardCount} 张 · 点击查看`;
}

export function ArtifactRefCard({ refs }: Props) {
  const openArtifacts = useAppStore((s) => s.openArtifacts);

  return (
    <div className="nb-artiref-list" data-testid="message-artifact-refs">
      {refs.map((r) => (
        <button
          key={r.id}
          className="nb-artiref"
          onClick={() => openArtifacts(r.id)}
          data-testid={`message-artifact-ref-${r.id}`}>
          <span className="nb-artiref-icon"><Icons.feed size={16} /></span>
          <span className="nb-artiref-main">
            <span className="nb-artiref-title">{r.title}</span>
            <span className="nb-artiref-meta">{refMeta(r)}</span>
          </span>
          <Icons.arrowRight size={15} />
        </button>
      ))}
    </div>
  );
}
