// Sidebar list for the Artifacts page: every card deck the AI generated from
// chat. Clicking one selects the deck shown on the (now full-width) detail
// surface. This is the page's master list — the Artifacts view itself is
// detail-only, so the sidebar is the single place the decks are listed.
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';

/** Map a card kind to a short human label for the list meta line. */
const KIND_LABEL: Record<string, string> = { word: '单词' };

export function ArtifactsNavList() {
  const artifacts = useAppStore((s) => s.artifacts);
  const selectedId = useAppStore((s) => s.selectedArtifactId);
  const loading = useAppStore((s) => s.artifactsLoading);
  const selectArtifact = useAppStore((s) => s.selectArtifact);

  if (artifacts.length === 0) {
    return (
      <div className="nb-side-empty" data-testid="sidebar-artifacts-empty">
        {loading ? '加载中…' : '还没有生成卡片'}
      </div>
    );
  }

  return (
    <div data-testid="sidebar-artifacts-list">
      <div className="nb-grp">卡片 · {artifacts.length}</div>
      {artifacts.map((a) => (
        <div key={a.id} className={`nb-item${a.id === selectedId ? ' active' : ''}`}
          onClick={() => selectArtifact(a.id)} data-testid={`artifacts-nav-item-${a.id}`}>
          <span className="nb-item-ic" style={{ color: 'var(--brand-2)' }}><Icons.grid size={15} /></span>
          <div className="meta">
            <div className="title">{a.title}</div>
            <div className="sub">{(KIND_LABEL[a.kind] ?? a.kind)} · {a.cardCount} 张</div>
          </div>
        </div>
      ))}
    </div>
  );
}
