// ArtifactsTabs.tsx — top tab bar for the Artifacts (数据视图) page: the two
// personal tabs (你创建的 / 你收藏的) followed by the browse categories
// (科技 / 开发者 / 财经 …). Pure render — the active tab + change handler come
// from the parent (ArtifactsView via useArtifactsUrlSync); the value is the URL
// `tab` param. Restyled to the design's af- tab chrome.
import { ARTIFACT_CATEGORIES } from '../../artifacts/recommended';
import { Icons } from '../../icons/icons';

/** The two fixed personal tabs that precede the categories. */
const PERSONAL_TABS = [
  { id: 'mine', label: '你创建的' },
  { id: 'favorites', label: '你收藏的' },
] as const;

interface Props {
  activeTab: string;
  onSelect: (tab: string) => void;
}

export function ArtifactsTabs({ activeTab, onSelect }: Props) {
  return (
    <div className="af-tabs" data-testid="artifacts-tabs" role="tablist">
      {PERSONAL_TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeTab === t.id}
          className={`af-tab${activeTab === t.id ? ' active' : ''}`}
          onClick={() => onSelect(t.id)}
          data-testid={`artifacts-tab-${t.id}`}
        >
          {t.label}
        </button>
      ))}

      {/* A whitespace gap (no hard rule) separates personal from browse tabs. */}
      <span className="af-tab-gap" aria-hidden="true" />

      {ARTIFACT_CATEGORIES.map((c) => {
        const Icon = Icons[c.icon] ?? Icons.spark;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={activeTab === c.id}
            className={`af-tab af-tab-cat${activeTab === c.id ? ' active' : ''}`}
            onClick={() => onSelect(c.id)}
            data-testid={`artifacts-tab-${c.id}`}
          >
            <Icon size={13} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
