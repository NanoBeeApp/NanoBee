// Inline chat reference to a generated artifact. Rendered under an AI reply
// when the agent created one or more card decks while answering. Clicking it
// opens the Artifacts page focused on that artifact (the deck is rendered
// there, not inline, to keep the chat stream light).
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import type { ArtifactRef } from '../../artifacts/types';

const KIND_LABEL: Record<string, string> = { word: '单词卡片' };

interface Props {
  refs: ArtifactRef[];
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
          <span className="nb-artiref-icon"><Icons.grid size={16} /></span>
          <span className="nb-artiref-main">
            <span className="nb-artiref-title">{r.title}</span>
            <span className="nb-artiref-meta">
              {KIND_LABEL[r.kind] ?? r.kind} · {r.cardCount} 张 · 点击查看
            </span>
          </span>
          <Icons.arrowRight size={15} />
        </button>
      ))}
    </div>
  );
}
